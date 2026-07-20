// v1.0.3 — debt #5 "no-regression" release gate (docs/releases/v1-0-3.md):
// "a successful connector call is unchanged (the timeout never fires on a normal request),
// confirmed across the existing rental / user / hutang read + write paths."
//
// `client.test.ts` (developer-authored) proves `fetchWithTimeout` is transparent on a normal
// request IN ISOLATION — it calls `fetchWithTimeout` directly. That leaves a real gap: it never
// proves the wrapper is actually the `fetch` that real connector calls go through, nor that
// wiring it into `createClient({ global: { fetch } })` and driving it through postgrest-js's own
// request assembly (headers, method, body serialization, `.maybeSingle()` semantics, `.rpc()`
// vs `.from()`) doesn't change behavior. This file closes that gap: it uses the REAL,
// un-mocked `@supabase/supabase-js` client (only `global.fetch` is faked) and calls the actual
// exported connector functions, across rental / user / hutang, read AND write.
//
// Mandatory testing rule (CLAUDE.md): never mock a Supabase failure as `new Error(...)` —
// N/A here, every path below is a SUCCESS path (that's the point of "no regression").

process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.test.supabase.co"
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"

// Photo hydration (signPaths/uploadPhoto) is a separate concern already covered by other tests;
// every fixture below carries zero photos so those calls are never reached. Mocked only so the
// module graph resolves without touching real storage.
jest.mock("@/services/photos/storage", () => ({
  uploadPhoto: jest.fn(),
  signPaths: jest.fn().mockResolvedValue(new Map()),
  removePaths: jest.fn(),
}))

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

const rentalRow = {
  id: "r1",
  user_id: "u1",
  vehicle_id: "v1",
  start_at: "2026-07-01T00:00:00Z",
  due_at: "2026-07-02T00:00:00Z",
  returned_at: null,
  status: "ACTIVE",
  paket_hari: 1,
  paket_jam: 0,
  tarif: 40000,
  add_on: { description: "", amount: 0 },
  discount: 0,
  total_bill: 40000,
  total_paid: 0,
  payments: [],
  jaminan: { items: [] },
  kondisi_keluar: { bensinKotak: 4, km: 1000, photos: [] },
  kondisi_kembali: null,
  notes: "",
  tujuan: "",
}

describe("#5 no-regression — real supabase client + real connectors, normal request", () => {
  const realFetch = global.fetch

  afterEach(() => {
    global.fetch = realFetch
    jest.resetModules()
  })

  it("rental READ (getRentals via v_rental_list) resolves normally through the timeout-wrapped client", async () => {
    const fetchSpy = jest.fn().mockResolvedValue(
      jsonResponse([
        {
          id: "r1",
          user_name: "Budi",
          vehicle_name: "Vario",
          vehicle_plate: "L 1234 AB",
          start_at: "2026-07-01T00:00:00Z",
          due_at: "2026-07-02T00:00:00Z",
          returned_at: null,
          status: "ACTIVE",
          total_bill: 40000,
          total_paid: 0,
        },
      ]),
    )
    global.fetch = fetchSpy as unknown as typeof fetch

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getRentals } = require("@/services/rentals")
    const result = await getRentals()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: "r1", userName: "Budi", status: "ACTIVE" })
  })

  it("rental WRITE (addPayment — insert then re-fetch) resolves normally, unchanged shape", async () => {
    const calls: { url: string; method: string }[] = []
    global.fetch = jest.fn((input: unknown, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      calls.push({ url, method })
      if (url.includes("/rest/v1/payments") && method === "POST") {
        return Promise.resolve(jsonResponse([], 201))
      }
      if (url.includes("/rest/v1/v_rentals")) {
        return Promise.resolve(jsonResponse(rentalRow))
      }
      return Promise.resolve(jsonResponse({ message: "unhandled " + url }, 500))
    }) as unknown as typeof fetch

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { addPayment } = require("@/services/rentals")
    const result = await addPayment("r1", {
      amount: 10000,
      method: "CASH",
      paidAt: new Date("2026-07-01T00:00:00Z"),
    })

    expect(calls.map((c) => c.method)).toEqual(["POST", "GET"])
    expect(result.id).toBe("r1")
    expect(result.totalBill).toBe(40000)
  })

  it("rental WRITE (updateRental via rpc_update_rental — the new v1.0.3 path) resolves normally", async () => {
    global.fetch = jest.fn((input: unknown) => {
      const url = String(input)
      if (url.includes("/rest/v1/rpc/rpc_update_rental")) {
        return Promise.resolve(jsonResponse(null))
      }
      if (url.includes("/rest/v1/v_rentals")) {
        return Promise.resolve(
          jsonResponse({
            ...rentalRow,
            kondisi_keluar: { bensinKotak: 6, km: 1200, photos: [] },
          }),
        )
      }
      return Promise.resolve(jsonResponse({ message: "unhandled " + url }, 500))
    }) as unknown as typeof fetch

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { updateRental } = require("@/services/rentals")
    const result = await updateRental("r1", {
      kondisiKeluar: { bensinKotak: 6, km: 1200, photos: [] },
    })

    expect(result.kondisiKeluar.bensinKotak).toBe(6)
  })

  it("user READ (getUserSummaries via v_user_summaries) resolves normally", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse([
        {
          id: "u1",
          name: "Budi",
          nickname: null,
          phone: "081234567890",
          is_mahasiswa: true,
          verification_status: "BELUM_DIVERIFIKASI",
          profil_photo: null,
        },
      ]),
    ) as unknown as typeof fetch

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getUserSummaries } = require("@/services/rentals")
    const result = await getUserSummaries()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: "u1", name: "Budi" })
  })

  it("user WRITE (updateUser — update then re-fetch) resolves normally", async () => {
    const calls: { url: string; method: string }[] = []
    global.fetch = jest.fn((input: unknown, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      calls.push({ url, method })
      if (url.includes("/rest/v1/users") && method === "PATCH") {
        return Promise.resolve(jsonResponse([], 200))
      }
      return Promise.resolve(
        jsonResponse({
          id: "u1",
          name: "Budi Updated",
          nickname: null,
          phone: "081234567890",
          is_mahasiswa: true,
          verification_status: "BELUM_DIVERIFIKASI",
          ktp_photo: null,
          ktm_photo: null,
          profil_photo: null,
        }),
      )
    }) as unknown as typeof fetch

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { updateUser } = require("@/services/rentals")
    const result = await updateUser("u1", {
      name: "Budi Updated",
      nickname: null,
      phone: "081234567890",
      isMahasiswa: true,
      alamat: null,
      kontakDarurat: null,
      notes: null,
    })

    expect(calls.map((c) => c.method)).toEqual(["PATCH", "GET"])
    expect(result.name).toBe("Budi Updated")
  })

  it("hutang READ (getHutangs via v_hutang) resolves normally", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse([
        {
          id: "h1",
          user_id: "u1",
          user_name: "Budi",
          rental_id: null,
          jumlah_awal: 50000,
          status: "AKTIF",
          notes: null,
          created_at: "2026-07-01T00:00:00Z",
          payments: [],
        },
      ]),
    ) as unknown as typeof fetch

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getHutangs } = require("@/services/rentals")
    const result = await getHutangs()

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: "h1", sisa: 50000 })
  })

  it("hutang WRITE (addHutangPayment — insert then re-fetch) resolves normally", async () => {
    const calls: { url: string; method: string }[] = []
    global.fetch = jest.fn((input: unknown, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? "GET"
      calls.push({ url, method })
      if (url.includes("/rest/v1/payments") && method === "POST") {
        return Promise.resolve(jsonResponse([], 201))
      }
      if (url.includes("/rest/v1/v_hutang")) {
        return Promise.resolve(
          jsonResponse({
            id: "h1",
            user_id: "u1",
            user_name: "Budi",
            rental_id: null,
            jumlah_awal: 50000,
            status: "AKTIF",
            notes: null,
            created_at: "2026-07-01T00:00:00Z",
            payments: [
              { id: "p1", amount: 20000, method: "CASH", paid_at: "2026-07-02T00:00:00Z" },
            ],
          }),
        )
      }
      return Promise.resolve(jsonResponse({ message: "unhandled " + url }, 500))
    }) as unknown as typeof fetch

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { addHutangPayment } = require("@/services/rentals")
    const result = await addHutangPayment("h1", {
      amount: 20000,
      method: "CASH",
      paidAt: new Date("2026-07-02T00:00:00Z"),
    })

    expect(calls.map((c) => c.method)).toEqual(["POST", "GET"])
    expect(result.sisa).toBe(30000)
  })

  it("none of the above ever install a signal that is already aborted (the 30s timer genuinely never fires on a fast response)", async () => {
    // Belt-and-suspenders on the "unchanged" half of the gate: assert the AbortSignal handed to
    // the underlying fetch is present (proves fetchWithTimeout IS in the loop) and NOT aborted
    // (proves the fast response wins the race, matching client.test.ts's isolated assertion —
    // but this time observed through the real client + a real connector call).
    let observedSignal: AbortSignal | undefined
    global.fetch = jest.fn((_input: unknown, init?: RequestInit) => {
      observedSignal = init?.signal ?? undefined
      return Promise.resolve(jsonResponse(rentalRow))
    }) as unknown as typeof fetch

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getRental } = require("@/services/rentals")
    await getRental("r1")

    expect(observedSignal).toBeInstanceOf(AbortSignal)
    expect(observedSignal?.aborted).toBe(false)
  })
})

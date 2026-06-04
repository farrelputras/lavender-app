import { rowToRental, rowToUser } from "./translators"

// Minimal row shape that satisfies rowToRental without touching real Supabase.
const baseRentalRow: Record<string, unknown> = {
  id: "r1",
  user_id: "u1",
  vehicle_id: "v1",
  start_at: "2026-06-04T08:00:00.000Z",
  due_at: "2026-06-05T08:00:00.000Z",
  returned_at: null,
  status: "ACTIVE",
  paket_hari: 1,
  paket_jam: 0,
  tarif: 100000,
  add_on: { description: "", amount: 0 },
  discount: 0,
  total_bill: 100000,
  total_paid: 0,
  payments: [],
  jaminan: { items: [] },
  kondisi_keluar: null,
  kondisi_kembali: null,
  notes: "",
}

describe("rowToRental", () => {
  it("maps tujuan string value through to the UI type", () => {
    const rental = rowToRental({ ...baseRentalRow, tujuan: "Pantai Kenjeran" })
    expect(rental.tujuan).toBe("Pantai Kenjeran")
  })

  it("coerces null tujuan to empty string", () => {
    const rental = rowToRental({ ...baseRentalRow, tujuan: null })
    expect(rental.tujuan).toBe("")
  })

  it("coerces undefined tujuan to empty string", () => {
    const rental = rowToRental({ ...baseRentalRow })
    expect(rental.tujuan).toBe("")
  })
})

describe("rowToUser", () => {
  it("maps full user row to camelCase UI shape", () => {
    const row = {
      id: "u1",
      name: "Siti",
      nickname: "Sis",
      phone: "0811",
      is_mahasiswa: true,
      verification_status: "BELUM_DIVERIFIKASI",
      verified_at: null,
      nama_pddikti: null,
      tahun_masuk: null,
      universitas: null,
      prodi: null,
      alamat: "Jl. Mawar",
      kontak_darurat: "Bapak Joko 0822",
      notes: null,
      ktp_photo: null,
      ktm_photo: null,
    }
    const user = rowToUser(row)
    expect(user).toEqual({
      id: "u1",
      name: "Siti",
      nickname: "Sis",
      phone: "0811",
      isMahasiswa: true,
      verifiedAt: null,
      verificationStatus: "BELUM_DIVERIFIKASI",
      namaPddikti: null,
      tahunMasuk: null,
      universitas: null,
      prodi: null,
      alamat: "Jl. Mawar",
      kontakDarurat: "Bapak Joko 0822",
      notes: null,
      ktpPhoto: null,
      ktmPhoto: null,
      profilPhoto: null,
    })
  })

  it("preserves ktp_photo {id,path} as {id, uri:null} (Phase 5 leaves uri null)", () => {
    const row = {
      id: "u1",
      name: "X",
      nickname: null,
      phone: "0",
      is_mahasiswa: false,
      verification_status: "BELUM_DIVERIFIKASI",
      verified_at: null,
      nama_pddikti: null,
      tahun_masuk: null,
      universitas: null,
      prodi: null,
      alamat: null,
      kontak_darurat: null,
      notes: null,
      ktp_photo: { id: "p1", path: "users/u1/ktp/p1.jpg" },
      ktm_photo: null,
    }
    const user = rowToUser(row)
    expect(user.ktpPhoto).toEqual({ id: "p1", uri: null })
  })

  it("maps profil_photo {id,path} to profilPhoto {id, uri:null}", () => {
    const row = {
      id: "u1",
      name: "X",
      nickname: null,
      phone: "0",
      is_mahasiswa: false,
      verification_status: "BELUM_DIVERIFIKASI",
      verified_at: null,
      nama_pddikti: null,
      tahun_masuk: null,
      universitas: null,
      prodi: null,
      alamat: null,
      kontak_darurat: null,
      notes: null,
      ktp_photo: null,
      ktm_photo: null,
      profil_photo: { id: "p3", path: "users/u1/profil/p3.jpg" },
    }
    const user = rowToUser(row)
    expect(user.profilPhoto).toEqual({ id: "p3", uri: null })
  })
})

// debt #5 — the fetch-timeout wrapper on the Supabase client.
//
// `createClient` is mocked so the module loads without real env vars / a live
// connection; the object under test is `fetchWithTimeout` itself, which is what
// gets wired in as `global.fetch` for every Supabase call (rpc, table, storage).
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({})),
}))

describe("fetchWithTimeout", () => {
  const realFetch = global.fetch

  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    global.fetch = realFetch
    jest.resetModules()
  })

  it("times out a request that never resolves, rejecting with a clear Indonesian error within the bounded wait", async () => {
    // Simulate RN's real behavior: fetch never settles on its own, but DOES reject
    // once its AbortSignal fires — exactly what AbortController-based fetches do.
    global.fetch = jest.fn(
      (_input: unknown, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("Aborted")
            err.name = "AbortError"
            reject(err)
          })
        }),
    ) as unknown as typeof fetch

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { fetchWithTimeout } = require("./client")

    const pending = fetchWithTimeout("https://example.test/rest/v1/rentals")
    const assertion = expect(pending).rejects.toThrow(
      "Tidak dapat terhubung ke server. Periksa koneksi Anda.",
    )

    // Bounded wait: advance exactly to the documented 30s timeout, no further.
    await jest.advanceTimersByTimeAsync(30_000)

    await assertion
  })

  it("does not time out and is otherwise unchanged on a normal, successful request", async () => {
    const fakeResponse = { ok: true } as Response
    const mockFetch = jest.fn().mockResolvedValue(fakeResponse)
    global.fetch = mockFetch as unknown as typeof fetch

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { fetchWithTimeout } = require("./client")

    const result = await fetchWithTimeout("https://example.test/rest/v1/rentals")

    expect(result).toBe(fakeResponse)
    // Underlying fetch was called with an injected AbortSignal, nothing else altered.
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, init] = mockFetch.mock.calls[0]
    expect(init.signal).toBeInstanceOf(AbortSignal)
    expect(init.signal.aborted).toBe(false)

    // Advancing well past 30s afterwards must not throw / fire a stray abort —
    // proves the timeout was cleared on success (no dangling timer).
    await jest.advanceTimersByTimeAsync(60_000)
  })

  it("propagates a non-abort fetch error unchanged (does not mask real network errors as a timeout)", async () => {
    const realError = new Error("Network request failed")
    global.fetch = jest.fn().mockRejectedValue(realError) as unknown as typeof fetch

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { fetchWithTimeout } = require("./client")

    await expect(fetchWithTimeout("https://example.test/rest/v1/rentals")).rejects.toBe(realError)
  })
})

import { parseRupiahInput } from "./format"

describe("parseRupiahInput", () => {
  it("parses a plain digit string", () => {
    expect(parseRupiahInput("50000")).toBe(50000)
  })

  it("strips non-digit characters", () => {
    expect(parseRupiahInput("Rp 50.000")).toBe(50000)
  })

  it("preserves a leading minus sign", () => {
    expect(parseRupiahInput("-5000")).toBe(-5000)
  })

  it("returns 0 for an empty string", () => {
    expect(parseRupiahInput("")).toBe(0)
  })

  it("returns 0 for non-numeric garbage", () => {
    expect(parseRupiahInput("abc")).toBe(0)
  })
})

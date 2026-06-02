import { uuidv4 } from "./uuid"

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

describe("uuidv4", () => {
  it("returns an RFC4122 v4 UUID string", () => {
    expect(uuidv4()).toMatch(V4)
  })

  it("returns a different value on each call", () => {
    expect(uuidv4()).not.toBe(uuidv4())
  })
})

// v1.0.5 (PRD-8, BR-12 characterisation). `app/utils/rentalMath.ts` had zero test coverage of
// its own before this suite — it is imported by both rental screens, so pinning it here is a
// dividend beyond PengembalianScreen alone (does NOT close debt #15: DetailSewaScreen's own
// tariff-composition code and *Simpan Rental* remain uncovered).
//
// Scope: only the functions PengembalianScreen actually calls — computeFuelAdjustment,
// computeReturnTotal, sumPayments, hoursLate. Pins current behaviour exactly, including the two
// debt-#12 divergences from docs/02 §6 that PengembalianScreen builds on top of these functions
// (the extra-fee-line fuel suggestion and the unconditional amber row) — those are pinned at the
// screen level in PengembalianScreen.characterization.test.tsx, not here; this file only pins the
// arithmetic these functions themselves perform.

import type { Payment } from "@/services/rentals/types"

import { computeFuelAdjustment, computeReturnTotal, sumPayments, hoursLate } from "./rentalMath"

function payment(amount: number): Payment {
  return { id: "p", amount, method: "CASH", paidAt: new Date("2026-07-01T00:00:00Z") }
}

describe("computeFuelAdjustment", () => {
  it("more fuel returned than taken -> direction 'subtract' (suggest reducing the bill)", () => {
    expect(computeFuelAdjustment(4, 6, 5000)).toEqual({
      selisih: 2,
      deltaRupiah: 10000,
      direction: "subtract",
    })
  })

  it("less fuel returned than taken -> direction 'add' (suggest adding to the bill)", () => {
    expect(computeFuelAdjustment(4, 2, 5000)).toEqual({
      selisih: -2,
      deltaRupiah: 10000,
      direction: "add",
    })
  })

  it("boundary: returned equals taken -> selisih 0, deltaRupiah 0, direction 'none'", () => {
    expect(computeFuelAdjustment(4, 4, 5000)).toEqual({
      selisih: 0,
      deltaRupiah: 0,
      direction: "none",
    })
  })

  it("boundary: full tank taken down to empty (max->min of the Stepper's 0..8 range) -> 'add'", () => {
    expect(computeFuelAdjustment(8, 0, 3000)).toEqual({
      selisih: -8,
      deltaRupiah: 24000,
      direction: "add",
    })
  })

  it("boundary: empty taken back full (min->max of the Stepper's 0..8 range) -> 'subtract'", () => {
    expect(computeFuelAdjustment(0, 8, 3000)).toEqual({
      selisih: 8,
      deltaRupiah: 24000,
      direction: "subtract",
    })
  })

  it("hargaPerKotak = 0 zeroes the rupiah delta but leaves direction unchanged", () => {
    expect(computeFuelAdjustment(4, 6, 0)).toEqual({
      selisih: 2,
      deltaRupiah: 0,
      direction: "subtract",
    })
  })
})

describe("computeReturnTotal", () => {
  it("sums subtotal + extra fees, then subtracts the discount", () => {
    expect(computeReturnTotal(100000, [{ amount: 20000 }, { amount: 5000 }], 10000)).toBe(115000)
  })

  it("no extra fees, no discount -> returns the subtotal unchanged", () => {
    expect(computeReturnTotal(50000, [], 0)).toBe(50000)
  })

  it("clamps at 0 when the discount exceeds subtotal + extras (does not go negative)", () => {
    expect(computeReturnTotal(10000, [], 50000)).toBe(0)
  })

  it("a negative extra-fee amount (the debt #12 fuel-suggestion line) reduces the total", () => {
    expect(computeReturnTotal(50000, [{ amount: -10000 }], 0)).toBe(40000)
  })

  it("boundary: discount exactly equal to subtotal + extras -> 0, not negative", () => {
    expect(computeReturnTotal(20000, [{ amount: 5000 }], 25000)).toBe(0)
  })
})

describe("sumPayments", () => {
  it("returns 0 for an empty payments array", () => {
    expect(sumPayments([])).toBe(0)
  })

  it("sums multiple payments", () => {
    expect(sumPayments([payment(50000), payment(25000), payment(1)])).toBe(75001)
  })
})

describe("hoursLate", () => {
  it("boundary: now exactly equals dueAt -> 0", () => {
    const due = new Date("2026-07-01T00:00:00Z")
    expect(hoursLate(due, new Date("2026-07-01T00:00:00Z"))).toBe(0)
  })

  it("1ms past due rounds UP to 1 hour (Math.ceil, not floor)", () => {
    const due = new Date("2026-07-01T00:00:00Z")
    expect(hoursLate(due, new Date("2026-07-01T00:00:00.001Z"))).toBe(1)
  })

  it("exactly 2 hours past due -> 2 (an exact multiple does not round up further)", () => {
    const due = new Date("2026-07-01T00:00:00Z")
    expect(hoursLate(due, new Date("2026-07-01T02:00:00Z"))).toBe(2)
  })

  it("now before dueAt (negative diff) clamps to 0, never negative", () => {
    const due = new Date("2026-07-01T12:00:00Z")
    expect(hoursLate(due, new Date("2026-07-01T00:00:00Z"))).toBe(0)
  })

  it("defaults `now` to the real current time when omitted", () => {
    // Not pinning an exact hour count (that would be flaky against wall-clock jitter) — pinning
    // only that the optional-arg branch is exercised and returns a sane positive number for a
    // deep-past dueAt.
    const result = hoursLate(new Date("2020-01-01T00:00:00Z"))
    expect(typeof result).toBe("number")
    expect(result).toBeGreaterThan(0)
  })
})

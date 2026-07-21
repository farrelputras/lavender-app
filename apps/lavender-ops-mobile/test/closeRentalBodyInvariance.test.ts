// Guards rpc_close_rental against the exact failure that produced the `deleted_at` bug:
// `CREATE OR REPLACE FUNCTION` has no partial-update form, so changing one line of a Postgres
// function means restating the entire body — and nothing in the tooling diffs the new body against
// the old one. 0015_close_rental_tujuan.sql restated the body to add a single `tujuan` line and
// silently dropped `AND deleted_at IS NULL` from the v_total_paid sum, understating every
// auto-created hutang on a rental that had a soft-deleted payment. Its header claimed only `tujuan`.
//
// These tests read the migration files as text. They prove two things no unit test of app code can:
//   1. the LAST definition of rpc_close_rental (the one a full `db push` leaves live) still filters
//      soft-deleted payments, and still carries the NULL-safe auth guard;
//   2. 20260721150806's body differs from 20260720103317's by exactly the two intended lines —
//      i.e. the money fix did not also revert the auth hardening.
//
// If a future migration legitimately changes this function, these tests will fail. That is the
// point: update them deliberately, in the same commit, having read the diff they print.

import { readdirSync, readFileSync } from "fs"
import { join } from "path"

const MIGRATIONS_DIR = join(__dirname, "..", "supabase", "migrations")

const HARDENING = "20260720103317_rpc_auth_gate_hardening.sql"
const DELETED_AT_FIX = "20260721150806_close_rental_exclude_deleted_payments.sql"

/** Every migration file, in the order `db push` applies them (lexicographic by version). */
function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
}

/**
 * The rpc_close_rental definition in `file`, as an array of lines, or null if absent.
 * Spans `CREATE OR REPLACE FUNCTION rpc_close_rental` through its `$$;` terminator.
 * Line endings are normalised — this repo carries mixed CRLF (known debt #6).
 */
function closeRentalBody(file: string): string[] | null {
  const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8").replace(/\r\n/g, "\n")
  const lines = sql.split("\n")
  const start = lines.findIndex((l) => l.startsWith("CREATE OR REPLACE FUNCTION rpc_close_rental"))
  if (start === -1) return null
  const end = lines.findIndex((l, i) => i > start && l.trim() === "$$;")
  expect(end).toBeGreaterThan(start) // a definition that never terminates is a malformed migration
  return lines.slice(start, end + 1)
}

/** The body that will be live after a full `db push` — the last file that defines the function. */
function liveBody(): { file: string; lines: string[] } {
  const defining = migrationFiles().filter((f) => closeRentalBody(f) !== null)
  expect(defining.length).toBeGreaterThan(0)
  const file = defining[defining.length - 1]
  return { file, lines: closeRentalBody(file)! }
}

describe("rpc_close_rental — live body invariants", () => {
  it("the last definition is the deleted_at fix, ordered after the auth hardening", () => {
    // Load-bearing: if a later migration redefines this function, it inherits responsibility for
    // both invariants below and this expectation must be updated to name it.
    // (Asserting `DELETED_AT_FIX > HARDENING` here would compare two literal constants and could
    // never fail — the real ordering proof is that the sorted scan below lands on the fix.)
    const defining = migrationFiles().filter((f) => closeRentalBody(f) !== null)
    expect(defining).toContain(HARDENING)
    expect(liveBody().file).toBe(DELETED_AT_FIX)
    expect(defining.indexOf(DELETED_AT_FIX)).toBeGreaterThan(defining.indexOf(HARDENING))
  })

  it("excludes soft-deleted payments from v_total_paid (the 0015 regression)", () => {
    const { lines } = liveBody()
    const idx = lines.findIndex((l) => l.includes("INTO v_total_paid"))
    expect(idx).toBeGreaterThan(-1)

    // The filter may sit on the same line or the wrapped continuation, as 0014 wrote it.
    const statement = lines
      .slice(idx, idx + 2)
      .join(" ")
      .replace(/\s+/g, " ")
    expect(statement).toContain("FROM payments")
    expect(statement).toContain("rental_id = p_rental_id")
    expect(statement).toContain("deleted_at IS NULL")
  })

  it("retains the NULL-safe auth guard (auth.uid() IN (...) is NULL, not false, when unauthenticated)", () => {
    const { lines } = liveBody()
    const guardIdx = lines.findIndex((l) => l.includes("auth.uid()"))
    expect(guardIdx).toBeGreaterThan(-1)
    const guard = lines[guardIdx]

    // `IF NOT <null>` never fires; `IF <null> IS NOT TRUE` does.
    expect(guard).toContain("IS NOT TRUE")
    expect(guard).not.toMatch(/IF\s+NOT\s+\(?auth\.uid\(\)/)

    // Shape alone is not enough — a widened role set would still read as a guard. Pin both the
    // roles it accepts and the fact that failing it actually raises.
    expect(guard).toContain("FROM app_config WHERE role IN ('ops', 'admin')")
    expect(lines[guardIdx + 1]).toContain("RAISE EXCEPTION 'unauthorized'")

    // Exactly one auth gate in this function — a second, laxer one added later must fail here.
    expect(lines.filter((l) => l.includes("auth.uid()"))).toHaveLength(1)
  })

  it("computes sisa as total_bill − total_paid, with no other money arithmetic introduced", () => {
    // docs/02-demo-development.md §6. Cheap structural check that a future body edit has not
    // quietly reshaped the formula.
    const { lines } = liveBody()
    expect(lines.some((l) => l.includes("v_sisa := v_total_bill - v_total_paid;"))).toBe(true)
    expect(
      lines.some((l) =>
        l.includes("v_total_bill := GREATEST(0, v_subtotal + v_charges_sum - v_discount);"),
      ),
    ).toBe(true)
  })
})

describe("rpc_close_rental — the deleted_at fix changed ONLY the money filter", () => {
  it("differs from the hardened body by exactly the two intended lines, in place", () => {
    const before = closeRentalBody(HARDENING)!
    const after = closeRentalBody(DELETED_AT_FIX)!

    // Index-aligned, NOT a set difference. An order-blind comparison (filtering each side for lines
    // absent from the other) would report an empty diff for a pure reordering — and in a plpgsql
    // body, order is semantics. Hoisting the `INTO v_total_paid` SELECT above the `newPayments`
    // loop would silently stop counting return payments, and a set diff would call that identical.
    const at = before.findIndex((l) => l.includes("-- Compute sisa"))
    expect(at).toBeGreaterThan(-1)
    expect(before[at + 1]).toContain("INTO v_total_paid")

    // Rebuild the hardened body with only the intended splice applied, then require byte equality.
    const expected = [
      ...before.slice(0, at),
      "  -- Compute sisa (exclude soft-deleted payments) and conditionally create hutang.",
      "  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid",
      "    FROM payments WHERE rental_id = p_rental_id AND deleted_at IS NULL;",
      ...before.slice(at + 2),
    ]

    expect(after).toEqual(expected)

    // Guards the splice itself: confirm what was replaced was the unfiltered sum, so this test
    // cannot go green by having been rebased onto an already-fixed `before`.
    expect(before[at]).toBe("  -- Compute sisa and conditionally create hutang")
    expect(before[at + 1]).toBe(
      "  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid FROM payments WHERE rental_id = p_rental_id;",
    )
  })

  it("restores the filter verbatim from 0014, the migration that first added it", () => {
    // Provenance check: this is restored reviewed code, not newly authored logic.
    const zero14 = readFileSync(join(MIGRATIONS_DIR, "0014_payment_edit_delete.sql"), "utf8")
      .replace(/\r\n/g, "\n")
      .split("\n")
    const idx = zero14.findIndex((l) => l.includes("INTO v_total_paid"))
    expect(idx).toBeGreaterThan(-1)

    const after = closeRentalBody(DELETED_AT_FIX)!
    const fixIdx = after.findIndex((l) => l.includes("INTO v_total_paid"))
    expect(after.slice(fixIdx, fixIdx + 2)).toEqual(zero14.slice(idx, idx + 2))
  })
})

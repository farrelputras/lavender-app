# Verification Scripts

SQL scripts that verify **live database behavior** — the things unit tests structurally cannot
reach. Postgres `SECURITY DEFINER` RPCs, RLS gates, and cascade/block semantics only prove
themselves against a real Supabase instance with a real `auth.uid()`.

Keep every script that was actually run here, alongside its recorded result. They double as the
regression suite if a migration ever gets rebuilt from scratch.

## How to run

From `apps/lavender-ops-mobile` (the Supabase CLI is a devDependency — always `npx`):

```powershell
npx supabase db query --linked -f ../../docs/verification/<script>.sql
```

Or paste section-by-section into the Supabase SQL editor. Every script here is written so each
test returns a **plain text result row** (not a `RAISE NOTICE`), because NOTICE output isn't
guaranteed to surface in every SQL client.

## ⚠️ Two rules any new script here must follow

1. **Never rely on session-level Postgres state.** `SET` / `set_config(..., false)` does **not**
   survive across separate statement round-trips against this project — Supabase's pooled
   connection (PgBouncer, transaction-mode) does not guarantee the same physical backend serves
   consecutive statements. This was observed directly: a standalone `set_config` followed by a
   separate `SELECT auth.uid()` returned `NULL`.

   **Instead:** do impersonation and the call-under-test **atomically inside one PL/pgSQL function
   call** — see `_test34_call()` in `task-3.4-admin-hard-delete.sql` for the pattern.

2. **Drop your test helper functions when done.** `CREATE FUNCTION` grants `EXECUTE` to `PUBLIC`
   by default. A helper that spoofs `auth.uid()` and runs arbitrary SQL is a *complete bypass* of
   the admin authorization gate if it's left sitting in the `public` schema. Every script must end
   with its `DROP FUNCTION` statements, and you must confirm they ran.

## Scripts

### `task-3.4-admin-hard-delete.sql`

Verifies migration `0016_admin_hard_delete.sql` — the four admin-only hard-delete RPCs
(`rpc_admin_delete_rental` / `_hutang` / `_user` / `_vehicle`).

Uses disposable fixtures tagged `TEST_TASK34`, self-cleans, and ends with a zero-row sweep.

**Run against production Supabase (`tuufzjxoprjsrrkagncz`) on 2026-07-12 — all sections passed.**

| Section | What it proves | Expected | Result |
|---|---|---|---|
| A | Auth gate rejects a non-admin `auth.uid()` | `ERROR: unauthorized` | ✅ |
| B | COMPLETED rental cascades: rental + charges + payments + linked hutang + that hutang's payments all gone | all counts `0` | ✅ |
| C | ACTIVE rental cascade also releases the vehicle | `status = TERSEDIA` | ✅ |
| D | User delete **blocks** while a hutang references it, then succeeds once clear | `ERROR: Tidak bisa dihapus…` then OK | ✅ |
| E | Vehicle delete **blocks** while a rental references it, then succeeds once clear | `ERROR: Tidak bisa dihapus…` then OK | ✅ |
| F–G | Fixtures fully swept; helper functions dropped | zero rows, zero helpers | ✅ |

Post-run hygiene confirmed independently: `0` leftover `_test34_*` functions, `4`
`rpc_admin_delete_*` functions present, `0` `TEST_TASK34` rows across all six tables.

### `v1-0-3-rpc-update-rental.sql`

Verifies migration `20260720073455_rpc_update_rental.sql` — PRD-1's new RPC and the full permission
matrix behind "edit an active rental". This is the script that closes **AC-4** and the server half of
**AC-6**.

Uses disposable fixtures, self-cleans, drops its helpers in Section Z.

**Run against production Supabase (`tuufzjxoprjsrrkagncz`) on 2026-07-21, immediately after
`npx supabase db push` — all sections passed.**

| Section | What it proves |
|---|---|
| B–D | `kondisiKeluar`: succeeds for ops on ACTIVE; RAISEs on COMPLETED **even for admin**; RAISEs on CANCELLED. Exit fuel is the baseline for the return fuel adjustment, so it is editable only before that calculation runs |
| E–H | `notes`: ops or admin on ACTIVE; **admin only** on COMPLETED (ops RAISEs); no one on CANCELLED |
| I | **D-1** last-photo rule — ops RAISEs when emptying a non-empty photo set, admin succeeds |
| J | The edge case D-1a exists for: ops editing a rental that **already** has zero photos must still succeed, because the RPC rewrites `kondisi_keluar` wholesale and so sends `photos: []` legitimately |
| K | A caller with NULL identity is rejected by the in-function guard — the NULL-logic bypass |
| K2 | `EXECUTE` is exactly `{authenticated}`, not `PUBLIC`/`anon` |
| L | `bensinKotak` missing or JSON `null` is **rejected**, not silently defaulted to 4 kotak by `translators.ts`'s `?? 4` |
| Z | Fixtures removed, helpers dropped |

### `v1-0-3-rpc-auth-gate-hardening.sql`

Verifies migration `20260720103317_rpc_auth_gate_hardening.sql` — the NULL-safe guard
conversion + `REVOKE`/`GRANT` pass applied to the nine pre-existing `SECURITY DEFINER` RPCs
(`rpc_get_dashboard_summary`, `rpc_create_rental`, `rpc_close_rental`, `rpc_update_payment`,
`rpc_delete_payment`, `rpc_admin_delete_rental`/`_hutang`/`_user`/`_vehicle`), plus the
`REVOKE`-only closure of `recompute_rental_hutang`.

Uses disposable fixtures tagged `TEST_V103H`, self-cleans, ends with a zero-row sweep.

**Run against production Supabase (`tuufzjxoprjsrrkagncz`) on 2026-07-21, immediately after
`npx supabase db push` — all sections passed.**

Independently re-confirmed the same day by a separate read-only query against `pg_proc` /
`has_function_privilege` (not by re-running this script): `anon` holds `EXECUTE` on none of the
eleven functions, `authenticated` retains it on all ten client-facing ones,
`recompute_rental_hutang` is closed to both, and no `_test*` helper was left in `public`.

| Section | What it proves |
|---|---|
| B | Privilege gate: `anon`=false, `authenticated`=true for all nine client RPCs; both false for `recompute_rental_hutang` |
| C | NULL-auth gate: an unauthenticated call raises the exact `unauthorized` message on every guard branch (13 call sites across the nine functions), with no mutation |
| D | Positive-path smoke: every legitimate ops/admin call still succeeds — the direct proof against a backwards `IS NOT TRUE` polarity flip |

### `v1-0-3-close-rental-deleted-payments.sql`

Verifies migration `20260721150806_close_rental_exclude_deleted_payments.sql` — the restoration of
`AND deleted_at IS NULL` to `rpc_close_rental`'s `v_total_paid` sum, which `0015` dropped when it
replaced the whole function body to add one `tujuan` line.

Runs as **ops, not admin** — the bug is reachable by Mom alone (`PengembalianScreen` calls
`deletePayment` itself at `:1022`; `RentalDetailScreen:719` allows it on an ACTIVE rental).

Uses disposable fixtures tagged `TEST_V103D`, self-cleans, ends with a zero-row sweep.

**Run against production Supabase (`tuufzjxoprjsrrkagncz`) on 2026-07-21, immediately after
`npx supabase db push` — all sections passed.** Section C passing is the direct proof that the
regression is closed: a soft-deleted payment covering the rest of the bill now produces the full
hutang instead of none.

Re-confirmed independently the same day: the deployed body of `rpc_close_rental` read out of
`pg_proc` contains both `AND deleted_at IS NULL` and the NULL-safe `IS NOT TRUE` guard, and zero
`TEST_V103D` fixture rows remain.

| Section | What it proves |
|---|---|
| B | `v_rentals` (what the app shows) reports `total_paid = 40000`, excluding the retracted payment |
| C | **Headline.** A soft-deleted payment covering the rest of the bill no longer suppresses the hutang: closing yields `jumlah_awal = 60000`, matching what the screen promised. Under the bug, `IF v_sisa > 0` skips the INSERT and **no hutang exists at all** |
| D | Inverse control: a genuinely fully-paid rental still creates **no** hutang — proof the filter was not inverted |
| E | Fixtures swept, `_test103d_*` helpers dropped (they spoof `auth.uid()`; leaving one is a full authorization bypass) |

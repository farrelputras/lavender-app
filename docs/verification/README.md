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

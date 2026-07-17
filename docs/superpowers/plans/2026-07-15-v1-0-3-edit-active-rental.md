# v1.0.3 implementation plan — Edit an active rental

- **Layer:** implementation plan (the **HOW**). Requirements are **PRD-1**
  (`docs/prd/PRD-1-edit-active-rental.md`); scope / delivery / release gates are the release plan
  (`docs/releases/v1-0-3.md`). This doc owns the technical approach only.
- **Provenance:** extracted 2026-07-17 from the v1.0.3 **release** doc, where this design had been
  drafted (2026-07-15) before the PRD / release / plan split. Content is unchanged except cross-
  references. Under the agent-system model the implementation plan is **Lead's** artifact — Lead may
  revise this before dispatch.
- **Ships as:** one migration (`rpc_update_rental`, applied via `db push`) **+ OTA** (connector + UI).
  No native dep → no APK, no `version` bump. Same delivery model as v1.0.1's `0016`/`0017`.

## The core insight — this is a re-run of `0014`

The payment edit/delete work in `0014_payment_edit_delete.sql` already solved every hard question this
feature raises: a **status-tiered auth gate**, a `jsonb` **patch** payload, `SECURITY DEFINER`,
audit-by-trigger, and connector-re-fetch. v1.0.3 applies that proven pattern to two more fields. We
are not inventing anything — which is why touching money here is low-risk.

## A. Write path — one `SECURITY DEFINER` RPC (decided: not a direct table write)

RLS (`operators_update_rentals`, `0006_rls.sql:63`) already lets `ops` UPDATE any rental, so a direct
`.from("rentals").update()` would *work* like `updateUser` does. **We deliberately do not**, because
**RLS cannot express "only while `ACTIVE`"** — and that per-status rule is the whole safety argument
for editing `kondisiKeluar` (the fuel baseline is only safe to move before the return calc runs). A
client-only gate is bypassable. So the gate lives server-side, in an RPC modeled on
`rpc_update_payment`:

```
rpc_update_rental(p_rental_id uuid, patch jsonb)   -- SECURITY DEFINER, SET search_path = public
```

**Tiered auth gate** (resolve `status` first, then):

| patch contains | ACTIVE | COMPLETED | else (CANCELLED) |
|---|---|---|---|
| `kondisiKeluar` | ops \| admin | **RAISE** (settled math) | RAISE |
| `notes` only | ops \| admin | **admin only** | RAISE |

- `kondisiKeluar` present + status ≠ ACTIVE → `RAISE EXCEPTION` (mirrors `rpc_close_rental`'s
  `not found or not ACTIVE`).
- `notes` on a COMPLETED rental → admin only (`auth.uid() = app_config.role='admin'`), mirroring the
  closed-rental tier of `rpc_update_payment`. Harmless text, no recompute.
- **No hutang/tariff recompute anywhere.** `notes` is text; `kondisiKeluar` edits happen only while
  ACTIVE, i.e. *before* the return calc runs — so nothing downstream is invalidated. This is what
  makes `updateRental` simpler than `rpc_update_payment` (which must call `recompute_rental_hutang`).

**Photo merge happens in the RPC**, so path resolution stays server-side (the connector never needs
the raw storage paths of kept photos). The `kondisiKeluar` patch carries:

```jsonc
"kondisiKeluar": {
  "bensinKotak": 4,
  "km": 12500,                 // or null
  "keepPhotoIds": ["<id>", …], // existing photos to retain
  "newPhotos": [ { "id": "<uuid>", "path": "<storagePath>" }, … ]  // already uploaded by the connector
}
```

The RPC rebuilds the array: `photos = (existing kondisi_keluar->photos WHERE id ∈ keepPhotoIds) ||
newPhotos`, then writes `kondisi_keluar = { bensinKotak, km, photos }`. Photos dropped from
`keepPhotoIds` are simply not carried forward → orphaned in the bucket (see B).

`GRANT EXECUTE ON FUNCTION rpc_update_rental(uuid, jsonb) TO authenticated;`

**Audit is free:** the `UPDATE` fires `trg_audit_rentals` (`0004_triggers.sql:35`), stamping
`updated_at` + `updated_by = auth.uid()`. No new trigger.

## B. Photos in §C — mirror `updateUser`: orphan-on-remove (landmine #1, resolved)

The connector uploads any **new** photo client-side (`uploadPhoto` → `buildRentalPhotoPath`, exactly
like `uploadKondisiPhotos`), obtaining `{ id, path }`, and passes those as `newPhotos`. Removed photos
are simply absent from `keepPhotoIds` and **orphan in the `rental-photos` bucket** — precisely how
`updateUser` (`index.ts:199–201`) already handles KTP/KTM removal: it nulls the reference and never
calls `storage.remove()`.

- **No storage DELETE, no RLS change.** Mom's `ops` role works today. This is the whole resolution of
  the old landmine #1 (below): the app's answer to "ops can't delete storage" is "don't delete —
  orphan, and let hard-delete reap it."
- Because `buildRentalPhotoPath` prefixes every file with the rental id, the admin hard-delete's
  prefix sweep removes the orphans when the rental is eventually deleted.

## C. Connector — locked signature (`docs/02` §3)

```ts
export async function updateRental(
  rentalId: string,
  input: UpdateRentalInput,
): Promise<Rental>

type KondisiPhotoEdit =
  | { kind: "keep"; id: string }
  | { kind: "new"; uri: string; mimeType?: string }

interface UpdateRentalInput {
  notes?: string
  kondisiKeluar?: {
    bensinKotak: number
    km: number | null
    photos: KondisiPhotoEdit[]   // the desired final set; omitted = removed
  }
}
```

Flow: upload each `{ kind: "new" }` photo → assemble `keepPhotoIds` + `newPhotos` → call
`rpc_update_rental` → re-fetch via `getRental` (re-signs URIs) → return `Rental`. **Throw
`new Error(error.message)`**, never the raw postgrest object (landmine #2).

## D. UI — inline edit on `RentalDetailScreen` (decided: inline, not a sheet)

Restore the two Edit affordances. **Visibility matches the gate** (and the existing payment-edit
pattern at `:536`, `rental.status === "ACTIVE" || isAdmin`):

- **Kondisi Keluar** Edit: visible only when `status === "ACTIVE"`.
- **Catatan Rental** Edit: visible when `status === "ACTIVE"` **or** (`status === "COMPLETED"` **and**
  `isAdmin`).

Tap Edit → the section flips editable **in place** → Save/Cancel bar:

- **Catatan** → `TextInput` (multiline) seeded with `rental.notes`.
- **Kondisi Keluar** → all **three** `KondisiSnapshot` fields, because the RPC rewrites
  `kondisi_keluar` wholesale — any field not sent is lost:
  - `bensinKotak` → needs an **interactive** control. The `BensinGauge` mounted at `:371` is
    display-only; use the shared interactive `app/components/form/FuelGauge` (or a `Stepper`). ⚠️ The
    gauges carry a known `max` divergence (`known-technical-debt.md` #4: DetailSewa's local gauge uses
    `max = 8`, Pengembalian's none) — pick the correct fuel-box `max` deliberately, but do **not**
    start a gauge-unification refactor inside this release.
  - `km` → numeric input seeded from `rental.kondisiKeluar.km` (already shown read-only at
    `:377–386`). **Must** be carried in the patch even if unchanged, or the wholesale rewrite nulls it.
  - photos → `PhotoRow` with live `onAdd`/`onRemove`. It is *already mounted* here as `readonly` —
    this is a prop flip, not a rebuild.

Save is **disabled while the write is in flight** (a small re-entrancy guard — `known-technical-debt`
#2). On success, update local `rental` state from the returned `Rental` and toast; on failure, toast
the thrown message and stay in edit mode.

## E. Tests & review

- **Connector unit tests** — mock the rpc `error` as a **plain object** `{ message, … }`, never
  `new Error(...)` (landmine #2; this exact mistake hid a real bug twice).
- **`docs/verification/` SQL** — prove the gate: `kondisiKeluar` patch on a COMPLETED rental RAISEs;
  `notes` patch on COMPLETED succeeds for admin, RAISEs for ops; ACTIVE succeeds for ops. Read the
  `docs/verification/README` first, and remember session `set_config(...)` does not survive across
  statements on this pooled project — impersonation must be atomic inside one call.
- **`rental-math-reviewer`** on §C — it is the first thing since v1.0.0 to move a number the tariff/
  fuel calc depends on. Confirm the ACTIVE-gate argument holds (no settled record can be edited).

## Known landmines (from v1.0.1)

1. **`SECURITY DEFINER` does not cover client-side steps** — *resolved for this release by design B.*
   The old worry: letting mom replace an exit photo needs a storage DELETE path that does not exist
   (`0017` gave DELETE to admin only). The resolution: **we never delete** — we orphan, exactly like
   `updateUser`. So no `ops` storage-DELETE policy is introduced, and there is no silent-failure
   surface. If a future release *does* want true cleanup, that is where this landmine re-applies.
2. **Supabase errors are not `Error` instances.** `supabase.rpc()` returns a plain object. Throw
   `new Error(error.message)` in the connector; mock the plain-object shape in tests — never
   `new Error(...)`.

## Open questions carried from PRD-1 (resolve at plan time)

- **OQ-1** May Mom remove the **last** exit photo (an empty exit-photo set), or is at least one photo
  required?
- **OQ-2** Which fuel-box **max** is correct for the interactive control? (A correctness detail, not a
  refactor — see §D.)

Neither blocks scheduling; both are resolved before/at implementation.

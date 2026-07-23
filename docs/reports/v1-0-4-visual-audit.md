# v1.0.4 — Visual audit checklist

**Walked by:** Farrel, on his own device `[by-Farrel, D-3]` · **Authored by:** `tester` (⑤), 2026-07-22
· **Revised** by Lead 2026-07-23 to match the **D-8 fix** (BR-1 on `SearchField`/`RupiahInput`/
`UserDetailScreen` — rows A3/C5/I5/I6, the resolved block, and new rows J1/J2)
**Release report:** `docs/reports/v1-0-4.md` · **Requirements:** `docs/prd/PRD-4-*.md` · `docs/prd/PRD-5-*.md`

> **Why this document is the release's main artifact.** Almost every acceptance criterion in both PRDs is
> visual and device-conditional. Jest cannot see pixels — "renders without throwing at 1.5×" is a
> JS-crash guard, not a rendering proof. **And the only route onto Mom's phone is the OTA itself**, so
> this walk-through is the last chance to catch anything before she is the one who finds it.
>
> **A vague row is how a 14-screen audit silently becomes a 6-screen audit.** Every row below names a
> specific control, label, or row on purpose.

**Setup:** device set to **XL text size** and **3-button navigation**. Where a row says *"at default
scale,"* drop back to your normal text size for that row only, then return to XL.

**`KendaraanScreen` is excluded** — unreachable dead code, not wired into any navigator (debt #3).
Explicitly out of scope, not silently omitted.

---

## A · The four flagship defects — pass/fail confirmations

| # | Screen | Exact thing to look at | Pass condition |
|---|---|---|---|
| **A1** | **RentalScreen** (Rental tab) | Any card whose date range is long enough to reach the *Sisa* figure — the row that read `22 JuliSisa Rp 50.000` | Date range and *Sisa Rp X* visibly separated — side by side with a real gap, or *Sisa* on its own line. **They never touch and never read as one string.** |
| **A2** | **BerandaScreen** | The two quick-action buttons under "Halo!" | Both read **`Sewa Baru`** and **`User Baru`** in full — no character cut off, none swallowed by the neighbouring button. |
| **A3** | **PilihKendaraanScreen** (Sewa Baru → pick user → vehicle grid) | Every vehicle card's licence plate | Every plate complete end to end (`N 2314 AB`, not `N 2314 A…`). **Check the last row of the grid too.** |
| **A4** | **DetailSewaScreen** (Sewa Baru step 3) | Header: title + `Langkah 3 dari 3 · Detail Sewa` | Title and subtitle wrap cleanly, don't collide with each other or the back arrow, stay legible. |

## B · Money-row relatives — new claims, never seen on a device

The same fusion mechanism as A1, fixed on four more rows. These are claims this release makes that no
human has verified.

| # | Screen | Thing to look at | Confirm |
|---|---|---|---|
| **B1** | **HutangScreen** | Every hutang card's footer (*Sisa* left, *Awal Rp X* right) | Same separation rule as A1 — never touching. |
| **B2** | **DetailSewaScreen** (step 3) | The **Total Tagihan** row **and** the two payment-summary rows below it | Same rule — three rows on this screen. |
| **B3** | **PengembalianScreen** | The payment-summary row near the bottom | Same rule. |
| **B4** | **RentalDetailScreen** | The payment-summary row (Sudah Dibayar / Sisa) | Same rule. |

## C · CTA-button relatives — new claims, never seen on a device

| # | Screen | Button(s) | Confirm |
|---|---|---|---|
| **C1** | **DetailSewaScreen** step 3 | `Batal` (beside `Simpan Rental`) | Label fully visible, button not visually broken. |
| **C2** | **HutangDetailScreen** | `Tambah Pembayaran`; admin-only `Hapus Hutang Permanen` | Labels fully visible; button grows rather than clipping if the label wraps. |
| **C3** | **PengembalianScreen** | `Selesaikan & Buat Hutang` — **the longest CTA label in the app (24 chars)** | Label fully visible even if it wraps to two lines. |
| **C4** | **RentalDetailScreen** | `Hapus Rental Permanen` (admin), `Proses Pengembalian`, `Kembali ke Beranda` | All three fully visible. |
| **C5** | **UserDetailScreen** | `WhatsApp`, `Hapus User`, admin `Hapus Permanen` | **Fixed in D-8** (⑦, 2026-07-23): all three now use `minHeight: 52` + `paddingVertical` + `flexShrink` on the label, matching every other CTA in the app; gated by a BR-1 test (D-9). Plain confirm — all three labels fully visible, buttons grow rather than clip, especially `Hapus Permanen`. |

## D · Wrap alignment — invisible at default scale, check at 1.5×

| # | Screen | What to look at |
|---|---|---|
| **D1** | **RentalDetailScreen** payment-summary row, **at XL specifically** | Once the label and the rupiah amount fall onto separate lines, the amount **left-aligns instead of right-aligning** — `flexWrap` on a `space-between` row means each line holds one item, so "space between" has nothing to push against. Cosmetic but real, and **no 1.0× screenshot will ever show it.** Same mechanism applies to A1 and B1–B4 — if you see it on one, check whether it's consistent across all of them. |

## E · D-7 — the taller-card tradeoff, **at DEFAULT scale**

`numberOfLines={1}` was deliberately removed from customer names, vehicle names, and plates. **BR-1 beats
BR-5 here — Farrel's call.** A truncated identifier is wrong at any scale. The cost is that a long name
now wraps and makes cards taller *at default scale too*, which is a disclosed, intentional change.

| # | Screen | What to look at |
|---|---|---|
| **E1** | **RentalScreen**, **UserScreen**, **PilihUserScreen** — normal text size, **longest real customer name in the production database** | The taller card reads as *intentional* (a name that needed two lines), not *broken* (misaligned, overlapping, squished). |
| **E2** | **PilihKendaraanScreen**, default scale, longest real vehicle name + plate | Same check for vehicle cards. |
| **E3** | **HutangScreen**, longest real customer name | Same check for the hutang card header. |

## F · PRD-4 AC-6 — keyboard. **Device-only; cannot be settled from source**

`KeyboardAvoidingView` is a **no-op on Android** here (`behavior={undefined}`), so keyboard handling is
Android's native window resize. Whether the new inset padding produces a floating gap depends on whether
`useSafeAreaInsets()` changes while the IME is up — unknowable from source.

| # | Screen | What to check |
|---|---|---|
| **F1** | **DetailSewaScreen** (step 3) | Tap a text field near the bottom. The `Simpan Rental` bar sits directly above the keyboard — **no floating gap, no double offset.** |
| **F2** | **PengembalianScreen** | Same check. |
| **F3** | **HutangFormScreen**, **UserFormScreen** | Same check on the shared `BottomActionBar`. |

## G · Beranda scroll-to-end — the code says reachable; only a device proves it

| # | Screen | What to check |
|---|---|---|
| **G1** | **BerandaScreen**, at XL | Scroll all the way down. **All four stat cards plus the version footer** fully reachable and readable — nothing cut off by the tab bar or system nav. *(This is the residual left by the Beranda diagnostic: PRD-4's third reported defect was proven to be a scroll fold, not a clip. A static image cannot prove reachability.)* |

## H · The diagnostic footer — the only thing that measures the cap

| # | Screen | What to check |
|---|---|---|
| **H1** | **BerandaScreen**, scrolled to the bottom | ✅ **MEASURED on Mom's Poco M3, 2026-07-23:** `fontScale = 1.3999999…` (≈**1.4**) · `inset = 47.27px` · 3-button nav respected. **Both assumptions confirmed:** her real MIUI "XL" (1.4) sits **below** `MAX_FONT_SCALE = 1.5` — the cap is adequate and never shrinks her text — and the runtime inset (47.27) matches the `48px` assumed throughout testing, proving PRD-4 reads a real device inset (BR-3). This closes the release's one LOW-confidence assumption. |

## I · Every remaining screen — general pass plus the named specific

| # | Screen | Specific thing |
|---|---|---|
| **I1** | **HutangScreen** | FAB label `Hutang Baru` fully visible; header title/subtitle (`Hutang` / `N pelanggan · total Rp X`) don't collide. |
| **I2** | **UserScreen** | FAB label `User Baru` fully visible; sticky section-letter headers ("A", "B"…) don't overlap the row below. |
| **I3** | **LoginScreen** | `Lavender Ops` title, both field labels, and `Masuk` all fully visible; trigger a bad login and confirm the error banner doesn't overlap the button. |
| **I4** | **PilihUserScreen** | Its own step header `Langkah 1 dari 3 · Pilih User` — structurally identical to A4's, but never individually named in the release record. Confirm it wraps as cleanly as the other two. |
| **I5** | **RentalScreen** | Filter tabs (`Semua`/`Aktif`/`Selesai`) don't wrap awkwardly or overlap. |
| **I6** | **HutangFormScreen**, **UserFormScreen** | The field rows inside each `FieldCard`. The `Rp` input (`RupiahInput`) was **fixed in D-8** — `height: 52` → `minHeight: 52` — so at XL it should **grow to fit**, not squeeze or spill past its row. Confirm the Rp amount is fully readable and the row isn't clipped. |
| **I7** | **UserDetailScreen** | Stat cards (Sewa Aktif / Hutang) and the Dokumen & Foto photo row don't look cramped. |
| **I8** | **RentalDetailScreen** | Both pinned bottom bars (the kondisi-edit save/cancel bar and the main action bar) — buttons fully visible, no overlap with the system nav. |

---

## ✅ RESOLVED before the walk-through — the BR-1 miss is fixed (D-8)

The open item that paused this walk-through on 2026-07-22 is **closed.** `SearchField` (`height: 48`) and
`RupiahInput` (`height: 52`) — plus `UserDetailScreen`'s three buttons — pinned a fixed height around
scalable text (discovery F-10 named `SearchField` as *the highest-leverage single target in PRD-5*). Farrel
chose to fix all three (D-8); ⑦ applied `height` → `minHeight` on 2026-07-23, the 2 formerly-red tests are
green, and a BR-1 regression gate now guards it (D-9). **This checklist describes the fixed build** — rows
A3, C5, I5, I6 have been updated accordingly.

**So this is now a confirmation, not a hunt** — but confirm it on the device, because RN's default
`overflow: visible` meant the pre-fix failure mode was text *spilling past* the pill, which no 1.0×
screenshot shows:

| # | Screen(s) | Confirm at XL |
|---|---|---|
| **J1** | Search fields: **RentalScreen, PilihUserScreen, PilihKendaraanScreen, UserScreen** | The search box **grows to fit** the enlarged text — the typed/placeholder text sits inside the rounded pill, never spilling above or below its border. |
| **J2** | Rp inputs: **HutangFormScreen, UserFormScreen** | Same for the `Rp` amount field (also see I6). And, since `RupiahInput` is *consumed* by **DetailSewaScreen** and **PengembalianScreen** (fenced screens, source unchanged), confirm the amount field there renders the same way — rows B2/B3 already cover those screens. |

---

## Structurally PENDING — cannot be closed before publish

- **PRD-4 AC-8 · PRD-5 AC-8** — Mom's own confirmation on her Poco M3 at her real setting. The only route
  onto her device is the OTA. **Not passed, not failed: pending.**
- **"Shipped" is not claimable until Mom has confirmed.** Plan a same-day check-in with her; do not close
  the release on a screenshot from anyone else's device.

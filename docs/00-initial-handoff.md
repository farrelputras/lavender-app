# LAVENDER App — Session Handoff

## Project Context

**LAVENDER** is a mobile app for a vehicle rental business in Indonesia. The business rents motorcycles (primary) and cars to university students. The app is an internal operations tool used by:

- **Mom** (50 years old, business owner, primary user)
- **Farrel** (admin, son, secondary user)

Customers/renters never use the app — they're registered and managed by Mom/Farrel.

**Future scope (not MVP):** A web app companion with admin-heavy features. The architecture will be one backend serving as gateway, one web app (admin), one mobile app (day-to-day).

---

## MVP Feature Scope

1. **User Management** — register/edit users (renters), paired with PDDikti student verification
2. **Student Verification (PDDikti)** — optional, non-blocking, enrichment data only
3. **Vehicle Management** — CRUD vehicles
4. **Penyewaan** — create new rentals
5. **Pengembalian** — process returns, calculate final tally, create hutang if needed
6. **Manajemen Hutang** — track and collect outstanding debts (its own entity)

---

## Core Design Principles

**Terminology**
- "User" (NOT "Customer") refers to renters
- All UI text in Bahasa Indonesia
- Visual style: professional-clean with warm lavender accent (#8B7AB8 or similar)
- Large tap targets, generous spacing (target user is 50yo)

**Mental model: "Trust ledger"**
- The app records what Mom decides — it doesn't enforce business rules
- Almost every field is editable, with notes
- Soft validation, never hard blocks (yellow warnings, not red errors)
- Mom always has the final say
- Every entity has a notes field for mnemonic context

**Two-operator model**
- Realtime sync needed (Mom on one phone, Farrel can assist remotely)
- Audit trail in database (who changed what, when) — no visible UI in MVP, queryable later

---

## Key Business Decisions

**Rental periods**
- 6 hours, 12 hours, 24 hours (and multiples of 24h for multi-day)
- UI selector: "Hari" stepper + "Jam" segmented buttons (0/6/12)
- Examples:
  - 6h rental = 0 Hari + 6 Jam
  - 24h rental = 1 Hari + 0 Jam
  - 1.5 days = 1 Hari + 12 Jam
  - 3 days = 3 Hari + 0 Jam
- **Source of truth: Waktu Sewa (datetime range).** Paket Sewa is derived from it. If they contradict (manual edit), Waktu Sewa wins.

**Pricing**
- Each vehicle has 3 tarif: 6h, 12h, 24h
- Tarif × duration = subtotal (math-based, e.g., 1 Hari 12 Jam = 24h tarif + 12h tarif)
- Tarif is editable per rental (silent edit, with "Tarif default: Rp X" hint if changed)
- **Add-on**: single combined entry per rental (description text + amount), included in total
  - Example: description "helm pink 2, jas hujan", amount Rp 15.000
- **Diskon**: separate line item
- Total formula: `Tarif + Add-on − Diskon`
- Row order in Tarif & Total section: Tarif → Add-on → Diskon → Total

**Payments**
- Unified model: rentals AND hutang both have a list of payments
- Payment fields: Jumlah (required), Metode (Cash/Transfer/QRIS/Lainnya, required), Tanggal (date only, no time, default today), Catatan (optional)
- If Metode = Lainnya, conditional text field appears for description
- Partial payments tracked (cicilan)
- "Sisa" = Total tagihan − sum(payments)

**Jaminan**
- Physical KTP + KTM held by Mom (no inventory tracking — just per-rental checkbox)
- Released only when all dues are paid
- Required: at least one jaminan checked

**Hutang**
- Its own entity (not just a flag on rentals)
- Originates from: closed rental with sisa > 0 → creates Hutang record
- Can also be created manually (e.g., owes money for non-rental reasons)
- Multiple open hutang per user possible
- Has its own list of payments (cicilan)
- Status: Aktif / Lunas
- **Hutang is a WARNING, never a block.** Mom can rent to a user with open hutang.

**Penyewaan extension/perpanjangan**
- No separate flow — just edit "Estimasi Kembali" datetime
- Tarif recalculates automatically
- Payment can be updated in the same edit if Mom requires upfront payment

**Multi-vehicle rental**
- One user renting 2 vehicles = TWO separate rentals (cleaner data model)

**PDDikti verification**
- Optional, never blocks any flow
- Done once at registration (with manual fallback if unavailable)
- Some renters aren't students — Mom curates manually
- Verified data: nama, tahun_masuk, universitas, prodi, etc.
- Should always have a confirmation step ("Ini orangnya?") before populating

**Itemized charges at Pengembalian**
- Line items: subtotal sewa, denda telat, bensin kurang, damage, diskon, etc.
- Each is a row, freely addable
- Final total computed from line items
- If sisa > 0 at close → Hutang record created automatically, jaminan held

**Customer-facing receipts: NOT in MVP**

---

## App Structure (Bottom Navigation)

**Bottom nav tabs:**
1. **Beranda** — home/dashboard
2. **Penyewaan** — all rentals (filterable by Aktif/Selesai/Semua); was "Sewa Aktif," renamed for history access
3. **User** — user list and management
4. **Hutang** — outstanding debts management

**Note for next session:** Beranda screen currently has "Sewa Aktif" in bottom nav label. This needs to be updated to "Penyewaan" (small adjustment prompt). The Beranda summary card "Sewa Aktif: 12" metric label can stay.

---

## Completed Screens

These screens were designed via Stitch in this session:

1. **Beranda** (Home screen)
2. **Sewa Baru — Pilih User** (Penyewaan flow Step 1, with phonebook-style alphabetical list)
3. **Sewa Baru — Pilih Kendaraan** (Penyewaan flow Step 2)
4. **Sewa Baru — Detail Sewa** (Penyewaan flow Step 3, with final adjustments: Jaminan + Foto Kondisi Keluar at top, Tarif & Total includes Add-on row)
5. **Tambah Pembayaran Bottom Sheet** (used in Detail Sewa, reusable for Pengembalian and Hutang)

---

## Pending Design Decisions (resolved)

- **Post Simpan Penyewaan behavior**: Toast + redirect to Rental Detail screen (Option A confirmed)

---

## Pending Design Decisions (NOT yet resolved — for next session)

### User Registration flow

1. **Wizard vs single form?** — needs decision
   - Proposed wizard: Step 1 (PDDikti verification, optional) → Step 2 (Data Diri) → Step 3 (Foto KTP & KTM)
2. **How does Mom approach PDDikti** — always try first, or decide upfront based on if customer is a student?
3. **PDDikti search input** — NIM vs Name+University as primary path?
4. **PDDikti results UX** — confirmation step always required (proposed: yes)

### Penyewaan tab (rental list with filters)

- Filter chips: Aktif (default) / Selesai / Semua
- Search by user name or plat nomor
- Date range filter
- Possibly status pembayaran filter (lunas / belum lunas / ada hutang)
- Card density and info shown per rental row

### Rental Detail screen

- Single destination for all rental viewing/editing
- Accessed from: Penyewaan list, Beranda "Harus Kembali Hari Ini," User detail "Riwayat Sewa," success destination after Simpan Penyewaan
- Behavior varies by status:
  - **Aktif**: full editable detail + primary action "Proses Pengembalian"
  - **Selesai**: read-only detail + historical info (final tally, hutang created if any)

---

## Remaining UI/UX Work

**Penyewaan flow companion pieces:**
- User registration form/wizard (with PDDikti verification UX)

**Pengembalian flow:**
- Triggered from Rental Detail screen ("Proses Pengembalian" button)
- Pengembalian form: kondisi kembali, itemized charges, final tally, payment, jaminan release vs. hutang creation

**Main tabs:**
- Penyewaan tab (list + filters)
- Rental Detail screen
- User tab (list + detail with rental history, hutang history, edit, PDDikti re-verify)
- Hutang tab (list + detail, payment recording, manual hutang creation)

**Lower priority / accessed via other paths:**
- Vehicle management (list + detail + add/edit)
- Auth/login screen (you + Mom)

**Adjustment needed:**
- Beranda bottom nav label: "Sewa Aktif" → "Penyewaan"

---

## Data Model (Working Draft)

These are the entities and key fields identified so far. Schema details to be formalized in technical phase.

**User**
- nama (required)
- panggilan (separate field, searchable)
- no HP
- alamat
- kontak darurat
- foto KTP, foto KTM
- PDDikti data (optional): nama_pddikti, tahun_masuk, universitas, prodi, etc.
- verification status: Terverifikasi PDDikti / Belum Diverifikasi / Verifikasi Gagal / Manual
- notes (free text, NOT searchable)
- audit fields

**Vehicle**
- plat nomor
- jenis (motor/mobil)
- merk + tipe
- tahun, warna
- tarif 6h, 12h, 24h (default, editable per rental)
- foto
- status: Tersedia / Disewa / Maintenance / Tidak Aktif
- notes (free text)
- audit fields

**Rental**
- references: User + Vehicle
- waktu_mulai (datetime)
- estimasi_kembali (datetime) ← source of truth for duration
- waktu_kembali_aktual (datetime, set at Pengembalian)
- tarif (snapshot at creation, editable)
- add_on_description (text), add_on_amount (currency)
- diskon
- jaminan: KTP checkbox, KTM checkbox, lainnya (text)
- foto_kondisi_keluar (multiple)
- foto_kondisi_kembali (multiple, set at Pengembalian)
- status: Aktif / Selesai
- notes
- audit fields
- has many: Payments (during rental and at close)
- has many: Charges (at Pengembalian — itemized line items: denda telat, bensin, damage, etc.)

**Payment** (polymorphic — belongs to Rental OR Hutang)
- jumlah
- metode: Cash / Transfer / QRIS / Lainnya (with description if Lainnya)
- tanggal (date only)
- catatan
- audit fields

**Hutang**
- references: User (required), Rental (optional — manual hutang has no rental link)
- jumlah_awal
- status: Aktif / Lunas
- notes
- audit fields
- has many: Payments
- sisa = jumlah_awal − sum(payments)

**Charges** (line items on Pengembalian)
- references: Rental
- description (text)
- amount (currency, can be negative for diskon)

**User (admin)** — for audit trail
- Mom
- Farrel

**Audit log**
- Every record tracks: dibuat oleh, diubah oleh, timestamp, before/after values
- No UI in MVP, queryable in DB

---

## Visual Style Reference

- **Primary accent**: warm lavender/soft purple (#8B7AB8 or similar)
- **Base**: white background, light gray dividers
- **Typography**: clear, slightly larger than typical (target user is 50yo)
- **Cards**: 12-16px rounded corners, subtle shadow
- **Status colors**:
  - Green = available, lunas, verified, positive
  - Amber = warning, sedang sewa, due soon
  - Red = overdue, hutang, error
  - Gray = inactive, unverified
- **Tap targets**: 44-56px minimum height
- **Tone**: Professional and clean (like POS or banking app), warm but not playful

---

## How to Start the Next Session

Paste this at the start of the next session:

> I'm building "LAVENDER," a mobile app for my mom's vehicle rental business in Indonesia. The MVP scope, business decisions, design principles, and 5 completed screens (Beranda, Pilih User, Pilih Kendaraan, Detail Sewa, Tambah Pembayaran bottom sheet) are documented in the attached handoff. Today I want to work on [SPECIFY].

Then attach this handoff document.

---

## Recommended Next Session Topics (pick one)

**Option 1: Finish core flows**
- Beranda bottom nav adjustment (small prompt)
- User Registration flow (multi-screen, includes PDDikti UX)
- Penyewaan tab (rental list + filters)
- Rental Detail screen
- Pengembalian flow

**Option 2: Lock the foundation**
- Formalize data model (ERD diagram)
- Document business rules and edge cases as reference doc
- Technical stack decisions (framework, database, hosting, realtime sync)

**Option 3: De-risk the unknown**
- PDDikti integration spike — research feasibility, data structure, reliability, rate limits
- This unblocks backend architecture decisions

---

## Open Technical Questions (for later, not now)

- Mobile framework: React Native, Flutter, native?
- Backend language/framework
- Database (relational? document?)
- Hosting
- Realtime sync mechanism (websockets, Firestore-style, polling with optimistic UI)
- PDDikti integration: stable API or scraping?
- File storage for photos
- Auth (just two hardcoded accounts, or proper user table)
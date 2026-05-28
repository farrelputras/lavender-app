-- Phase 4: Main tables
-- All tables carry audit columns (created_at, updated_at, created_by, updated_by).
-- deleted_at (soft-delete) applies ONLY to users and vehicles.
-- The other four tables (rentals, charges, payments, hutang) are never deleted in v1.

-- ─── users ────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  nickname             TEXT,
  phone                TEXT NOT NULL,
  is_mahasiswa         BOOLEAN NOT NULL DEFAULT true,
  verified_at          TIMESTAMPTZ,
  verification_status  user_verification_status NOT NULL DEFAULT 'BELUM_DIVERIFIKASI',
  -- PDDikti fields (populated by v1.1 verify flow)
  nama_pddikti         TEXT,
  tahun_masuk          SMALLINT,
  universitas          TEXT,
  prodi                TEXT,
  -- Extra contact info per handoff data model
  alamat               TEXT,
  kontak_darurat       TEXT,
  notes                TEXT,
  -- Soft-delete
  deleted_at           TIMESTAMPTZ,
  -- Audit
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID REFERENCES auth.users,
  updated_by           UUID REFERENCES auth.users
);

-- ─── vehicles ─────────────────────────────────────────────────────────────────

CREATE TABLE vehicles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  plate       TEXT NOT NULL UNIQUE,
  category    vehicle_category NOT NULL,
  rate_6h     INTEGER NOT NULL,
  rate_12h    INTEGER NOT NULL,
  rate_24h    INTEGER NOT NULL,
  status      vehicle_status NOT NULL DEFAULT 'TERSEDIA',
  tahun       SMALLINT,
  warna       TEXT,
  notes       TEXT,
  -- Soft-delete
  deleted_at  TIMESTAMPTZ,
  -- Audit
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES auth.users,
  updated_by  UUID REFERENCES auth.users
);

-- ─── rentals ──────────────────────────────────────────────────────────────────
-- id is client-minted (crypto.randomUUID()) — no DEFAULT.
-- subtotal_sewa IS NULL while ACTIVE; always written at close.
-- tujuan is RESERVED for Phase 7 UI.

CREATE TABLE rentals (
  id               UUID PRIMARY KEY,  -- client-minted
  user_id          UUID NOT NULL REFERENCES users(id),
  vehicle_id       UUID NOT NULL REFERENCES vehicles(id),
  start_at         TIMESTAMPTZ NOT NULL,
  due_at           TIMESTAMPTZ NOT NULL,
  returned_at      TIMESTAMPTZ,
  status           rental_status NOT NULL DEFAULT 'ACTIVE',
  paket_hari       SMALLINT NOT NULL,
  paket_jam        SMALLINT NOT NULL CHECK (paket_jam IN (0, 6, 12)),
  tarif            INTEGER NOT NULL,
  subtotal_sewa    INTEGER,
  add_on           JSONB NOT NULL DEFAULT '{"description":"","amount":0}'::jsonb,
  jaminan          JSONB NOT NULL DEFAULT '{"items":[]}'::jsonb,
  kondisi_keluar   JSONB NOT NULL DEFAULT '{"bensinKotak":4,"km":null,"photos":[]}'::jsonb,
  kondisi_kembali  JSONB,
  discount         INTEGER NOT NULL DEFAULT 0,
  notes            TEXT NOT NULL DEFAULT '',
  tujuan           TEXT,
  -- Audit (no deleted_at on rentals)
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by       UUID REFERENCES auth.users,
  updated_by       UUID REFERENCES auth.users
);

-- ─── charges ──────────────────────────────────────────────────────────────────
-- Return-time line items. amount can be negative (fuel refund, etc.).

CREATE TABLE charges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id   UUID NOT NULL REFERENCES rentals(id),
  description TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  -- Audit (no deleted_at on charges)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES auth.users,
  updated_by  UUID REFERENCES auth.users
);

-- ─── payments ─────────────────────────────────────────────────────────────────
-- Polymorphic: belongs to exactly one of rental_id OR hutang_id (XOR constraint).
-- hutang_id FK is added after the hutang table is created below.

CREATE TABLE payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id          UUID REFERENCES rentals(id),
  hutang_id          UUID,  -- FK to hutang added via ALTER TABLE below
  amount             INTEGER NOT NULL,
  method             payment_method NOT NULL,
  method_description TEXT,
  paid_at            TIMESTAMPTZ NOT NULL,
  notes              TEXT,
  -- Audit (no deleted_at on payments)
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by         UUID REFERENCES auth.users,
  updated_by         UUID REFERENCES auth.users,
  CONSTRAINT payments_exactly_one_parent CHECK (
    (rental_id IS NOT NULL)::int + (hutang_id IS NOT NULL)::int = 1
  )
);

-- ─── hutang ───────────────────────────────────────────────────────────────────
-- rental_id is nullable — manual hutang has no rental.
-- status is NEVER written directly by the connector; maintained by trigger.

CREATE TABLE hutang (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id),
  rental_id    UUID REFERENCES rentals(id),  -- nullable for manual hutang
  jumlah_awal  INTEGER NOT NULL,
  status       hutang_status NOT NULL DEFAULT 'AKTIF',
  notes        TEXT,
  -- Audit (no deleted_at on hutang)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by   UUID REFERENCES auth.users,
  updated_by   UUID REFERENCES auth.users
);

-- Add hutang_id FK on payments now that hutang table exists
ALTER TABLE payments
  ADD CONSTRAINT payments_hutang_id_fk FOREIGN KEY (hutang_id) REFERENCES hutang(id);

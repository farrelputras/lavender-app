-- Phase 4: Enum types
-- All values are ALL_CAPS to match the connector contract.

CREATE TYPE user_verification_status AS ENUM (
  'BELUM_DIVERIFIKASI',
  'TERVERIFIKASI_PDDIKTI',
  'VERIFIKASI_GAGAL'
);

CREATE TYPE vehicle_category AS ENUM ('MOTOR', 'MOBIL');

CREATE TYPE vehicle_status AS ENUM (
  'TERSEDIA',
  'DISEWA',
  'MAINTENANCE',
  'TIDAK_AKTIF'
);

CREATE TYPE rental_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TYPE payment_method AS ENUM ('CASH', 'TRANSFER', 'QRIS', 'LAINNYA');

CREATE TYPE hutang_status AS ENUM ('AKTIF', 'LUNAS');

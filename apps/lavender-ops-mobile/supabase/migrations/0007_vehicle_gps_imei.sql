-- Phase 4 amendment: add GPS tracker phone number and IMEI to vehicles.
-- Stored as TEXT — both are identifiers, not numeric values.

ALTER TABLE vehicles
  ADD COLUMN gps  TEXT,
  ADD COLUMN imei TEXT;

-- Phase 4: app_config table
-- Stores mom/farrel auth UIDs so RLS policies can reference them by role name.
-- Two rows seeded in 0007_seed.sql. Rotation = one UPDATE, no app rebuild.

CREATE TABLE app_config (
  role        TEXT PRIMARY KEY,          -- 'mom' | 'farrel'
  user_id     UUID NOT NULL,             -- auth.users.id
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

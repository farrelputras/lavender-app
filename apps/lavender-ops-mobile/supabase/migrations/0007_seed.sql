-- Phase 4: Seed — vehicles only
-- Production starts with an empty users/rentals/hutang state.
-- Run this file AFTER creating the two auth accounts in Supabase dashboard
-- and filling in the app_config section at the bottom.
--
-- DO NOT run this file automatically — Farrel reviews and applies manually.

-- ─── Vehicles ─────────────────────────────────────────────────────────────────
-- Translated from seed.ts. All vehicles start TERSEDIA.

INSERT INTO vehicles (name, plate, category, rate_6h, rate_12h, rate_24h, status) VALUES
  ('Honda Beat',       'N 2314 ABB', 'MOTOR',  25000,   35000,   50000,  'TERSEDIA'),
  ('Honda Beat',       'N 2435 ABB', 'MOTOR',  25000,   35000,   50000,  'TERSEDIA'),
  ('Honda Beat',       'N 2625 CQ',  'MOTOR',  25000,   35000,   50000,  'TERSEDIA'),
  ('Honda Beat Street','N 2680 ACM', 'MOTOR',  30000,   40000,   60000,  'TERSEDIA'),
  ('Honda Beat',       'N 2867 TAM', 'MOTOR',  25000,   35000,   50000,  'TERSEDIA'),
  ('Yamaha Mio',       'B 1239 ABC', 'MOTOR',  32000,   52000,   82000,  'TERSEDIA'),
  ('Honda PCX',        'B 1240 ABC', 'MOTOR',  55000,   85000,  140000,  'TERSEDIA'),
  ('Honda ADV',        'B 1241 ABC', 'MOTOR',  60000,   95000,  150000,  'TERSEDIA'),
  ('Kawasaki W175',    'B 1242 ABC', 'MOTOR',  48000,   78000,  125000,  'TERSEDIA'),
  ('Yamaha FreeGo',    'B 1243 ABC', 'MOTOR',  38000,   62000,   98000,  'TERSEDIA'),
  ('Vespa S',          'B 1244 ABC', 'MOTOR',  65000,  105000,  160000,  'TERSEDIA'),
  ('Suzuki Burgman',   'B 1245 ABC', 'MOTOR',  52000,   82000,  135000,  'TERSEDIA'),
  ('Toyota Avanza',    'N 1111 GH',  'MOBIL', 150000,  220000,  350000,  'TERSEDIA'),
  ('Daihatsu Xenia',   'N 2222 IJ',  'MOBIL', 140000,  210000,  330000,  'TERSEDIA');

-- ─── app_config ───────────────────────────────────────────────────────────────
-- Steps:
--   1. Create both auth accounts in Supabase Auth dashboard
--      (mom@lavender.local, farrel@lavender.local)
--   2. Copy both UUIDs from the Auth > Users table
--   3. Uncomment and fill the INSERT below, then run this file

-- INSERT INTO app_config (role, user_id) VALUES
--   ('mom',    '<paste-mom-uuid-here>'),
--   ('farrel', '<paste-farrel-uuid-here>');

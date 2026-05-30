-- Phase 4: Seed — vehicles only
-- Production starts with an empty users/rentals/hutang state.
-- Run this file AFTER creating the two auth accounts in Supabase dashboard
-- and filling in the app_config section at the bottom.
--
-- DO NOT run this file automatically — Farrel reviews and applies manually.

-- ─── Vehicles ─────────────────────────────────────────────────────────────────
-- Translated from seed.ts. All vehicles start TERSEDIA.

-- Honda Beat (2022, SULISTIONO): excluded — no plate number available, insert manually.
-- GPS = tracker phone number (raw, no dashes). IMEI = raw 15-digit number.

INSERT INTO vehicles (name, plate, category, rate_6h, rate_12h, rate_24h, status, tahun, gps, imei) VALUES
  -- ── Mobil ─────────────────────────────────────────────────────────────────
  ('Avanza',            'N 1604 AU',  'MOBIL', 250000, 250000, 300000, 'TERSEDIA', 2014, '081252193716', '358735070310080'),
  ('Calya',             'N 1293 CT',  'MOBIL', 250000, 250000, 300000, 'TERSEDIA', 2017, '085806381485', '351608082256178'),
  ('Ertiga',            'N 1391 AW',  'MOBIL', 250000, 250000, 300000, 'TIDAK_AKTIF', 2012, '082131452267', '358735070380588'),
  ('Evalia',            'N 1668 AY',  'MOBIL', 250000, 250000, 300000, 'TIDAK_AKTIF', 2012, '081252193731', '358735070209928'),
  -- ── Motor ─────────────────────────────────────────────────────────────────
  ('Honda Beat',        'N 2314 ABB', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2016, '081230666727', '862292051415909'),
  ('Honda Beat',        'N 2435 ABB', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2016, '081252193715', '358735070406953'),
  ('Honda Beat',        'N 2625 CQ',  'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2021, '081357385436', '865784051368549'),
  ('Honda Beat Street', 'N 2680 ACM', 'MOTOR',  30000,  40000,  60000, 'TERSEDIA', 2022, '081252439103', '862292051262236'),
  ('Honda Beat',        'N 2967 KL',  'MOTOR',  25000,  35000,  50000, 'TERSEDIA', NULL, NULL,           NULL),
  ('Honda Beat',        'N 3049 ABU', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2016, '082228245374', '358735070329197'),
  ('Honda Beat Street', 'N 3051 ACZ', 'MOTOR',  30000,  40000,  60000, 'TERSEDIA', 2024, NULL,           '862292053769139'),
  ('Honda Beat Street', 'N 3052 ACZ', 'MOTOR',  30000,  40000,  60000, 'TERSEDIA', 2024, '082229358058', '358735070410393'),
  ('Honda Beat Street', 'N 3127 ACG', 'MOTOR',  30000,  40000,  60000, 'TERSEDIA', 2022, '081358952588', '865784052395210'),
  ('Honda Vario',       'N 3512 ABU', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2016, '081331548119', '358735070200919'),
  ('Honda Beat',        'N 4369 ABS', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2019, '082231673675', '862292053190088'),
  ('Honda Beat',        'N 4845 ABS', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2019, '081252193688', '358735070386346'),
  ('Honda Beat',        'N 4920 BAT', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2020, '081216074148', '358735070382162'),
  ('Honda Beat',        'N 4988 ABH', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2017, '082228245402', '358735070382170'),
  ('Honda Beat',        'N 4991 ABH', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2017, '081252193695', '358735070455604'),
  ('Honda Beat Street', 'N 5601 ACA', 'MOTOR',  30000,  40000,  60000, 'TERSEDIA', 2021, '081259725915', '353701098708353'),
  ('Honda Beat',        'N 5626 BAX', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2015, '082228245426', '358735070312599'),
  ('Honda Beat',        'N 5791 ABD', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2017, '081216677075', '862292051328334'),
  ('Honda Beat',        'N 5792 ABD', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2017, '082228245406', '358735070407027'),
  ('Honda Vario 160',   'N 6717 ACT', 'MOTOR',  0,  0,  80000, 'TERSEDIA', 2022, '081235883572', '862292051278737'),
  ('Honda Beat',        'N 6755 BAC', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2019, '081252193713', '358735070322374'),
  ('Honda Beat',        'N 6756 BAC', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2019, '081331489092', '358735070391908'),
  ('Yamaha Gear',       'N 6898 ACB', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2021, '081216775973', '865784051419946'),
  ('Yamaha Gear',       'N 6901 ACB', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2021, '081252609989', '865784051427014'),
  ('Honda Beat',        'N 6968 CCC', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2013, '082228245320', '358735070283154'),
  ('Honda Beat',        'W 5259 NCY', 'MOTOR',  25000,  35000,  50000, 'TERSEDIA', 2017, '085732405183', '358735070207658');

-- ─── app_config ───────────────────────────────────────────────────────────────
-- Steps:
--   1. Create both auth accounts in Supabase Auth dashboard
--      (mom@lavender.local, farrel@lavender.local)
--   2. Copy both UUIDs from the Auth > Users table
--   3. Uncomment and fill the INSERT below, then run this file

-- INSERT INTO app_config (role, user_id) VALUES
--   ('ops',   '<paste-mom-uuid-here>'),
--   ('admin', '<paste-farrel-uuid-here>');

# LAVENDER — Handoff untuk Sesi Coding (Demo Validasi Alur)

> Dokumen ini khusus untuk sesi **Claude Code**. Tujuannya membangun **demo yang bisa dipakai untuk validasi alur** ke pemilik bisnis (Mama) — bukan aplikasi produksi. Untuk konteks produk lengkap (semua keputusan bisnis, prinsip desain, data model penuh), lihat handoff produk terpisah.

---

## 1. Tujuan sesi ini

Membangun **demo loop yang berjalan** supaya Mama bisa melihat dan merasakan cara kerja aplikasi, lalu memberi feedback. Fokus pada **alur**, bukan kelengkapan fitur. Data boleh palsu/seed; yang penting alurnya nyambung ujung ke ujung.

**Definisi "selesai" untuk sesi ini:** Mama bisa membuka app → membuat penyewaan → melihat sewa aktif → memproses pengembalian → melihat hasil akhirnya (termasuk hutang yang otomatis tercipta bila ada sisa).

**Bukan tujuan sesi ini:** koneksi backend, autentikasi, penyimpanan permanen, sinkronisasi realtime. Itu fase berikutnya (lihat bagian 7).

---

## 2. Stack

Pemilik repo sudah mem-bootstrap project dengan **React Native + Expo (managed workflow)**, **TypeScript**.

Keputusan stack penuh (sudah final, jangan dibahas ulang di sesi ini):
- Mobile: React Native via Expo
- Bahasa: TypeScript di semua tempat
- Backend (fase berikutnya): Supabase — Postgres, Auth, Storage, Realtime, Edge Functions
- Web admin (jauh ke depan): Vite + React
- Shared code (ke depan): package TypeScript untuk types, validasi, dan business logic, dipakai bersama oleh mobile + web
- Distribusi: APK via EAS Build, sideload ke HP Mama/Farrel (tanpa Play Store)
- Update: Expo Updates (OTA) untuk perubahan JS, rebuild APK sesekali untuk perubahan native

Untuk sesi demo ini: cukup berjalan di Expo Go / simulator. Belum perlu menyentuh Supabase, EAS, atau auth.

---

## 3. Prinsip arsitektur untuk sesi ini: "lapisan data / konektor"

Ini keputusan paling penting di dokumen ini. Demo memakai data **in-memory**, tetapi ditulis sedemikian rupa sehingga nanti **cukup ganti "konektor"-nya** untuk terhubung ke Supabase — tanpa menulis ulang UI.

Aturan main:

1. **UI tidak pernah menyentuh data mentah.** Tidak ada array data di dalam komponen layar. Semua baca/tulis lewat satu lapisan data (fungsi seperti `getUsers()`, `getVehicles()`, `createRental(input)`, `getRental(id)`, `closeRental(id, payload)`, `getHutangByRental(rentalId)`).

2. **Kontrak fungsi dikunci, implementasi bebas berubah.** Tentukan nama, parameter, dan tipe kembalian fungsi-fungsi konektor dari awal. UI hanya boleh tahu kontrak ini. Saat pindah ke Supabase, isi fungsinya berubah, tanda tangannya tidak.

3. **Semua fungsi konektor `async` (mengembalikan `Promise`) sejak sekarang** — walaupun versi in-memory bisa mengembalikan data seketika. Supabase pasti async; kalau versi in-memory dibuat sinkron, seluruh UI pemanggil harus diubah jadi `await` saat migrasi (persis "menulis ulang UI" yang ingin dihindari). Jadi: konektor in-memory pun mengembalikan `Promise`.

4. **Tipe data milik UI sendiri, bukan bentuk baris Supabase.** Definisikan tipe TypeScript sendiri sesuai kebutuhan layar (camelCase). Jangan biarkan bentuk row Postgres (snake_case) bocor ke UI lebih awal. Konektor yang nanti menerjemahkan row Supabase ↔ tipe UI. Tipe-tipe ini kandidat kuat untuk dipindah ke shared package di masa depan.

Hasil yang diinginkan: setelah Mama meng-ACC alur, mengganti backend = mengubah isi lapisan konektor saja.

---

## 4. Layar yang dibangun: "demo loop"

Lima **simpul** alur, tetapi **delapan file layar** (karena "Sewa Baru" terdiri dari beberapa sub-layar). Semua sudah didesain di Stitch — tugas sesi ini mengubahnya jadi layar React Native yang berfungsi dan saling terhubung.

### Kategorisasi file Stitch (8 file)

| # | Nama layar (file Stitch) | Simpul loop | Status desain |
|---|---|---|---|
| 1 | Beranda | Beranda | Selesai (catatan: label nav "Sewa Aktif" → "Penyewaan") |
| 2 | Sewa Baru — Pilih User | Sewa Baru (langkah 1) | Selesai |
| 3 | Sewa Baru — Pilih Kendaraan | Sewa Baru (langkah 2) | Selesai |
| 4 | Sewa Baru — Detail Sewa | Sewa Baru (langkah 3) | Selesai (termasuk Bensin/KM, Add-on) |
| 5 | Tambah Pembayaran (bottom sheet) | dipakai ulang | Selesai (dipakai di Detail Sewa & Pengembalian) |
| 6 | Detail Penyewaan — status Aktif | Detail Aktif | Selesai (termasuk Bensin/KM keluar) |
| 7 | Proses Pengembalian | Pengembalian | Selesai (kondisi kembali, rincian biaya, saran bensin, jaminan) |
| 8 | Detail Penyewaan — status Selesai | Detail Selesai | Selesai (read-only, historis Bensin/KM, hutang terkait) |

### Alur loop (urutan navigasi)

```
Beranda
  → Sewa Baru: Pilih User → Pilih Kendaraan → Detail Sewa
      (Tambah Pembayaran bottom sheet dipakai di Detail Sewa)
  → [Simpan] → Detail Penyewaan (Aktif)
  → [Proses Pengembalian] → Proses Pengembalian
      (Tambah Pembayaran bottom sheet dipakai di sini juga)
  → [Selesaikan] → Detail Penyewaan (Selesai)
  → kembali ke Beranda / daftar
```

Catatan: "Tambah Pembayaran" adalah bottom sheet yang dipakai ulang (reusable component), bukan layar penuh — dipanggil dari dua tempat (Detail Sewa dan Proses Pengembalian).

---

## 5. Di-fake / di-seed & yang dilewati

### Di-seed (hardcode sebagai data awal di lapisan konektor)
- **User & Kendaraan**: sediakan beberapa contoh. Mama tidak perlu menambah user/kendaraan di demo — cukup bisa menyewakan dari daftar yang ada.

### Ditampilkan tapa adanya, tanpa layar khusus
- **Hutang**: tidak ada tab/layar Hutang fungsional. Hutang yang tercipta saat pengembalian (sisa > 0) cukup tampil sebagai info di Detail Penyewaan (Selesai). Belum perlu pencatatan cicilan.
- **Foto**: boleh placeholder/stub. Tidak perlu kamera/upload sungguhan untuk demo.

### Dilewati total (tidak ada di scope sesi ini)
- Tab navigasi **User**, **Hutang** (sebagai layar fungsional), dan list **Penyewaan** dengan filter
- **User Registration** + UX **PDDikti**
- **Vehicle management** (list/detail/add/edit)
- **Auth/login**
- **Realtime sync** antar dua HP
- **Audit trail**

---

## 6. Logika perhitungan yang tidak boleh salah

Ini inti yang membuat demo terasa benar. Implementasikan persis.

**Durasi & paket sewa**
- Sumber kebenaran durasi = rentang datetime (Waktu Sewa). Paket (Hari/Jam) diturunkan darinya; bila bertentangan karena edit manual, datetime yang menang.
- Periode dasar: 6 jam, 12 jam, 24 jam, dan kelipatan 24 jam untuk multi-hari.
- Selektor: stepper "Hari" + segmented "Jam" (0/6/12). Contoh: 6 jam = 0 Hari + 6 Jam; 1,5 hari = 1 Hari + 12 Jam.

**Tarif & total saat penyewaan**
- Tiap kendaraan punya 3 tarif: 6h, 12h, 24h.
- Subtotal = tarif × durasi berbasis matematika (mis. 1 Hari 12 Jam = tarif 24h + tarif 12h).
- Tarif bisa diedit per penyewaan (silent edit, dengan hint "Tarif default: Rp X" bila berubah).
- Add-on: satu entri gabungan (deskripsi + jumlah), masuk ke total.
- Diskon: line item terpisah.
- Total = Tarif + Add-on − Diskon. Urutan baris: Tarif → Add-on → Diskon → Total.

**Pengembalian — rincian biaya**
- "Subtotal Sewa" adalah tuas utama: ter-prefill dari perhitungan tarif tetapi **bebas diedit** (Mama biasanya langsung menembak harga akhir).
- **Saran bensin (satu arah ke subtotal, bukan baris terpisah):**
  - Hitung selisih = bensin_kembali − bensin_keluar (satuan "kotak").
  - Nilai penyesuaian = selisih × harga_per_kotak. `harga_per_kotak` default Rp 5.000 tetapi **editable per pengembalian** (mis. naik ke Rp 6.000).
  - Bensin LEBIH (selisih positif) → saran KURANGI tarif (hijau).
  - Bensin KURANG (selisih negatif) → saran TAMBAH tarif (amber).
  - Bensin sama → tidak ada saran.
  - Saran ditampilkan sebagai baris tersendiri dengan ikon + tombol terisi "Terapкан" (Opsi B). Menekan tombol mengubah nilai Subtotal Sewa; Mama tetap bisa mengetik nilai lain setelahnya. Saran tidak pernah mengubah subtotal secara otomatis.
- Tidak ada baris otomatis "Denda Telat" maupun "Bensin Kurang" terpisah. Keterlambatan hanya muncul sebagai caption amber informatif ("Terlambat X jam") — Mama yang memutuskan, biasanya dilipat ke subtotal.
- Boleh menambah line item bebas via "+ Tambah Biaya" (deskripsi + jumlah) dan baris "Diskon" (pengurang).
- "Total Tagihan" = jumlah semua baris, dihitung live.

**Pembayaran (model terpadu, dipakai rental & hutang)**
- Field: Jumlah (wajib), Metode (Cash/Transfer/QRIS/Lainnya, wajib), Tanggal (hanya tanggal, default hari ini), Catatan (opsional). Jika Metode = Lainnya, muncul field deskripsi.
- Mendukung pembayaran sebagian (cicilan).
- "Sisa" = Total Tagihan − Σ pembayaran.

**Penutupan & jaminan (konsekuensi)**
- Saat pengembalian disimpan: status rental → Selesai.
- Jika Sisa = 0 → jaminan bisa dikembalikan (hijau).
- Jika Sisa > 0 → buat record Hutang otomatis (terhubung ke rental), jaminan ditahan (amber).
- Tombol simpan berubah label: "Selesaikan Pengembalian" (sisa 0) vs "Selesaikan & Buat Hutang" (sisa > 0). Setelah simpan → arahkan ke Detail Penyewaan (Selesai).

**Bensin & KM (kondisi kendaraan)**
- Bensin: integer "kotak" via stepper + fuel-gauge bar. Dicatat saat keluar (Detail Sewa) dan saat kembali (Pengembalian).
- KM: opsional, boleh dikosongkan. Dicatat saat keluar & kembali.
- Detail Penyewaan (Selesai) menampilkan historis keduanya: Keluar → Kembali.

---

## 7. Setelah Mama ACC alur (fase berikutnya — JANGAN dikerjakan di sesi ini)

- Ganti isi lapisan konektor dari in-memory ke Supabase (kontrak fungsi & tipe UI tetap).
- Formalkan skema Postgres + RLS.
- Auth (akun Mama & Farrel).
- Storage untuk foto.
- Realtime sync.
- Pindahkan types/validasi/business-logic ke shared TypeScript package.
- EAS Build → APK sideload.

Alasan urutan ini: feedback Mama kemungkinan mengubah alur/field. Membangun Supabase sebelum alur tervalidasi berisiko menulis ulang skema, migrasi, dan logika. Validasi murah dulu, baru bayar yang mahal.

---

## 8. Cara memulai sesi Claude Code

Paste ringkasan ini di awal, lampirkan dokumen ini + file referensi Stitch per layar (8 file, lihat tabel bagian 4):

> Aku membangun demo mobile "LAVENDER" (React Native + Expo, TypeScript) untuk validasi alur ke pemilik bisnis. Repo sudah di-bootstrap. Scope, prinsip arsitektur "konektor" in-memory, daftar 8 layar, dan logika perhitungan ada di handoff terlampir; mockup tiap layar ada di file Stitch terlampir. Mulai dengan [SPECIFY: mis. mendefinisikan tipe + kontrak lapisan konektor, atau membangun layar Beranda].

---

## Lampiran — adjustment kecil yang sudah disepakati di desain
- Label bottom nav Beranda: "Sewa Aktif" → "Penyewaan" (metrik kartu "Sewa Aktif: 12" tetap).
- Post-Simpan Penyewaan: toast + redirect ke Detail Penyewaan (Aktif).
- Detail Penyewaan (Selesai): baris "Estimasi Kembali" dihapus; "Kembali Aktual" → "Kembali".
# SIM Aparat Desa PWA (ApkDesa)
### Sistem Informasi Administrasi Kependudukan, Bansos & Layanan Surat Digital Berbasis PWA & Supabase

![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-teal?style=for-the-badge&logo=pwa)
![Vite React](https://img.shields.io/badge/Vite-React%2018-blue?style=for-the-badge&logo=react)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS%203-38bdf8?style=for-the-badge&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ecf8e?style=for-the-badge&logo=supabase)

Aplikasi Progressive Web App (PWA) modern, mobile-first, dan offline-ready yang dirancang khusus untuk aparat desa (Kepala Desa/Sekdes/Admin, Kepala Dusun, Ketua RW, dan Ketua RT). Mengadopsi User Experience (UX) Tabulasi Bawah ala aplikasi native (Shopee style), sistem pengamanan data hirarkis via Row-Level Security (RLS) PostgreSQL, serta generator Surat Pengantar Digital 1-klik berformat PDF resmi.

---

## Fitur Utama

### 1. Hak Akses & Isolasi Wilayah
Setiap aparat masuk dengan PIN unik yang diverifikasi server lalu mendapat sesi Supabase Auth. Profil dipasangkan dengan UUID user Auth, sedangkan pembatasan data ditegakkan di PostgreSQL RLS:
- **Admin Desa**: Akses penuh (CRUD data warga, import/export Excel, pencatatan mutasi, kelola program & penyaluran bansos).
- **Kepala Dusun (Kadus)**: Akses *read-only* seluruh warga di wilayah dusunnya.
- **Ketua RW**: Akses *read-only* seluruh warga di wilayah RW yang dipimpinnya.
- **Ketua RT**: Akses *read-only* warga di lingkungan RT-nya saja.

### 2. Generator Surat Pengantar Digital (1-Klik Unduh PDF)
- Terintegrasi generator PDF langsung di sisi klien (`jspdf`).
- Dilengkapi Kop Surat Resmi Desa, Garis Ganda, Nomor Surat Otomatis, Biodata Lengkap Pemohon, dan Tempat Tanda Tangan Pengurus RT/RW/Desa.
- Pilihan surat:
  - *Surat Pengantar Domisili*
  - *Surat Keterangan Tidak Mampu (SKTM)*
  - *Surat Pengantar Keterangan Usaha (SKU)*
  - *Surat Pengantar Catatan Kepolisian (SKCK)*
  - *Surat Pengantar Pembuatan KTP / Kartu Keluarga*
  - *Surat Keterangan Kehilangan Dokumen*

### 3. PWA & Cache Offline Terbatas
- Menggunakan `vite-plugin-pwa` dengan `registerType: 'autoUpdate'`.
- Service worker hanya menyimpan application shell; API Supabase dan respons berisi data pribadi tidak disimpan Workbox.
- Data offline yang memang sudah dimuat disimpan lokal per akun dan difilter lagi sesuai wilayah pada profil terakhir.

### 4. Import & Export Excel (Khusus Admin)
- Export data master kependudukan ke format spreadsheet `.xlsx` (`xlsx` library).
- Import data massal dari file Excel dengan validasi kolom NIK & No KK.
- Tombol unduh Template Excel standar desa.

### 5. Pencatatan Mutasi Kependudukan (Khusus Admin)
- Pencatatan peristiwa: Kelahiran, Kematian, Pindah Datang, dan Pindah Keluar.
- Otomatis memperbarui status kependudukan warga di basis data.

### 6. Monitoring & Flagging Bansos
- Flagging anomali warga berstatus ekonomi **Miskin (Prasejahtera)** yang belum menerima bantuan sosial untuk verifikasi prioritas.
- Katalog program bansos aktif (BLT Dana Desa, PKH, BPNT).
- Rekam jejak penerima bantuan sosial.

---

## Panduan Instalasi & Menjalankan Aplikasi

### Prasyarat
- Node.js versi 18 ke atas
- npm atau yarn

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/saunglaptop99/PWA-apkdesa.git
cd PWA-apkdesa
npm install
```

### 2. Konfigurasi Lingkungan (`.env`)
Pastikan file `.env` telah terisi kredensial Supabase:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

### 3. Inisialisasi Database Supabase
Buka **Supabase SQL Editor** pada project Supabase Anda. Untuk database baru maupun peningkatan dari skema lama, jalankan skrip berikut berurutan. Jalankan `migration_marital_event_enum.sql` sebagai skrip tersendiri sebelum migration peristiwa agar nilai enum baru sudah tersedia:

1. `supabase/schema.sql`
2. `supabase/migration_marital_event_enum.sql`
3. `supabase/migration_marital_events.sql`
4. `supabase/migration_secure_auth_and_rls.sql`
5. `supabase/migration_pin_auth.sql`
6. `supabase/migration_surat_layanan.sql`
7. `supabase/migration_security_audit.sql`

Jika tabel warga berasal dari versi yang sangat lama, `schema.sql` menambahkan kolom yang hilang melalui `ADD COLUMN IF NOT EXISTS`; `migration_add_demographics.sql` tersedia sebagai migrasi tambahan untuk deployment lama.

Skrip ini akan menginisialisasi:
- Enum types (`user_role`, `status_warga`, `ekonomi_warga`, `jenis_mutasi`)
- Tabel `profiles`, `warga`, `mutasi_kependudukan`, `bantuan_sosial`, dan `penerima_bansos`
- Definisi tabel dan trigger mutasi
- Migration RLS yang membatasi warga berdasarkan role/wilayah dan membatasi perubahan ke admin
- Helper function `get_my_profile()`
- Trigger otomatisasi mutasi status warga
- Tidak ada akun atau data warga demo yang di-seed

### 4. Menjalankan di Server Lokal
```bash
npm run dev
```
Akses aplikasi melalui browser di `http://localhost:5173`.

### 5. Build Produksi PWA
```bash
npm run build
npm run preview
```

---

## Menyiapkan login PIN dan akun aparat

Login PIN menggunakan Supabase Edge Functions. PIN tidak pernah disimpan di browser atau dikirim langsung ke tabel profil. Server mengubah PIN menjadi HMAC dengan `PIN_PEPPER`, mewajibkan PIN unik, membatasi percobaan per alamat IP, lalu membuat sesi Supabase Auth. Buat `PIN_PEPPER` acak minimal 32 karakter (disarankan 64 karakter acak) dan jangan taruh di `.env` frontend.

1. Pastikan urutan inisialisasi pada bagian sebelumnya sudah diterapkan, termasuk `migration_pin_auth.sql`.
2. Pasang Supabase CLI dan hubungkan folder ini ke project Supabase.
3. Set secret server dan deploy functions:

```bash
supabase secrets set PIN_PEPPER="nilai-acak-rahasia-minimal-32-karakter" BOOTSTRAP_SECRET="nilai-bootstrap-acak-sekali-pakai"
supabase functions deploy pin-login --no-verify-jwt
supabase functions deploy manage-aparat
supabase functions deploy bootstrap-admin --no-verify-jwt
```

4. Buat admin pertama menggunakan endpoint `bootstrap-admin` satu kali. Kirim `POST` ke `https://<project-ref>.supabase.co/functions/v1/bootstrap-admin` dengan header `apikey: <anon-key>` dan body JSON `{"bootstrap_secret":"<BOOTSTRAP_SECRET>","nama_lengkap":"Admin Desa","pin":"PIN6ANGKA"}`. Simpan PIN dengan aman dan sampaikan langsung kepada admin. Untuk admin yang sudah ada, sertakan `user_id` admin tersebut; endpoint hanya dapat mengisi PIN jika belum ada kredensial PIN.
5. Setelah bootstrap berhasil, segera hapus rahasia bootstrap (`supabase secrets unset BOOTSTRAP_SECRET`) dan hapus/nonaktifkan function `bootstrap-admin` dari project. Ini mencegah endpoint bootstrap dipakai lagi.
6. Admin masuk memakai PIN, lalu membuka **Pengaturan → Tambah Aparat**. Isi role, dusun/RW/RT sesuai tugas, dan PIN awal unik. PIN aparat dapat diganti dari form edit dengan mengisi PIN baru. Saat reset, PIN lama tidak bisa dilihat; admin menetapkan PIN baru dan menyampaikannya langsung kepada aparat.

### Lupa PIN dan pengamanan sesi

- Aparat yang lupa PIN meminta admin menggantinya dari **Pengaturan → Aparat → Edit → Reset PIN**. Aplikasi meminta konfirmasi sebelum menyimpan dan mencatat tindakan pada tab **Aktivitas**.
- PIN admin yang terlupa harus dipulihkan oleh pengelola project Supabase melalui akses server tepercaya. Jangan membuat endpoint pemulihan PIN publik atau membagikan `PIN_PEPPER`, service-role key, maupun PIN melalui chat umum.
- Semua role otomatis keluar dari sesi di browser setelah 30 menit tanpa aktivitas atau setelah 12 jam sejak sesi dimulai. Batas ini diterapkan di sisi aplikasi/browser; ini bukan pencabutan paksa token pada perangkat lain.
- Tab **Aktivitas** hanya dapat dibaca admin. Audit database menyimpan aktor, jenis aksi, tabel/record, dan nama kolom yang berubah; nilainya (termasuk NIK dan PIN) tidak disimpan dalam audit.
- Percobaan PIN sudah dibatasi server-side dan PIN disimpan sebagai HMAC. Pastikan `PIN_PEPPER` tetap rahasia dan stabil; menggantinya tanpa rencana migrasi akan membuat PIN lama tidak cocok.

Profil lama dari skema sebelumnya perlu ditautkan ke user Auth yang sesuai sebelum dipakai. Jika akun admin lama sudah ada, gunakan `user_id` profil admin saat bootstrap untuk mendaftarkan PIN pertama. Setelah admin masuk, isi master wilayah di panel admin sebelum membuat akun aparat wilayah atau data warga.

RLS membatasi hasil baca warga berdasarkan wilayah pada profil server: RT hanya RT yang ditugaskan, RW seluruh RT di RW tersebut, kepala dusun seluruh wilayah dusunnya, dan admin seluruh desa. Filter di halaman hanya untuk kemudahan; database tetap menjadi penjaga akses. Perubahan role/wilayah di profil berlaku pada query berikutnya.

Jika database sebelumnya sudah diinisialisasi, baris contoh warga/profil/wilayah/pengaturan yang pernah di-seed tetap berada di database lama. Periksa dan hapus hanya setelah memastikan baris tersebut memang data uji; migration keamanan sengaja tidak menghapus data lama.

---

## Lisensi & Kontributor
Dikembangkan untuk modernisasi administrasi pemerintahan desa di seluruh Indonesia.

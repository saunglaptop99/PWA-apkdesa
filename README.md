# SIM Aparat Desa PWA (ApkDesa)
### Sistem Informasi Administrasi Kependudukan, Bansos & Layanan Surat Digital Berbasis PWA & Supabase

![PWA Ready](https://img.shields.io/badge/PWA-Offline%20Ready-teal?style=for-the-badge&logo=pwa)
![Vite React](https://img.shields.io/badge/Vite-React%2018-blue?style=for-the-badge&logo=react)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS%203-38bdf8?style=for-the-badge&logo=tailwindcss)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20RLS-3ecf8e?style=for-the-badge&logo=supabase)

Aplikasi Progressive Web App (PWA) modern, mobile-first, dan offline-ready yang dirancang khusus untuk aparat desa (Kepala Desa/Sekdes/Admin, Kepala Dusun, Ketua RW, dan Ketua RT). Mengadopsi User Experience (UX) Tabulasi Bawah ala aplikasi native (Shopee style), sistem pengamanan data hirarkis via Row-Level Security (RLS) PostgreSQL, serta generator Surat Pengantar Digital 1-klik berformat PDF resmi.

---

## Fitur Utama

### 1. Pembatasan Hak Akses & Isolasi Wilayah (Row-Level Security)
Data warga diisolasi secara ketat sehingga aparat hanya dapat melihat data sesuai wilayah kewenangannya:
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

### 3. PWA & Offline Caching (Service Worker)
- Menggunakan `vite-plugin-pwa` dengan `registerType: 'autoUpdate'`.
- Workbox runtime caching untuk API Supabase (`NetworkFirst` dengan masa simpan cache 3 hari).
- Indikator status jaringan real-time (Online / Offline). Saat aparat berada di area blank spot tanpa sinyal internet, data kependudukan yang sudah dibuka tetap dapat diakses dan surat tetap dapat digenerate.

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
VITE_SUPABASE_URL=https://sylnxlenycyulkwrlxqm.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_HCJ40TwFkNjo3pHPrQjYsA_BX2-wAFX
```

### 3. Inisialisasi Database Supabase
Buka **Supabase SQL Editor** pada project Supabase Anda, lalu salin dan jalankan seluruh isi skrip SQL dari file:
[`supabase/schema.sql`](./supabase/schema.sql)

Skrip ini akan menginisialisasi:
- Enum types (`user_role`, `status_warga`, `ekonomi_warga`, `jenis_mutasi`)
- Tabel `profiles`, `warga`, `mutasi_kependudukan`, `bantuan_sosial`, dan `penerima_bansos`
- Aturan Row-Level Security (RLS) lengkap
- Helper function `get_my_profile()`
- Trigger otomatisasi mutasi status warga
- Data benih awal (seed data)

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

## Akun Demo & Simulasi Peran (Role Switcher)
Pada halaman Login dan Profil telah disediakan **Fitur Uji Coba Cepat (Simulator Role)** sehingga Anda dapat langsung merasakan isolasi data warga antar peran:
- **Admin**: `admin@desa.id` (Akses semua data warga, mutasi, bansos, dan import/export)
- **Kepala Dusun**: `kadus1@desa.id` (Dusun Sukamaju)
- **Ketua RW**: `rw01@desa.id` (RW 01 Dusun Sukamaju)
- **Ketua RT**: `rt01@desa.id` (RT 01 / RW 01 Dusun Sukamaju)

---

## Lisensi & Kontributor
Dikembangkan untuk modernisasi administrasi pemerintahan desa di seluruh Indonesia.

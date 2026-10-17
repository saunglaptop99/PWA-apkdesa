-- ==============================================================================
-- SQL MIGRATION: PENAMBAHAN LENGKAP KOLOM IDENTITAS, KELUARGA, PENDIDIKAN,
-- EKONOMI, DOMISILI & KONDISI KHUSUS / STUNTING KE TABEL WARGA
-- Jalankan skrip ini sekali di Supabase SQL Editor:
-- https://supabase.com/dashboard/project/sylnxlenycyulkwrlxqm/sql
-- ==============================================================================

-- 1. Identitas Dasar & Dokumen
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS golongan_darah VARCHAR(5) DEFAULT 'O';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS no_akta_lahir TEXT;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS status_ktp TEXT DEFAULT 'Sudah KTP-el';

-- 2. Hubungan & Status Keluarga
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS status_perkawinan TEXT DEFAULT 'Kawin';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS no_akta_nikah_cerai TEXT;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS nama_ayah TEXT;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS nama_ibu TEXT;

-- 3. Pendidikan, Pekerjaan & Ekonomi
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS pendidikan_terakhir TEXT DEFAULT 'SMA/SMK/Sederajat';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS status_sekolah TEXT DEFAULT 'Tidak / Sudah Lulus';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS rentang_penghasilan TEXT DEFAULT 'Rp 1.000.000 - Rp 2.500.000';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS bansos_pkh BOOLEAN DEFAULT false;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS bansos_bpnt BOOLEAN DEFAULT false;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS bansos_blt_desa BOOLEAN DEFAULT false;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS bpjs_pbi BOOLEAN DEFAULT false;

-- 4. Lokasi & Alamat Domisili
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS status_tempat_tinggal TEXT DEFAULT 'Milik Sendiri';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS telepon TEXT;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS status_domisili TEXT DEFAULT 'Penduduk Tetap';

-- 5. Kondisi Khusus & Kerentanan (Posyandu & Stunting)
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS is_disabilitas BOOLEAN DEFAULT false;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS jenis_disabilitas TEXT DEFAULT 'Tidak Ada';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS penyakit_kronis TEXT DEFAULT 'Tidak Ada';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS status_kesehatan_khusus TEXT DEFAULT 'Normal';

-- Beritahu Supabase schema cache agar segera mendeteksi kolom baru
NOTIFY pgrst, 'reload schema';

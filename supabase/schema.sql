-- ==============================================================================
-- SISTEM INFORMASI KEPENDUDUKAN & APARAT DESA (SIM APARAT DESA PWA)
-- SUPABASE DATABASE INITIALIZATION SCHEMA, RLS POLICIES & REALTIME
-- ==============================================================================

-- 1. ENUMS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'dusun', 'rw', 'rt');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_warga') THEN
        CREATE TYPE status_warga AS ENUM ('aktif', 'meninggal', 'pindah');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ekonomi_warga') THEN
        CREATE TYPE ekonomi_warga AS ENUM ('mampu', 'rentan', 'miskin');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'jenis_mutasi') THEN
        CREATE TYPE jenis_mutasi AS ENUM ('kelahiran', 'kematian', 'pindah_datang', 'pindah_keluar', 'pindah_dalam_desa', 'menikah', 'bercerai');
    END IF;
END $$;

-- 2. TABEL PENGATURAN DESA (Nama Desa, Kepala Desa, dsb.)
CREATE TABLE IF NOT EXISTS public.pengaturan_desa (
    id INT PRIMARY KEY DEFAULT 1,
    nama_desa TEXT NOT NULL DEFAULT '',
    nama_kecamatan TEXT DEFAULT '',
    nama_kabupaten TEXT DEFAULT '',
    nama_kepala_desa TEXT NOT NULL DEFAULT '',
    alamat_kantor TEXT DEFAULT '',
    kontak_desa TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.pengaturan_desa ALTER COLUMN nama_desa SET DEFAULT '';
ALTER TABLE public.pengaturan_desa ALTER COLUMN nama_kecamatan SET DEFAULT '';
ALTER TABLE public.pengaturan_desa ALTER COLUMN nama_kabupaten SET DEFAULT '';
ALTER TABLE public.pengaturan_desa ALTER COLUMN nama_kepala_desa SET DEFAULT '';
ALTER TABLE public.pengaturan_desa ALTER COLUMN alamat_kantor SET DEFAULT '';
ALTER TABLE public.pengaturan_desa ALTER COLUMN kontak_desa SET DEFAULT '';

-- 3. TABEL MASTER WILAYAH DESA (Dusun, RW, RT untuk Dropdown Otomatis)
CREATE TABLE IF NOT EXISTS public.wilayah_desa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dusun TEXT NOT NULL,
    rw VARCHAR(4) NOT NULL,
    rt VARCHAR(4) NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(dusun, rw, rt)
);

-- 4. TABEL PROFIL PENGGUNA & APARAT DESA (ditautkan ke Supabase Auth melalui user_id)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    username TEXT,
    nama_lengkap TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'rt',
    jabatan TEXT,
    telepon TEXT,
    wilayah_dusun TEXT,
    wilayah_rw TEXT,
    wilayah_rt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan semua kolom baru & constraint terpasang meski tabel profiles sudah dibuat sebelumnya
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS jabatan TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telepon TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wilayah_dusun TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wilayah_rw TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wilayah_rt TEXT;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 5. TABEL MASTER WARGA (STANDAR SIAK & DUKCAPIL KEPENDUDUKAN DESA)
CREATE TABLE IF NOT EXISTS public.warga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nik VARCHAR(16) UNIQUE NOT NULL,
    no_kk VARCHAR(16) NOT NULL,
    nama TEXT NOT NULL,
    tempat_lahir TEXT,
    tanggal_lahir DATE,
    jenis_kelamin VARCHAR(10) CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    golongan_darah VARCHAR(5) DEFAULT 'O',
    agama TEXT DEFAULT 'Islam',
    no_akta_lahir TEXT,
    status_ktp TEXT DEFAULT 'Sudah KTP-el',
    
    -- Hubungan & Status Keluarga
    shdk TEXT DEFAULT 'Kepala Keluarga',
    status_perkawinan TEXT DEFAULT 'Belum Kawin',
    no_akta_nikah_cerai TEXT,
    nama_ayah TEXT,
    nama_ibu TEXT,

    -- Pendidikan, Pekerjaan & Ekonomi
    pendidikan_terakhir TEXT DEFAULT 'SMA/SMK/Sederajat',
    status_sekolah TEXT DEFAULT 'Tidak / Sudah Lulus',
    pekerjaan TEXT,
    rentang_penghasilan TEXT DEFAULT 'Rp 1.000.000 - Rp 2.500.000',
    status_ekonomi ekonomi_warga DEFAULT 'mampu',
    bansos_pkh BOOLEAN DEFAULT false,
    bansos_bpnt BOOLEAN DEFAULT false,
    bansos_blt_desa BOOLEAN DEFAULT false,
    bpjs_pbi BOOLEAN DEFAULT false,

    -- Lokasi & Alamat Domisili
    dusun TEXT NOT NULL,
    rw VARCHAR(4) NOT NULL,
    rt VARCHAR(4) NOT NULL,
    alamat_detail TEXT,
    status_tempat_tinggal TEXT DEFAULT 'Milik Sendiri',
    telepon TEXT,
    status_domisili TEXT DEFAULT 'Penduduk Tetap',
    status_kependudukan status_warga DEFAULT 'aktif',

    -- Kondisi Khusus & Kerentanan (Posyandu & Stunting)
    is_disabilitas BOOLEAN DEFAULT false,
    jenis_disabilitas TEXT DEFAULT 'Tidak Ada',
    penyakit_kronis TEXT DEFAULT 'Tidak Ada',
    status_kesehatan_khusus TEXT DEFAULT 'Normal',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pastikan kolom baru terpasang di database Supabase yang sudah aktif (Backward Compatibility)
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS golongan_darah VARCHAR(5) DEFAULT 'O';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS no_akta_lahir TEXT;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS status_ktp TEXT DEFAULT 'Sudah KTP-el';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS status_perkawinan TEXT DEFAULT 'Belum Kawin';
ALTER TABLE public.warga ALTER COLUMN status_perkawinan SET DEFAULT 'Belum Kawin';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS no_akta_nikah_cerai TEXT;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS nama_ayah TEXT;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS nama_ibu TEXT;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS pendidikan_terakhir TEXT DEFAULT 'SMA/SMK/Sederajat';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS status_sekolah TEXT DEFAULT 'Tidak / Sudah Lulus';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS rentang_penghasilan TEXT DEFAULT 'Rp 1.000.000 - Rp 2.500.000';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS bansos_pkh BOOLEAN DEFAULT false;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS bansos_bpnt BOOLEAN DEFAULT false;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS bansos_blt_desa BOOLEAN DEFAULT false;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS bpjs_pbi BOOLEAN DEFAULT false;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS status_tempat_tinggal TEXT DEFAULT 'Milik Sendiri';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS telepon TEXT;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS status_domisili TEXT DEFAULT 'Penduduk Tetap';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS is_disabilitas BOOLEAN DEFAULT false;
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS jenis_disabilitas TEXT DEFAULT 'Tidak Ada';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS penyakit_kronis TEXT DEFAULT 'Tidak Ada';
ALTER TABLE public.warga ADD COLUMN IF NOT EXISTS status_kesehatan_khusus TEXT DEFAULT 'Normal';

-- 6. TABEL MUTASI KEPENDUDUKAN (Kelahiran, Kematian, Pindah)
CREATE TABLE IF NOT EXISTS public.mutasi_kependudukan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warga_id UUID REFERENCES public.warga(id) ON DELETE CASCADE,
    warga_pasangan_id UUID REFERENCES public.warga(id) ON DELETE SET NULL,
    jenis jenis_mutasi NOT NULL,
    tanggal_peristiwa DATE NOT NULL,
    nomor_surat TEXT,
    jenis_dokumen TEXT,
    nomor_dokumen TEXT,
    dusun_tujuan TEXT,
    rw_tujuan VARCHAR(4),
    rt_tujuan VARCHAR(4),
    alamat_tujuan TEXT,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT mutasi_pasangan_berbeda CHECK (warga_pasangan_id IS NULL OR warga_pasangan_id <> warga_id)
);

ALTER TABLE public.mutasi_kependudukan ADD COLUMN IF NOT EXISTS warga_pasangan_id UUID REFERENCES public.warga(id) ON DELETE SET NULL;
ALTER TABLE public.mutasi_kependudukan ADD COLUMN IF NOT EXISTS jenis_dokumen TEXT;
ALTER TABLE public.mutasi_kependudukan ADD COLUMN IF NOT EXISTS nomor_dokumen TEXT;
ALTER TABLE public.mutasi_kependudukan ADD COLUMN IF NOT EXISTS dusun_tujuan TEXT;
ALTER TABLE public.mutasi_kependudukan ADD COLUMN IF NOT EXISTS rw_tujuan VARCHAR(4);
ALTER TABLE public.mutasi_kependudukan ADD COLUMN IF NOT EXISTS rt_tujuan VARCHAR(4);
ALTER TABLE public.mutasi_kependudukan ADD COLUMN IF NOT EXISTS alamat_tujuan TEXT;
DO $$ BEGIN
    ALTER TABLE public.mutasi_kependudukan ADD CONSTRAINT mutasi_pasangan_berbeda
        CHECK (warga_pasangan_id IS NULL OR warga_pasangan_id <> warga_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE public.mutasi_kependudukan ADD CONSTRAINT mutasi_tujuan_wajib_untuk_perpindahan
        CHECK (jenis NOT IN ('pindah_datang', 'pindah_dalam_desa') OR (dusun_tujuan IS NOT NULL AND rw_tujuan IS NOT NULL AND rt_tujuan IS NOT NULL));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 7. TABEL BANTUAN SOSIAL (BANSOS)
CREATE TABLE IF NOT EXISTS public.bantuan_sosial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_program TEXT NOT NULL,
    tahun_anggaran INT NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL PENERIMA BANSOS
CREATE TABLE IF NOT EXISTS public.penerima_bansos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bansos_id UUID REFERENCES public.bantuan_sosial(id) ON DELETE CASCADE,
    warga_id UUID REFERENCES public.warga(id) ON DELETE CASCADE,
    tanggal_verifikasi DATE,
    tanggal_terima DATE,
    status_verifikasi TEXT NOT NULL DEFAULT 'Diverifikasi',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bansos_id, warga_id),
    CONSTRAINT penerima_bansos_status_check
        CHECK (status_verifikasi IN ('Diverifikasi', 'Disalurkan'))
);

-- 9. AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.pengaturan_desa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wilayah_desa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutasi_kependudukan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bantuan_sosial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penerima_bansos ENABLE ROW LEVEL SECURITY;
-- Catatan permohonan dan arsip surat dikelola admin setelah secure auth migration.
CREATE TABLE IF NOT EXISTS public.surat_layanan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warga_id UUID REFERENCES public.warga(id) ON DELETE SET NULL,
    warga_nama TEXT NOT NULL,
    warga_nik VARCHAR(16) NOT NULL,
    warga_no_kk VARCHAR(16),
    warga_dusun TEXT,
    warga_rw VARCHAR(4),
    warga_rt VARCHAR(4),
    jenis_surat TEXT NOT NULL,
    keperluan TEXT NOT NULL,
    kelengkapan TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'diajukan'
        CHECK (status IN ('diajukan','perlu_perbaikan','diverifikasi','menunggu_ttd','selesai','ditolak')),
    catatan_admin TEXT NOT NULL DEFAULT '',
    riwayat_status JSONB NOT NULL DEFAULT '[]'::JSONB,
    lampiran_path TEXT,
    lampiran_nama TEXT,
    nomor_surat TEXT,
    tanggal_surat DATE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.surat_layanan ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID,
    actor_name TEXT NOT NULL DEFAULT 'Sistem',
    actor_role TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    record_id TEXT,
    changed_fields TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 10. HELPER FUNCTION UNTUK MENDAPATKAN PROFIL PENGGUNA AKTIF
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS TABLE (role user_role, dusun TEXT, rw TEXT, rt TEXT) AS $$
    SELECT role, wilayah_dusun, wilayah_rw, wilayah_rt 
    FROM public.profiles 
    WHERE id = auth.uid() OR user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp;

-- RLS is deny-by-default until migration_secure_auth_and_rls.sql is applied.

-- 12. TRIGGER OTOMATISASI STATUS MUTASI WARGA
CREATE OR REPLACE FUNCTION update_status_warga_on_mutasi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.jenis = 'kematian' THEN
        UPDATE public.warga SET status_kependudukan = 'meninggal', updated_at = NOW() WHERE id = NEW.warga_id;
    ELSIF NEW.jenis = 'pindah_keluar' THEN
        UPDATE public.warga SET status_kependudukan = 'pindah', updated_at = NOW() WHERE id = NEW.warga_id;
    ELSIF NEW.jenis = 'pindah_datang' THEN
        UPDATE public.warga
        SET status_kependudukan = 'aktif', dusun = COALESCE(NEW.dusun_tujuan, dusun),
            rw = COALESCE(NEW.rw_tujuan, rw), rt = COALESCE(NEW.rt_tujuan, rt),
            alamat_detail = COALESCE(NEW.alamat_tujuan, alamat_detail), updated_at = NOW()
        WHERE id = NEW.warga_id;
    ELSIF NEW.jenis = 'pindah_dalam_desa' THEN
        UPDATE public.warga
        SET dusun = NEW.dusun_tujuan, rw = NEW.rw_tujuan, rt = NEW.rt_tujuan,
            alamat_detail = COALESCE(NEW.alamat_tujuan, alamat_detail), updated_at = NOW()
        WHERE id = NEW.warga_id;
    ELSIF NEW.jenis = 'menikah' THEN
        IF NEW.warga_pasangan_id IS NULL OR NEW.warga_pasangan_id = NEW.warga_id THEN
            RAISE EXCEPTION 'Peristiwa menikah harus menghubungkan dua warga yang berbeda';
        END IF;
        UPDATE public.warga
        SET status_perkawinan = 'Kawin',
            no_akta_nikah_cerai = NEW.nomor_dokumen,
            updated_at = NOW()
        WHERE id IN (NEW.warga_id, NEW.warga_pasangan_id);
    ELSIF NEW.jenis = 'bercerai' THEN
        IF NEW.warga_pasangan_id IS NULL OR NEW.warga_pasangan_id = NEW.warga_id THEN
            RAISE EXCEPTION 'Peristiwa perceraian harus menghubungkan dua warga yang berbeda';
        END IF;
        UPDATE public.warga
        SET status_perkawinan = 'Cerai Hidup',
            no_akta_nikah_cerai = NEW.nomor_dokumen,
            updated_at = NOW()
        WHERE id IN (NEW.warga_id, NEW.warga_pasangan_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_mutasi_status_warga ON public.mutasi_kependudukan;
CREATE TRIGGER trg_mutasi_status_warga
AFTER INSERT OR UPDATE ON public.mutasi_kependudukan
FOR EACH ROW EXECUTE FUNCTION update_status_warga_on_mutasi();

-- 13. AKTIFKAN REPLIKASI REALTIME SUPABASE (SINKRONISASI OTOMATIS SEMUA ROLE)
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.warga;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mutasi_kependudukan;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pengaturan_desa;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wilayah_desa;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bantuan_sosial;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.penerima_bansos;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.surat_layanan;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Demo profiles and citizen records are intentionally not seeded. Create real users in Supabase Auth.

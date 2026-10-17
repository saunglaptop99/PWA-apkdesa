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
        CREATE TYPE jenis_mutasi AS ENUM ('kelahiran', 'kematian', 'pindah_datang', 'pindah_keluar');
    END IF;
END $$;

-- 2. TABEL PENGATURAN DESA (Nama Desa, Kepala Desa, dsb.)
CREATE TABLE IF NOT EXISTS public.pengaturan_desa (
    id INT PRIMARY KEY DEFAULT 1,
    nama_desa TEXT NOT NULL DEFAULT 'Sukamaju',
    nama_kecamatan TEXT DEFAULT 'Sukaraja',
    nama_kabupaten TEXT DEFAULT 'Bogor',
    nama_kepala_desa TEXT NOT NULL DEFAULT 'H. Ahmad Dahlan, S.E.',
    alamat_kantor TEXT DEFAULT 'Jl. Raya Desa Sukamaju No. 01',
    kontak_desa TEXT DEFAULT '0812-3456-7890',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.pengaturan_desa (id, nama_desa, nama_kecamatan, nama_kabupaten, nama_kepala_desa, alamat_kantor, kontak_desa)
VALUES (1, 'Sukamaju', 'Sukaraja', 'Bogor', 'H. Ahmad Dahlan, S.E.', 'Jl. Raya Desa Sukamaju No. 01', '0812-3456-7890')
ON CONFLICT (id) DO UPDATE SET
    nama_desa = EXCLUDED.nama_desa,
    nama_kepala_desa = EXCLUDED.nama_kepala_desa,
    updated_at = NOW();

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

INSERT INTO public.wilayah_desa (dusun, rw, rt) VALUES
('Sukamaju', '01', '01'),
('Sukamaju', '01', '02'),
('Sukamaju', '01', '03'),
('Sukamaju', '01', '04'),
('Sukamaju', '02', '01'),
('Sukamaju', '02', '02'),
('Sukamaju', '02', '03'),
('Mekarsari', '01', '01'),
('Mekarsari', '01', '02'),
('Mekarsari', '02', '01'),
('Mekarsari', '02', '02'),
('Mekarsari', '02', '03')
ON CONFLICT (dusun, rw, rt) DO NOTHING;

-- 4. TABEL PROFIL PENGGUNA & APARAT DESA (Mendukung Login PIN Cepat)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    username TEXT,
    pin VARCHAR(6) NOT NULL DEFAULT '123456',
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
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin VARCHAR(6) DEFAULT '123456';
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

-- 5. TABEL MASTER WARGA
CREATE TABLE IF NOT EXISTS public.warga (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nik VARCHAR(16) UNIQUE NOT NULL,
    no_kk VARCHAR(16) NOT NULL,
    nama TEXT NOT NULL,
    tempat_lahir TEXT,
    tanggal_lahir DATE,
    jenis_kelamin VARCHAR(10) CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    agama TEXT DEFAULT 'Islam',
    pekerjaan TEXT,
    shdk TEXT DEFAULT 'Kepala Keluarga',
    dusun TEXT NOT NULL,
    rw VARCHAR(4) NOT NULL,
    rt VARCHAR(4) NOT NULL,
    alamat_detail TEXT,
    status_kependudukan status_warga DEFAULT 'aktif',
    status_ekonomi ekonomi_warga DEFAULT 'mampu',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL MUTASI KEPENDUDUKAN (Kelahiran, Kematian, Pindah)
CREATE TABLE IF NOT EXISTS public.mutasi_kependudukan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warga_id UUID REFERENCES public.warga(id) ON DELETE CASCADE,
    jenis jenis_mutasi NOT NULL,
    tanggal_peristiwa DATE NOT NULL,
    nomor_surat TEXT,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
    tanggal_terima DATE DEFAULT CURRENT_DATE,
    status_verifikasi TEXT DEFAULT 'Disalurkan',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bansos_id, warga_id)
);

-- 9. AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.pengaturan_desa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wilayah_desa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutasi_kependudukan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bantuan_sosial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penerima_bansos ENABLE ROW LEVEL SECURITY;

-- 10. HELPER FUNCTION UNTUK MENDAPATKAN PROFIL PENGGUNA AKTIF
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS TABLE (role user_role, dusun TEXT, rw TEXT, rt TEXT) AS $$
    SELECT role, wilayah_dusun, wilayah_rw, wilayah_rt 
    FROM public.profiles 
    WHERE id = auth.uid() OR user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 11. RLS POLICIES (BEBAS REKURSIF UNTUK KEANDALAN REALTIME)

-- Pengaturan Desa
DROP POLICY IF EXISTS "Semua Orang Melihat Pengaturan Desa" ON public.pengaturan_desa;
CREATE POLICY "Semua Orang Melihat Pengaturan Desa" ON public.pengaturan_desa
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Mengelola Pengaturan Desa" ON public.pengaturan_desa;
CREATE POLICY "Admin Mengelola Pengaturan Desa" ON public.pengaturan_desa
FOR ALL USING (true);

-- Wilayah Desa
DROP POLICY IF EXISTS "Semua Melihat Wilayah Desa" ON public.wilayah_desa;
CREATE POLICY "Semua Melihat Wilayah Desa" ON public.wilayah_desa
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin Mengelola Wilayah Desa" ON public.wilayah_desa;
CREATE POLICY "Admin Mengelola Wilayah Desa" ON public.wilayah_desa
FOR ALL USING (true);

-- Profiles (Hapus policy lama agar tidak terjadi infinite recursion)
DROP POLICY IF EXISTS "Pengguna dapat membaca profil sendiri atau admin" ON public.profiles;
DROP POLICY IF EXISTS "Admin dapat mengelola semua profil" ON public.profiles;
DROP POLICY IF EXISTS "Semua Aparat Melihat Profil" ON public.profiles;
DROP POLICY IF EXISTS "Admin Mengelola Semua Profil Aparat" ON public.profiles;
DROP POLICY IF EXISTS "Akses Profil Publik" ON public.profiles;
DROP POLICY IF EXISTS "Akses Profil Kelola" ON public.profiles;

CREATE POLICY "Akses Profil Publik" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Akses Profil Kelola" ON public.profiles FOR ALL USING (true);

-- Warga
DROP POLICY IF EXISTS "Akses Warga Sesuai Hirarki Role" ON public.warga;
DROP POLICY IF EXISTS "Admin Mengelola Data Warga" ON public.warga;
DROP POLICY IF EXISTS "Akses Warga Seluruhnya" ON public.warga;

CREATE POLICY "Akses Warga Seluruhnya" ON public.warga FOR ALL USING (true);

-- Mutasi
DROP POLICY IF EXISTS "Akses Mutasi Sesuai Kewenangan" ON public.mutasi_kependudukan;
DROP POLICY IF EXISTS "Admin Mengelola Mutasi" ON public.mutasi_kependudukan;
DROP POLICY IF EXISTS "Akses Mutasi Seluruhnya" ON public.mutasi_kependudukan;

CREATE POLICY "Akses Mutasi Seluruhnya" ON public.mutasi_kependudukan FOR ALL USING (true);

-- Bantuan Sosial & Penerima
DROP POLICY IF EXISTS "Semua Aparat Melihat Program Bansos" ON public.bantuan_sosial;
DROP POLICY IF EXISTS "Admin Mengelola Program Bansos" ON public.bantuan_sosial;
CREATE POLICY "Admin Mengelola Program Bansos" ON public.bantuan_sosial FOR ALL USING (true);

DROP POLICY IF EXISTS "Semua Aparat Melihat Penerima Bansos" ON public.penerima_bansos;
DROP POLICY IF EXISTS "Admin Mengelola Penerima Bansos" ON public.penerima_bansos;
CREATE POLICY "Admin Mengelola Penerima Bansos" ON public.penerima_bansos FOR ALL USING (true);

-- 12. TRIGGER OTOMATISASI STATUS MUTASI WARGA
CREATE OR REPLACE FUNCTION update_status_warga_on_mutasi()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.jenis = 'kematian' THEN
        UPDATE public.warga SET status_kependudukan = 'meninggal', updated_at = NOW() WHERE id = NEW.warga_id;
    ELSIF NEW.jenis = 'pindah_keluar' THEN
        UPDATE public.warga SET status_kependudukan = 'pindah', updated_at = NOW() WHERE id = NEW.warga_id;
    ELSIF NEW.jenis = 'pindah_datang' THEN
        UPDATE public.warga SET status_kependudukan = 'aktif', updated_at = NOW() WHERE id = NEW.warga_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- 14. SEED DATA DEFAULT APARAT DESA (LOGIN PIN DEFAULT: 123456)
INSERT INTO public.profiles (username, pin, nama_lengkap, role, jabatan, wilayah_dusun, wilayah_rw, wilayah_rt, telepon)
VALUES
('admin', '123456', 'Bpk. Suryanto, S.Sos', 'admin', 'Sekretaris Desa / Admin', NULL, NULL, NULL, '081234567800'),
('kadus1', '123456', 'Bpk. Ahmad Fauzi', 'dusun', 'Kepala Dusun Sukamaju', 'Sukamaju', NULL, NULL, '081234567801'),
('rw01', '123456', 'Bpk. Dedi Supardi', 'rw', 'Ketua RW 01', 'Sukamaju', '01', NULL, '081234567802'),
('rt01_01', '123456', 'Bpk. Mulyadi', 'rt', 'Ketua RT 01 / RW 01', 'Sukamaju', '01', '01', '081234567803'),
('rt02_01', '123456', 'Bpk. Ridwan Kamiludin', 'rt', 'Ketua RT 02 / RW 01', 'Sukamaju', '01', '02', '081234567804'),
('rt01_02', '123456', 'Bpk. Cecep Hidayat', 'rt', 'Ketua RT 01 / RW 02', 'Mekarsari', '02', '01', '081234567805')
ON CONFLICT (username) DO UPDATE SET
    pin = EXCLUDED.pin,
    nama_lengkap = EXCLUDED.nama_lengkap,
    wilayah_dusun = EXCLUDED.wilayah_dusun,
    wilayah_rw = EXCLUDED.wilayah_rw,
    wilayah_rt = EXCLUDED.wilayah_rt;

-- 15. DATA WARGA AWAL (DENGAN CONTOH RT 01/01 DAN RT 02/01)
INSERT INTO public.warga (nik, no_kk, nama, tempat_lahir, tanggal_lahir, jenis_kelamin, agama, pekerjaan, shdk, dusun, rw, rt, alamat_detail, status_kependudukan, status_ekonomi) VALUES
-- RT 01 / RW 01
('3201011203850001', '3201011203850000', 'Bambang Sudarmono', 'Bandung', '1985-03-12', 'Laki-laki', 'Islam', 'Petani', 'Kepala Keluarga', 'Sukamaju', '01', '01', 'Jl. Melati No. 12 RT 01', 'aktif', 'miskin'),
('3201015506890002', '3201011203850000', 'Siti Aminah', 'Cianjur', '1989-06-15', 'Perempuan', 'Islam', 'Ibu Rumah Tangga', 'Istri', 'Sukamaju', '01', '01', 'Jl. Melati No. 12 RT 01', 'aktif', 'miskin'),
('3201010101700006', '3201010101700000', 'Solihin bin Kosasih', 'Tasikmalaya', '1970-01-01', 'Laki-laki', 'Islam', 'Buruh Tani', 'Kepala Keluarga', 'Sukamaju', '01', '01', 'Jl. Randu Alas RT 01', 'aktif', 'miskin'),

-- RT 02 / RW 01 (Untuk Pengujian Khusus RT 02/01)
('3201011808920003', '3201011808920000', 'Agus Supriatna', 'Sumedang', '1992-08-18', 'Laki-laki', 'Islam', 'Buruh Harian Lepas', 'Kepala Keluarga', 'Sukamaju', '01', '02', 'Kp. Babakan RT 02', 'aktif', 'rentan'),
('3201016509940007', '3201011808920000', 'Nurhayati Rahmawati', 'Bogor', '1994-09-25', 'Perempuan', 'Islam', 'Karyawan Swasta', 'Istri', 'Sukamaju', '01', '02', 'Kp. Babakan RT 02', 'aktif', 'mampu'),
('3201012502900008', '3201012502900000', 'Herman Wijaya', 'Sukabumi', '1990-02-25', 'Laki-laki', 'Islam', 'Pedagang Warung', 'Kepala Keluarga', 'Sukamaju', '01', '02', 'Jl. Anggrek No. 8 RT 02', 'aktif', 'miskin'),

-- RW 02 (Mekarsari)
('3201012204780004', '3201012204780000', 'Hendra Gunawan', 'Garut', '1978-04-22', 'Laki-laki', 'Islam', 'Wiraswasta', 'Kepala Keluarga', 'Mekarsari', '02', '01', 'Jl. Cempaka Indah No. 5', 'aktif', 'mampu'),
('3201016011950005', '3201016011950000', 'Dewi Sartika', 'Bogor', '1995-11-20', 'Perempuan', 'Islam', 'Pedagang', 'Kepala Keluarga', 'Mekarsari', '02', '02', 'Kp. Pasir Honje RT 02', 'aktif', 'rentan')
ON CONFLICT (nik) DO UPDATE SET
    nama = EXCLUDED.nama,
    status_ekonomi = EXCLUDED.status_ekonomi,
    rt = EXCLUDED.rt,
    rw = EXCLUDED.rw,
    dusun = EXCLUDED.dusun;

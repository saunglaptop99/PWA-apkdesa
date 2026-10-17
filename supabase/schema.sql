-- ==============================================================================
-- SISTEM INFORMASI KEPENDUDUKAN & APARAT DESA (SIM APARAT DESA PWA)
-- SUPABASE DATABASE INITIALIZATION SCHEMA & RLS POLICIES
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

-- 2. TABEL PROFIL PENGGUNA (Terkoneksi dengan auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nama_lengkap TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'rt',
    wilayah_dusun TEXT,
    wilayah_rw TEXT,
    wilayah_rt TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL MASTER WARGA
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
    rw TEXT NOT NULL,
    rt TEXT NOT NULL,
    alamat_detail TEXT,
    status_kependudukan status_warga DEFAULT 'aktif',
    status_ekonomi ekonomi_warga DEFAULT 'mampu',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL MUTASI KEPENDUDUKAN (Kelahiran, Kematian, Pindah)
CREATE TABLE IF NOT EXISTS public.mutasi_kependudukan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warga_id UUID REFERENCES public.warga(id) ON DELETE CASCADE,
    jenis jenis_mutasi NOT NULL,
    tanggal_peristiwa DATE NOT NULL,
    nomor_surat TEXT,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL BANTUAN SOSIAL (BANSOS)
CREATE TABLE IF NOT EXISTS public.bantuan_sosial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_program TEXT NOT NULL,
    tahun_anggaran INT NOT NULL,
    keterangan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL PENERIMA BANSOS
CREATE TABLE IF NOT EXISTS public.penerima_bansos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bansos_id UUID REFERENCES public.bantuan_sosial(id) ON DELETE CASCADE,
    warga_id UUID REFERENCES public.warga(id) ON DELETE CASCADE,
    tanggal_terima DATE DEFAULT CURRENT_DATE,
    status_verifikasi TEXT DEFAULT 'Disalurkan',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bansos_id, warga_id)
);

-- 7. AKTIFKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutasi_kependudukan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bantuan_sosial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penerima_bansos ENABLE ROW LEVEL SECURITY;

-- 8. HELPER FUNCTION UNTUK MENDAPATKAN PROFIL PENGGUNA AKTIF
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS TABLE (role user_role, dusun TEXT, rw TEXT, rt TEXT) AS $$
    SELECT role, wilayah_dusun, wilayah_rw, wilayah_rt 
    FROM public.profiles 
    WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 9. RLS POLICIES

-- Profiles
DROP POLICY IF EXISTS "Pengguna dapat membaca profil sendiri atau admin" ON public.profiles;
CREATE POLICY "Pengguna dapat membaca profil sendiri atau admin" ON public.profiles
FOR SELECT USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admin dapat mengelola semua profil" ON public.profiles;
CREATE POLICY "Admin dapat mengelola semua profil" ON public.profiles
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Warga
DROP POLICY IF EXISTS "Akses Warga Sesuai Hirarki Role" ON public.warga;
CREATE POLICY "Akses Warga Sesuai Hirarki Role" ON public.warga
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND (
            p.role = 'admin' OR
            (p.role = 'dusun' AND p.wilayah_dusun = warga.dusun) OR
            (p.role = 'rw' AND p.wilayah_rw = warga.rw) OR
            (p.role = 'rt' AND p.wilayah_rt = warga.rt AND p.wilayah_rw = warga.rw)
        )
    )
);

DROP POLICY IF EXISTS "Admin Mengelola Data Warga" ON public.warga;
CREATE POLICY "Admin Mengelola Data Warga" ON public.warga
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Mutasi
DROP POLICY IF EXISTS "Semua Aparat Melihat Mutasi Sesuai Kewenangan" ON public.mutasi_kependudukan;
CREATE POLICY "Semua Aparat Melihat Mutasi Sesuai Kewenangan" ON public.mutasi_kependudukan
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        JOIN public.warga w ON w.id = mutasi_kependudukan.warga_id
        WHERE p.id = auth.uid() AND (
            p.role = 'admin' OR
            (p.role = 'dusun' AND p.wilayah_dusun = w.dusun) OR
            (p.role = 'rw' AND p.wilayah_rw = w.rw) OR
            (p.role = 'rt' AND p.wilayah_rt = w.rt AND p.wilayah_rw = w.rw)
        )
    )
);

DROP POLICY IF EXISTS "Admin Mengelola Mutasi" ON public.mutasi_kependudukan;
CREATE POLICY "Admin Mengelola Mutasi" ON public.mutasi_kependudukan
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Bantuan Sosial
DROP POLICY IF EXISTS "Semua Aparat Melihat Program Bansos" ON public.bantuan_sosial;
CREATE POLICY "Semua Aparat Melihat Program Bansos" ON public.bantuan_sosial
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin Mengelola Program Bansos" ON public.bantuan_sosial;
CREATE POLICY "Admin Mengelola Program Bansos" ON public.bantuan_sosial
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Penerima Bansos
DROP POLICY IF EXISTS "Semua Aparat Melihat Penerima Bansos" ON public.penerima_bansos;
CREATE POLICY "Semua Aparat Melihat Penerima Bansos" ON public.penerima_bansos
FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin Mengelola Penerima Bansos" ON public.penerima_bansos;
CREATE POLICY "Admin Mengelola Penerima Bansos" ON public.penerima_bansos
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 10. TRIGGER OTOMATISASI STATUS MUTASI WARGA
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

-- 11. SAMPLE DATA / DUMMY SEED (OPSIONAL UNTUK PENGUJIAN)
-- Program Bansos
INSERT INTO public.bantuan_sosial (nama_program, tahun_anggaran, keterangan) VALUES
('BLT Dana Desa', 2026, 'Bantuan Langsung Tunai untuk keluarga prasejahtera'),
('PKH (Program Keluarga Harapan)', 2026, 'Bantuan bersyarat untuk ibu hamil dan anak sekolah'),
('BPNT / Sembako', 2026, 'Bantuan pangan non-tunai sembako bulanan')
ON CONFLICT DO NOTHING;

-- Data Warga Awal
INSERT INTO public.warga (nik, no_kk, nama, tempat_lahir, tanggal_lahir, jenis_kelamin, agama, pekerjaan, shdk, dusun, rw, rt, alamat_detail, status_kependudukan, status_ekonomi) VALUES
('3201011203850001', '3201011203850000', 'Bambang Sudarmono', 'Bandung', '1985-03-12', 'Laki-laki', 'Islam', 'Petani', 'Kepala Keluarga', 'Sukamaju', '01', '01', 'Jl. Melati No. 12', 'aktif', 'miskin'),
('3201015506890002', '3201011203850000', 'Siti Aminah', 'Cianjur', '1989-06-15', 'Perempuan', 'Islam', 'Mengurus Rumah Tangga', 'Istri', 'Sukamaju', '01', '01', 'Jl. Melati No. 12', 'aktif', 'miskin'),
('3201011808920003', '3201011808920000', 'Agus Supriatna', 'Sumedang', '1992-08-18', 'Laki-laki', 'Islam', 'Buruh Harian Lepas', 'Kepala Keluarga', 'Sukamaju', '01', '02', 'Kp. Babakan RT 02', 'aktif', 'rentan'),
('3201012204780004', '3201012204780000', 'Hendra Gunawan', 'Garut', '1978-04-22', 'Laki-laki', 'Islam', 'Wiraswasta', 'Kepala Keluarga', 'Mekarsari', '02', '01', 'Jl. Cempaka Indah No. 5', 'aktif', 'mampu'),
('3201016011950005', '3201016011950000', 'Dewi Sartika', 'Bogor', '1995-11-20', 'Perempuan', 'Islam', 'Pedagang', 'Kepala Keluarga', 'Mekarsari', '02', '02', 'Kp. Pasir Honje RT 02', 'aktif', 'rentan'),
('3201010101700006', '3201010101700000', 'Solihin bin Kosasih', 'Tasikmalaya', '1970-01-01', 'Laki-laki', 'Islam', 'Buruh Tani', 'Kepala Keluarga', 'Sukamaju', '01', '01', 'Jl. Randu Alas RT 01', 'aktif', 'miskin')
ON CONFLICT (nik) DO NOTHING;

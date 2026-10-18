BEGIN;

ALTER TABLE public.warga ALTER COLUMN status_perkawinan SET DEFAULT 'Belum Kawin';

ALTER TABLE public.mutasi_kependudukan
  ADD COLUMN IF NOT EXISTS warga_pasangan_id UUID REFERENCES public.warga(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS jenis_dokumen TEXT,
  ADD COLUMN IF NOT EXISTS nomor_dokumen TEXT,
  ADD COLUMN IF NOT EXISTS dusun_tujuan TEXT,
  ADD COLUMN IF NOT EXISTS rw_tujuan VARCHAR(4),
  ADD COLUMN IF NOT EXISTS rt_tujuan VARCHAR(4),
  ADD COLUMN IF NOT EXISTS alamat_tujuan TEXT;

DO $$ BEGIN
  ALTER TABLE public.mutasi_kependudukan ADD CONSTRAINT mutasi_pasangan_berbeda
    CHECK (warga_pasangan_id IS NULL OR warga_pasangan_id <> warga_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.mutasi_kependudukan ADD CONSTRAINT mutasi_pasangan_wajib_untuk_perkawinan
    CHECK (jenis NOT IN ('menikah', 'bercerai') OR warga_pasangan_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.mutasi_kependudukan ADD CONSTRAINT mutasi_tujuan_wajib_untuk_perpindahan
    CHECK (jenis NOT IN ('pindah_datang', 'pindah_dalam_desa') OR (dusun_tujuan IS NOT NULL AND rw_tujuan IS NOT NULL AND rt_tujuan IS NOT NULL)) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.update_status_warga_on_mutasi()
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

COMMIT;

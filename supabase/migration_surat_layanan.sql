-- Apply after migration_secure_auth_and_rls.sql.
begin;

create table if not exists public.surat_layanan (
  id uuid primary key default gen_random_uuid(),
  warga_id uuid references public.warga(id) on delete set null,
  warga_nama text not null,
  warga_nik varchar(16) not null,
  warga_no_kk varchar(16),
  warga_dusun text,
  warga_rw varchar(4),
  warga_rt varchar(4),
  jenis_surat text not null,
  keperluan text not null,
  kelengkapan text not null default '',
  status text not null default 'diajukan'
    check (status in ('diajukan','perlu_perbaikan','diverifikasi','menunggu_ttd','selesai','ditolak')),
  catatan_admin text not null default '',
  riwayat_status jsonb not null default '[]'::jsonb,
  lampiran_path text,
  lampiran_nama text,
  nomor_surat text,
  tanggal_surat date,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.surat_layanan add column if not exists riwayat_status jsonb not null default '[]'::jsonb;
alter table public.surat_layanan add column if not exists lampiran_path text;
alter table public.surat_layanan add column if not exists lampiran_nama text;

create index if not exists surat_layanan_created_at_idx on public.surat_layanan (created_at desc);
create index if not exists surat_layanan_warga_nik_idx on public.surat_layanan (warga_nik);
create unique index if not exists surat_layanan_nomor_surat_uidx
  on public.surat_layanan (lower(trim(nomor_surat))) where nomor_surat is not null and trim(nomor_surat) <> '';

alter table public.surat_layanan enable row level security;
drop policy if exists surat_layanan_admin_all on public.surat_layanan;
create policy surat_layanan_admin_all on public.surat_layanan for all to authenticated
  using (public.is_desa_admin()) with check (public.is_desa_admin());

grant select, insert, update, delete on public.surat_layanan to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('surat-lampiran', 'surat-lampiran', false, 5242880, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 5242880,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png'];

drop policy if exists surat_lampiran_admin_all on storage.objects;
create policy surat_lampiran_admin_all on storage.objects for all to authenticated
  using (bucket_id = 'surat-lampiran' and public.is_desa_admin())
  with check (bucket_id = 'surat-lampiran' and public.is_desa_admin());

do $$ begin
  alter publication supabase_realtime add table public.surat_layanan;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

commit;

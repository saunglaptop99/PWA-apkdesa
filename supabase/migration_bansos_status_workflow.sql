-- Apply to existing projects to separate eligibility verification from actual disbursement.
begin;

alter table public.penerima_bansos
  add column if not exists tanggal_verifikasi date;

-- A verification is not proof that aid was received, so receipt dates must be entered
-- only when an administrator confirms the aid has actually been distributed.
alter table public.penerima_bansos
  alter column tanggal_terima drop default,
  alter column status_verifikasi set default 'Diverifikasi',
  alter column status_verifikasi set not null;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'penerima_bansos_status_check'
      and conrelid = 'public.penerima_bansos'::regclass
  ) then
    alter table public.penerima_bansos
      add constraint penerima_bansos_status_check
      check (status_verifikasi in ('Diverifikasi', 'Disalurkan')) not valid;
  end if;
end $$;

alter table public.penerima_bansos
  validate constraint penerima_bansos_status_check;

comment on column public.penerima_bansos.tanggal_verifikasi is
  'Tanggal admin memverifikasi kelayakan warga untuk program bantuan.';
comment on column public.penerima_bansos.tanggal_terima is
  'Tanggal bantuan benar-benar disalurkan/diterima oleh warga.';

commit;

-- Apply after schema.sql in Supabase SQL Editor.
-- Auth users must be created in Supabase Auth and linked to profiles.user_id.
begin;

alter table public.profiles add column if not exists user_id uuid;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles drop column if exists pin;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_user_id_fkey') then
    alter table public.profiles add constraint profiles_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_user_id_key') then
    alter table public.profiles add constraint profiles_user_id_key unique (user_id);
  end if;
end $$;

create or replace function public.current_profile_role()
returns public.user_role language sql stable security definer
set search_path = public, pg_temp
as $$ select p.role from public.profiles p where p.user_id = auth.uid() limit 1 $$;

create or replace function public.is_desa_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$ select coalesce(public.current_profile_role() = 'admin'::public.user_role, false) $$;

create or replace function public.can_access_warga(p_dusun text, p_rw text, p_rt text)
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and (
      p.role = 'admin'::public.user_role or
      (p.role = 'dusun'::public.user_role and p.wilayah_dusun = p_dusun) or
      (p.role = 'rw'::public.user_role and p.wilayah_dusun = p_dusun and p.wilayah_rw = p_rw) or
      (p.role = 'rt'::public.user_role and p.wilayah_dusun = p_dusun and p.wilayah_rw = p_rw and p.wilayah_rt = p_rt)
    )
  )
$$;

create or replace function public.get_my_profile()
returns table (role public.user_role, dusun text, rw text, rt text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select p.role, p.wilayah_dusun, p.wilayah_rw, p.wilayah_rt
  from public.profiles p where p.user_id = auth.uid() limit 1
$$;

revoke all on function public.current_profile_role() from public, anon;
revoke all on function public.is_desa_admin() from public, anon;
revoke all on function public.can_access_warga(text,text,text) from public, anon;
revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_desa_admin() to authenticated;
grant execute on function public.can_access_warga(text,text,text) to authenticated;
grant execute on function public.get_my_profile() to authenticated;

-- Remove old permissive policies. PostgreSQL combines policies with OR.
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in (
      'pengaturan_desa','wilayah_desa','profiles','warga','mutasi_kependudukan',
      'bantuan_sosial','penerima_bansos'
    )
  loop execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename); end loop;
end $$;

alter table public.pengaturan_desa enable row level security;
alter table public.wilayah_desa enable row level security;
alter table public.profiles enable row level security;
alter table public.warga enable row level security;
alter table public.mutasi_kependudukan enable row level security;
alter table public.bantuan_sosial enable row level security;
alter table public.penerima_bansos enable row level security;

create policy pengaturan_read on public.pengaturan_desa for select to anon, authenticated using (true);
create policy pengaturan_admin_write on public.pengaturan_desa for all to authenticated
  using (public.is_desa_admin()) with check (public.is_desa_admin());

create policy wilayah_read on public.wilayah_desa for select to anon, authenticated using (true);
create policy wilayah_admin_write on public.wilayah_desa for all to authenticated
  using (public.is_desa_admin()) with check (public.is_desa_admin());

create policy profiles_read_self_or_admin on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.is_desa_admin());
create policy profiles_admin_insert on public.profiles for insert to authenticated
  with check (public.is_desa_admin());
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.is_desa_admin()) with check (public.is_desa_admin());
create policy profiles_admin_delete on public.profiles for delete to authenticated
  using (public.is_desa_admin());

create policy warga_scoped_read on public.warga for select to authenticated
  using (public.can_access_warga(dusun, rw, rt));
create policy warga_admin_insert on public.warga for insert to authenticated
  with check (public.is_desa_admin());
create policy warga_admin_update on public.warga for update to authenticated
  using (public.is_desa_admin()) with check (public.is_desa_admin());
create policy warga_admin_delete on public.warga for delete to authenticated
  using (public.is_desa_admin());

create policy mutasi_scoped_read on public.mutasi_kependudukan for select to authenticated
  using (exists (select 1 from public.warga w where w.id = warga_id and public.can_access_warga(w.dusun,w.rw,w.rt)));
create policy mutasi_admin_insert on public.mutasi_kependudukan for insert to authenticated
  with check (public.is_desa_admin());
create policy mutasi_admin_update on public.mutasi_kependudukan for update to authenticated
  using (public.is_desa_admin()) with check (public.is_desa_admin());
create policy mutasi_admin_delete on public.mutasi_kependudukan for delete to authenticated
  using (public.is_desa_admin());

create policy bansos_read on public.bantuan_sosial for select to authenticated using (true);
create policy bansos_admin_insert on public.bantuan_sosial for insert to authenticated with check (public.is_desa_admin());
create policy bansos_admin_update on public.bantuan_sosial for update to authenticated using (public.is_desa_admin()) with check (public.is_desa_admin());
create policy bansos_admin_delete on public.bantuan_sosial for delete to authenticated using (public.is_desa_admin());

create policy penerima_bansos_scoped_read on public.penerima_bansos for select to authenticated
  using (exists (select 1 from public.warga w where w.id = warga_id and public.can_access_warga(w.dusun,w.rw,w.rt)));
create policy penerima_bansos_admin_insert on public.penerima_bansos for insert to authenticated with check (public.is_desa_admin());
create policy penerima_bansos_admin_update on public.penerima_bansos for update to authenticated using (public.is_desa_admin()) with check (public.is_desa_admin());
create policy penerima_bansos_admin_delete on public.penerima_bansos for delete to authenticated using (public.is_desa_admin());

create or replace function public.rename_dusun(p_old_dusun text, p_new_dusun text)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$ begin
  if not public.is_desa_admin() then raise exception 'Hanya admin desa yang dapat mengubah dusun'; end if;
  if nullif(trim(p_new_dusun), '') is null then raise exception 'Nama dusun baru wajib diisi'; end if;
  update public.wilayah_desa set dusun = trim(p_new_dusun) where dusun = trim(p_old_dusun);
  update public.warga set dusun = trim(p_new_dusun), updated_at = now() where dusun = trim(p_old_dusun);
  update public.profiles set wilayah_dusun = trim(p_new_dusun), updated_at = now() where wilayah_dusun = trim(p_old_dusun);
end $$;

create or replace function public.delete_dusun(p_dusun text)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$ begin
  if not public.is_desa_admin() then raise exception 'Hanya admin desa yang dapat menghapus dusun'; end if;
  if exists (select 1 from public.warga where dusun = trim(p_dusun)) or
     exists (select 1 from public.profiles where wilayah_dusun = trim(p_dusun)) then
    raise exception 'Masih ada data warga atau aparat di dusun ini';
  end if;
  delete from public.wilayah_desa where dusun = trim(p_dusun);
end $$;

create or replace function public.delete_wilayah(p_dusun text, p_rw text, p_rt text)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$ begin
  if not public.is_desa_admin() then raise exception 'Hanya admin desa yang dapat menghapus wilayah'; end if;
  if exists (select 1 from public.warga where dusun = trim(p_dusun) and rw = p_rw and rt = p_rt) or
     exists (select 1 from public.profiles where wilayah_dusun = trim(p_dusun) and wilayah_rw = p_rw and (wilayah_rt is null or wilayah_rt = p_rt)) then
    raise exception 'Wilayah masih dipakai warga atau aparat';
  end if;
  delete from public.wilayah_desa where dusun = trim(p_dusun) and rw = p_rw and rt = p_rt;
end $$;

revoke all on function public.rename_dusun(text,text) from public, anon;
revoke all on function public.delete_dusun(text) from public, anon;
revoke all on function public.delete_wilayah(text,text,text) from public, anon;
grant execute on function public.rename_dusun(text,text) to authenticated;
grant execute on function public.delete_dusun(text) to authenticated;
grant execute on function public.delete_wilayah(text,text,text) to authenticated;

commit;

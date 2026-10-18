-- Apply after migration_secure_auth_and_rls.sql.
begin;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_name text not null default 'Sistem',
  actor_role text,
  action text not null,
  entity text not null,
  record_id text,
  changed_fields text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity, created_at desc);
alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from public, anon, authenticated;
grant select, insert on public.audit_logs to authenticated;
drop policy if exists audit_logs_admin_read on public.audit_logs;
drop policy if exists audit_logs_admin_insert on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs for select to authenticated
  using (public.is_desa_admin());
create policy audit_logs_admin_insert on public.audit_logs for insert to authenticated
  with check (public.is_desa_admin() and actor_user_id = auth.uid());

create or replace function public.write_audit_row_change()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_row jsonb;
  v_old jsonb;
  v_id text;
  v_fields text[] := '{}';
  v_name text := 'Sistem';
  v_role text;
begin
  if v_actor is null then
    if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
  end if;
  if TG_OP = 'DELETE' then
    v_row := to_jsonb(OLD);
    v_id := v_row->>'id';
  else
    v_row := to_jsonb(NEW);
    v_id := v_row->>'id';
  end if;
  if TG_OP = 'INSERT' then
    select array_agg(f.key order by f.key) into v_fields from jsonb_object_keys(v_row) as f(key);
  elsif TG_OP = 'UPDATE' then
    v_old := to_jsonb(OLD);
    select coalesce(array_agg(n.key order by n.key), '{}') into v_fields
      from jsonb_each(v_row) n where v_old->n.key is distinct from n.value;
  else
    v_fields := array['record'];
  end if;
  select p.nama_lengkap, p.role::text into v_name, v_role
    from public.profiles p where p.user_id = v_actor limit 1;
  insert into public.audit_logs(actor_user_id, actor_name, actor_role, action, entity, record_id, changed_fields)
  values (v_actor, coalesce(v_name, 'Aparat'), v_role, TG_OP, TG_TABLE_NAME, v_id, coalesce(v_fields, '{}'));
  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end;
$$;
revoke all on function public.write_audit_row_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles','pengaturan_desa','warga','wilayah_desa','mutasi_kependudukan','penerima_bansos','bantuan_sosial','surat_layanan'] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('drop trigger if exists %I on public.%I', 'audit_' || t || '_changes', t);
      execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.write_audit_row_change()', 'audit_' || t || '_changes', t);
    end if;
  end loop;
end;
$$;

do $$ begin
  alter publication supabase_realtime add table public.audit_logs;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

commit;

-- PIN authentication primitives. Apply after migration_secure_auth_and_rls.sql.
-- A server-only HMAC digest is used because 6-digit PINs cannot be safely protected
-- by a plain hash alone. The HMAC key must be configured as PIN_PEPPER in Edge Functions.
begin;

create table if not exists public.pin_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_digest text not null unique,
  updated_at timestamptz not null default now()
);

create table if not exists public.pin_login_attempts (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0
);

alter table public.pin_credentials enable row level security;
alter table public.pin_login_attempts enable row level security;
revoke all on public.pin_credentials, public.pin_login_attempts from anon, authenticated, public;
grant all on public.pin_credentials, public.pin_login_attempts to service_role;

create or replace function public.pin_login_allowed(p_bucket_key text)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_attempts integer;
begin
  insert into public.pin_login_attempts(bucket_key, window_started_at, attempts)
  values (p_bucket_key, now(), 1)
  on conflict (bucket_key) do update
    set window_started_at = case
          when public.pin_login_attempts.window_started_at < now() - interval '15 minutes' then now()
          else public.pin_login_attempts.window_started_at end,
        attempts = case
          when public.pin_login_attempts.window_started_at < now() - interval '15 minutes' then 1
          else public.pin_login_attempts.attempts + 1 end
  returning attempts into v_attempts;
  return v_attempts <= 10;
end $$;

create or replace function public.pin_login_clear(p_bucket_key text)
returns void language sql security definer set search_path = public, pg_temp
as $$ delete from public.pin_login_attempts where bucket_key = p_bucket_key $$;

revoke all on function public.pin_login_allowed(text) from public, anon, authenticated;
revoke all on function public.pin_login_clear(text) from public, anon, authenticated;
grant execute on function public.pin_login_allowed(text) to service_role;
grant execute on function public.pin_login_clear(text) to service_role;

commit;

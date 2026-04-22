-- TrustLayer initial schema.
-- Apply via Supabase Dashboard → SQL Editor (single run). Idempotent: safe
-- to re-run. After this, RLS is enabled on all user-owned tables so the
-- anon key can only read/write through the authenticated session.

-- ---------- reports table ----------
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  input_kind    text not null check (input_kind in ('text','url')),
  source        text,
  analyzed_text text not null,
  trust_score   int  not null check (trust_score between 0 and 100),
  risk_flags           jsonb not null default '[]'::jsonb,
  suspicious_patterns  jsonb not null default '[]'::jsonb,
  unverifiable_claims  jsonb not null default '[]'::jsonb,
  explanation   text not null,
  ai_mode       text not null,
  disclaimer    text not null,
  lang          text not null check (lang in ('ru','en'))
);

create index if not exists reports_user_id_created_at_idx
  on public.reports (user_id, created_at desc);

alter table public.reports enable row level security;

-- Users see/modify only their own rows. The service role bypasses RLS.
drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
  on public.reports for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own"
  on public.reports for delete
  to authenticated
  using (auth.uid() = user_id);

-- ---------- quotas table ----------
-- One row per user per UTC day. Incremented by the backend service role on
-- each successful analysis.
create table if not exists public.quotas (
  user_id    uuid not null references auth.users(id) on delete cascade,
  day        date not null,
  used_count int  not null default 0 check (used_count >= 0),
  primary key (user_id, day)
);

alter table public.quotas enable row level security;

drop policy if exists "quotas_select_own" on public.quotas;
create policy "quotas_select_own"
  on public.quotas for select
  to authenticated
  using (auth.uid() = user_id);

-- Writes are done by the backend with the service role key, so no RLS
-- write policy is needed.

-- ---------- consume_quota RPC ----------
-- Atomically check and increment today's quota for the calling user.
-- Returns (allowed boolean, used int, limit int). Invoked from the backend
-- with the service role context so we can trust the passed user_id.
create or replace function public.consume_quota(
  p_user_id uuid,
  p_limit   int default 10
) returns table (allowed boolean, used int, max_per_day int)
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'utc')::date;
  current_used int;
begin
  insert into public.quotas (user_id, day, used_count)
  values (p_user_id, today, 0)
  on conflict (user_id, day) do nothing;

  select used_count into current_used
  from public.quotas
  where user_id = p_user_id and day = today
  for update;

  if current_used >= p_limit then
    return query select false, current_used, p_limit;
    return;
  end if;

  update public.quotas
     set used_count = used_count + 1
   where user_id = p_user_id and day = today;

  return query select true, current_used + 1, p_limit;
end;
$$;

revoke all on function public.consume_quota(uuid, int) from public;
grant execute on function public.consume_quota(uuid, int) to service_role;

-- Bank SMS advanced (additive only): learned rules, edited/auto flags, per-phone tokens.
alter table public.account_sms_config add column if not exists learned jsonb not null default '[]'::jsonb;
alter table public.sms_inbox add column if not exists edited boolean not null default false;
alter table public.sms_inbox add column if not exists auto boolean not null default false;

create table if not exists public.sms_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Phone',
  token text not null unique default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked boolean not null default false
);
create index if not exists sms_devices_user_idx on public.sms_devices(user_id);
alter table public.sms_devices enable row level security;
drop policy if exists sms_devices_owner on public.sms_devices;
create policy sms_devices_owner on public.sms_devices for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

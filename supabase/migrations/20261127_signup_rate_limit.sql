-- Rate limiting for the public-signup Edge Function (username sign-up without email).
-- Additive and safe to run more than once.

create table if not exists public.signup_attempts (
  id bigserial primary key,
  ip text not null,
  created_at timestamptz not null default now()
);
create index if not exists signup_attempts_ip_created_idx on public.signup_attempts (ip, created_at desc);

-- Only the Edge Function (service role) touches this table. RLS on with no policies blocks browser clients.
alter table public.signup_attempts enable row level security;
revoke all on public.signup_attempts from anon, authenticated;

-- Admins can turn username sign-up off without redeploying:
--   insert into public.app_settings (key, value) values ('public_signup_enabled', 'false'::jsonb)
--   on conflict (key) do update set value = excluded.value, updated_at = now();
-- Missing row = sign-up stays on (current behaviour).

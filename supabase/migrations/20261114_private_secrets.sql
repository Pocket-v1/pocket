-- Server-only settings that edge functions read with the service role. No policies: users cannot read it. Additive.
-- The values are added directly in the database, never in the code.
create table if not exists public.private_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.private_secrets enable row level security;
revoke all on public.private_secrets from anon, authenticated;

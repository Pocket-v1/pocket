-- Bank SMS import (additive only). Phone forwards bank SMS to the sms-ingest edge function,
-- which parses it and stores it as a pending item the user reviews in the app.

create table if not exists public.sms_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null unique default (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  created_at timestamptz not null default now()
);

create table if not exists public.account_sms_config (
  account_id uuid primary key references public.financial_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  senders text[] not null default '{}',
  card_last4 text[] not null default '{}',
  default_category text,
  default_subcategory text,
  debit_keywords text[] not null default '{}',
  credit_keywords text[] not null default '{}',
  amount_pattern text,
  updated_at timestamptz not null default now()
);

create table if not exists public.sms_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.financial_accounts(id) on delete set null,
  sender text,
  body text not null,
  received_at timestamptz not null default now(),
  txn_type text check (txn_type in ('Income','Expense')),
  amount numeric,
  merchant text,
  category text,
  status text not null default 'pending' check (status in ('pending','approved','dismissed')),
  transaction_id uuid,
  body_hash text,
  created_at timestamptz not null default now()
);
create index if not exists sms_inbox_user_status_idx on public.sms_inbox(user_id, status, received_at desc);
create index if not exists sms_inbox_hash_idx on public.sms_inbox(user_id, body_hash, created_at desc);

alter table public.sms_tokens enable row level security;
alter table public.account_sms_config enable row level security;
alter table public.sms_inbox enable row level security;

drop policy if exists sms_tokens_owner on public.sms_tokens;
create policy sms_tokens_owner on public.sms_tokens for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists account_sms_config_owner on public.account_sms_config;
create policy account_sms_config_owner on public.account_sms_config for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.financial_accounts a where a.id = account_id and a.user_id = (select auth.uid())));

drop policy if exists sms_inbox_owner on public.sms_inbox;
create policy sms_inbox_owner on public.sms_inbox for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

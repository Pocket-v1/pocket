-- Money I lent to someone ("Owed to me"). Additive only.
create table if not exists public.loans_given (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  person text not null,
  amount numeric not null check (amount > 0),
  account_id uuid,
  lent_on date not null default current_date,
  note text,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.loans_given enable row level security;
drop policy if exists "own loans_given select" on public.loans_given;
drop policy if exists "own loans_given insert" on public.loans_given;
drop policy if exists "own loans_given update" on public.loans_given;
drop policy if exists "own loans_given delete" on public.loans_given;
create policy "own loans_given select" on public.loans_given for select using (user_id = auth.uid());
create policy "own loans_given insert" on public.loans_given for insert with check (user_id = auth.uid());
create policy "own loans_given update" on public.loans_given for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own loans_given delete" on public.loans_given for delete using (user_id = auth.uid());
create index if not exists loans_given_user_idx on public.loans_given(user_id);
alter table public.transactions add column if not exists loan_given_id uuid references public.loans_given(id) on delete set null;
create index if not exists transactions_loan_given_idx on public.transactions(loan_given_id);

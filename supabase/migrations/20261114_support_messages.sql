-- Messages users send from Help & contact. Saved here and emailed to the support inbox. Additive only.
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null default 'other' check (topic in ('problem','plus','idea','other')),
  message text not null check (char_length(message) between 1 and 4000),
  page text,
  device text,
  email_sent boolean not null default false,
  status text not null default 'new' check (status in ('new','replied','closed')),
  created_at timestamptz not null default now()
);
create index if not exists support_messages_created_idx on public.support_messages(created_at desc);
alter table public.support_messages enable row level security;
drop policy if exists support_select_own_or_admin on public.support_messages;
create policy support_select_own_or_admin on public.support_messages for select to authenticated
  using (user_id = auth.uid() or public.is_forma_admin());
drop policy if exists support_update_admin on public.support_messages;
create policy support_update_admin on public.support_messages for update to authenticated
  using (public.is_forma_admin()) with check (public.is_forma_admin());

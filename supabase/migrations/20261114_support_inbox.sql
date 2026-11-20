-- In-app inbox: each support_messages row is a conversation; support_replies holds the messages after the first one. Additive only.
alter table public.support_messages add column if not exists last_at timestamptz not null default now();
alter table public.support_messages add column if not exists user_read_at timestamptz not null default now();
alter table public.support_messages add column if not exists owner_read_at timestamptz;
alter table public.support_messages add column if not exists last_from_owner boolean not null default false;

create table if not exists public.support_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_messages(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  from_owner boolean not null default false,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists support_replies_thread_idx on public.support_replies(thread_id, created_at);
alter table public.support_replies enable row level security;
drop policy if exists support_replies_select on public.support_replies;
create policy support_replies_select on public.support_replies for select to authenticated
  using (public.is_forma_admin() or exists (select 1 from public.support_messages t where t.id = thread_id and t.user_id = auth.uid()));
drop policy if exists support_replies_insert on public.support_replies;
create policy support_replies_insert on public.support_replies for insert to authenticated
  with check (sender_id = auth.uid() and (
    (from_owner and public.is_forma_admin()) or
    (not from_owner and exists (select 1 from public.support_messages t where t.id = thread_id and t.user_id = auth.uid()))));

create or replace function public.support_reply_touch() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.from_owner then
    update public.support_messages set last_at = new.created_at, status = 'replied', last_from_owner = true, owner_read_at = new.created_at where id = new.thread_id;
  else
    update public.support_messages set last_at = new.created_at, status = 'new', last_from_owner = false, user_read_at = new.created_at where id = new.thread_id;
  end if;
  return null;
end $$;
drop trigger if exists support_reply_touch on public.support_replies;
create trigger support_reply_touch after insert on public.support_replies for each row execute function public.support_reply_touch();

create or replace function public.support_mark_read(p_thread uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if public.is_forma_admin() then
    update public.support_messages set owner_read_at = now() where id = p_thread;
  else
    update public.support_messages set user_read_at = now() where id = p_thread and user_id = auth.uid();
  end if;
end $$;
revoke all on function public.support_mark_read(uuid) from public, anon;
grant execute on function public.support_mark_read(uuid) to authenticated;
revoke all on function public.support_reply_touch() from public, anon, authenticated;

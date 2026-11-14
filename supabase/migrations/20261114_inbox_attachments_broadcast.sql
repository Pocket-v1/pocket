-- Inbox: screenshots on messages, and a message from the Owner to every user. Additive only.
alter table public.support_messages add column if not exists attachment_path text;
alter table public.support_messages add column if not exists started_by_owner boolean not null default false;
alter table public.support_replies add column if not exists attachment_path text;

-- Screenshots live in the receipts bucket under <user id>/support/. The user reads their own folder already;
-- an Owner can read and add files in any user's support folder (to see screenshots and reply with one).
drop policy if exists receipts_select_support_admin on storage.objects;
create policy receipts_select_support_admin on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[2] = 'support' and public.is_forma_admin());
drop policy if exists receipts_insert_support_admin on storage.objects;
create policy receipts_insert_support_admin on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[2] = 'support' and public.is_forma_admin());

-- A file on a message must sit in the conversation owner's support folder.
create or replace function public.support_reply_guard() returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_id uuid;
begin
  if new.attachment_path is not null then
    select user_id into owner_id from public.support_messages where id = new.thread_id;
    if split_part(new.attachment_path, '/', 1) <> owner_id::text or split_part(new.attachment_path, '/', 2) <> 'support' then new.attachment_path := null; end if;
  end if;
  return new;
end $$;
drop trigger if exists support_reply_guard on public.support_replies;
create trigger support_reply_guard before insert on public.support_replies for each row execute function public.support_reply_guard();
revoke all on function public.support_reply_guard() from public, anon, authenticated;

-- Owner: send one message to every user (or only users in p_user_ids). Each user gets it as a new conversation in their Inbox.
create or replace function public.support_broadcast(p_message text, p_user_ids uuid[] default null) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_forma_admin() then raise exception 'Only an Owner can do this'; end if;
  if coalesce(trim(p_message), '') = '' then raise exception 'Write a message first'; end if;
  insert into public.support_messages (user_id, topic, message, status, started_by_owner, last_from_owner, last_at, user_read_at, owner_read_at, page)
  select p.id, 'other', left(trim(p_message), 4000), 'replied', true, true, now(), now() - interval '1 second', now(), 'Message to all users'
  from public.profiles p
  where p.role = 'user' and (p_user_ids is null or p.id = any(p_user_ids));
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.support_broadcast(text, uuid[]) from public, anon;
grant execute on function public.support_broadcast(text, uuid[]) to authenticated;

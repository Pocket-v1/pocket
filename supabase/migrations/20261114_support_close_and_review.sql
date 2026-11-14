-- Owner ends a chat; the user rates it (stars + comment). Additive only.
alter table public.support_messages add column if not exists closed_at timestamptz;
alter table public.support_messages add column if not exists rating smallint check (rating between 1 and 5);
alter table public.support_messages add column if not exists review text;
alter table public.support_messages add column if not exists rated_at timestamptz;

create or replace function public.support_close(p_thread uuid, p_open boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_forma_admin() then raise exception 'Only an Owner can do this'; end if;
  if p_open then
    update public.support_messages set status = case when last_from_owner then 'replied' else 'new' end, closed_at = null where id = p_thread;
  else
    update public.support_messages set status = 'closed', closed_at = now() where id = p_thread;
  end if;
end $$;
revoke all on function public.support_close(uuid, boolean) from public, anon;
grant execute on function public.support_close(uuid, boolean) to authenticated;

create or replace function public.support_rate(p_thread uuid, p_rating int, p_review text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Pick 1 to 5 stars'; end if;
  update public.support_messages set rating = p_rating, review = nullif(left(trim(coalesce(p_review, '')), 1000), ''), rated_at = now()
  where id = p_thread and user_id = auth.uid() and status = 'closed' and rated_at is null;
end $$;
revoke all on function public.support_rate(uuid, int, text) from public, anon;
grant execute on function public.support_rate(uuid, int, text) to authenticated;

drop policy if exists support_replies_insert on public.support_replies;
create policy support_replies_insert on public.support_replies for insert to authenticated
  with check (sender_id = auth.uid() and (
    (from_owner and public.is_forma_admin()) or
    (not from_owner and exists (select 1 from public.support_messages t where t.id = thread_id and t.user_id = auth.uid() and t.status <> 'closed'))));

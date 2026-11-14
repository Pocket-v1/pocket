create or replace function public.username_available(p_username text)
returns boolean language sql stable security definer set search_path = ''
as $$ select not exists (select 1 from public.profiles p where lower(p.username) = lower(btrim(p_username))); $$;
revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

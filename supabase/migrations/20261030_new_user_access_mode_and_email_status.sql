-- 1) When "Require access requests" is OFF, brand-new users get full workspace access automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_role text;
  v_requests_on boolean;
  v_features text[];
begin
  v_role := 'user';
  select coalesce((value)::text <> 'false', true) into v_requests_on from public.app_settings where key = 'access_requests_enabled';
  v_requests_on := coalesce(v_requests_on, true);
  v_features := case when v_role = 'user' and not v_requests_on
    then array['overview','transactions','accounts','calendar','budgets','goals','subscriptions','debts','insights','expense_categories','vehicle_management']
    else '{}'::text[] end;
  insert into public.profiles (id,email,username,first_name,last_name,gender,full_name,role,enabled_features,created_at,updated_at)
  values (
    new.id,
    case when coalesce(new.raw_user_meta_data ->> 'username','') <> '' and coalesce(new.email,'') like '%@users.pocket.local' then '' else coalesce(new.email,'') end,
    nullif(new.raw_user_meta_data ->> 'username',''),
    nullif(new.raw_user_meta_data ->> 'first_name',''),
    nullif(new.raw_user_meta_data ->> 'last_name',''),
    coalesce(new.raw_user_meta_data ->> 'gender','prefer_not_to_say'),
    coalesce(new.raw_user_meta_data ->> 'full_name',''),
    v_role, v_features, now(), now()
  )
  on conflict (id) do update set
    email = case when excluded.email <> '' then excluded.email else public.profiles.email end,
    username = coalesce(excluded.username, public.profiles.username),
    first_name = coalesce(nullif(excluded.first_name,''), public.profiles.first_name),
    last_name = coalesce(nullif(excluded.last_name,''), public.profiles.last_name),
    gender = coalesce(nullif(excluded.gender,''), public.profiles.gender),
    full_name = case when excluded.full_name <> '' then excluded.full_name else public.profiles.full_name end,
    role = public.profiles.role,
    updated_at=now();
  return new;
end;
$$;

-- 2) Admin-only email status lookup (new function; existing admin_list_users is left untouched).
create or replace function public.admin_list_user_email_status()
returns table(user_id uuid, email_verified boolean)
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not public.is_forma_admin() then raise exception 'Admin access required'; end if;
  return query select u.id, (u.email_confirmed_at is not null) from auth.users u;
end;
$$;
revoke all on function public.admin_list_user_email_status() from public, anon;
grant execute on function public.admin_list_user_email_status() to authenticated;

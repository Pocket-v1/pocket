-- No email is written in the code any more: every new sign-up starts as a regular user.
-- Owners stay owners (their role is kept in profiles); new owners are set by an Owner.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.handle_new_user'::regproc);
  d := replace(d, $q$v_role := case when lower(coalesce(new.email,'')) = 'mahmoudadel240@gmail.com' then 'owner' else 'user' end;$q$, $q$v_role := 'user';$q$);
  d := replace(d, $q$role = case when lower(excluded.email)='mahmoudadel240@gmail.com' then 'owner' else public.profiles.role end,$q$, $q$role = public.profiles.role,$q$);
  if position('mahmoudadel240' in d) > 0 then raise exception 'email still in handle_new_user'; end if;
  execute d;
end $$;

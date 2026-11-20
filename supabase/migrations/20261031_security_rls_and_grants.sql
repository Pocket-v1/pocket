-- Security hardening (no data is touched; only who is allowed to do what).
-- 1) Owner-only policies now apply to signed-in users only (they used to apply to the "public" role,
--    which includes anonymous visitors; auth.uid() was null for them so they saw nothing, but it is cleaner).
do $$
declare t text; old text;
begin
  foreach t in array array['budgets','debts','financial_accounts','recurring_payments','savings_goals','transactions','user_settings'] loop
    select policyname into old from pg_policies
      where schemaname='public' and tablename=t and cmd='ALL' and roles='{public}' limit 1;
    execute format('drop policy if exists %I on public.%I', 'Owner access', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', 'Owner access', t);
    if old is not null and old <> 'Owner access' then execute format('drop policy %I on public.%I', old, t); end if;
  end loop;
end $$;

-- 2) Table privileges: anonymous visitors never need direct table access; signed-in users do not need
--    TRUNCATE / TRIGGER / REFERENCES (RLS does not cover TRUNCATE).
do $$
declare r record;
begin
  for r in select tablename from pg_tables where schemaname='public' loop
    execute format('revoke all on public.%I from anon', r.tablename);
    execute format('revoke truncate, trigger, references on public.%I from authenticated', r.tablename);
  end loop;
end $$;
alter default privileges in schema public revoke all on tables from anon;

-- 3) Functions: only signed-in users may run the payment RPC; the ownership trigger function is internal.
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname='mark_recurring_payment_paid' loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated', r.sig);
  end loop;
  for r in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname='pocket_validate_vehicle_ownership' loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;
end $$;

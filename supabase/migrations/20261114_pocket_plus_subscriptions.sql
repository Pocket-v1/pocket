-- Pocket Plus subscriptions (additive only).
-- Plus unlocks Bank SMS and the chat. Payments start manual (InstaPay / Vodafone Cash) and the Owner confirms them.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'plus' check (plan in ('plus')),
  period text not null default 'monthly' check (period in ('monthly','yearly','trial','gift')),
  status text not null check (status in ('trial','pending','active','rejected','expired','cancelled')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  payment_method text check (payment_method in ('instapay','wallet','card','fawry','gift')),
  payment_ref text,
  payer_handle text,
  amount numeric(12,2),
  confirmed_by uuid references auth.users(id),
  confirmed_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions(user_id, created_at desc);
alter table public.subscriptions enable row level security;

drop policy if exists "subs_select_own_or_admin" on public.subscriptions;
create policy "subs_select_own_or_admin" on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or public.is_forma_admin());
drop policy if exists "subs_insert_own_or_admin" on public.subscriptions;
create policy "subs_insert_own_or_admin" on public.subscriptions for insert to authenticated
  with check (user_id = auth.uid() or public.is_forma_admin());
drop policy if exists "subs_update_own_or_admin" on public.subscriptions;
create policy "subs_update_own_or_admin" on public.subscriptions for update to authenticated
  using (user_id = auth.uid() or public.is_forma_admin())
  with check (user_id = auth.uid() or public.is_forma_admin());

-- Regular users can only start one free trial or send a payment for review; only the Owner turns a plan on.
create or replace function public.pocket_guard_subscription()
returns trigger language plpgsql security definer set search_path = '' as $$
declare trial_days int;
begin
  new.updated_at := now();
  if public.is_forma_admin() then
    if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
      new.confirmed_by := auth.uid(); new.confirmed_at := now();
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.confirmed_by := null; new.confirmed_at := null; new.admin_note := null; new.cancel_at_period_end := false;
    if new.status = 'trial' then
      if exists (select 1 from public.subscriptions s where s.user_id = auth.uid()) then
        raise exception 'The free trial was already used';
      end if;
      select coalesce((value->>'trial_days')::int, 14) into trial_days from public.app_settings where key = 'plus';
      new.period := 'trial'; new.trial_ends_at := now() + make_interval(days => coalesce(trial_days, 14));
      new.current_period_end := null; new.payment_method := null; new.amount := null;
    elsif new.status = 'pending' then
      if new.period not in ('monthly','yearly') or new.payment_method not in ('instapay','wallet') then
        raise exception 'Choose monthly or yearly and InstaPay or a wallet';
      end if;
      new.trial_ends_at := null; new.current_period_end := null;
    else
      raise exception 'Not allowed';
    end if;
    return new;
  end if;
  -- UPDATE by the user: only "cancel at the end of the period"
  new.user_id := old.user_id; new.plan := old.plan; new.period := old.period; new.status := old.status;
  new.trial_ends_at := old.trial_ends_at; new.current_period_end := old.current_period_end;
  new.payment_method := old.payment_method; new.payment_ref := old.payment_ref; new.payer_handle := old.payer_handle;
  new.amount := old.amount; new.confirmed_by := old.confirmed_by; new.confirmed_at := old.confirmed_at;
  new.admin_note := old.admin_note; new.created_at := old.created_at;
  return new;
end $$;
drop trigger if exists pocket_guard_subscription on public.subscriptions;
create trigger pocket_guard_subscription before insert or update on public.subscriptions
  for each row execute function public.pocket_guard_subscription();

-- Default Plus settings the Owner can change (prices, trial length, where to send money)
insert into public.app_settings (key, value, updated_at)
values ('plus', '{"monthly_price":0,"yearly_price":0,"trial_days":14,"instapay":"","wallet":"","currency":"EGP"}'::jsonb, now())
on conflict (key) do nothing;

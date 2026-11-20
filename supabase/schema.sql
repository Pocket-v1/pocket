-- Forma Personal Finance System — Supabase schema
-- Run this in Supabase Dashboard > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_date date not null default current_date,
  type text not null check (type in ('Income','Expense','Transfer')),
  category text not null,
  subcategory text,
  description text not null default '',
  amount numeric(14,2) not null check (amount >= 0),
  need_want text check (need_want in ('Need','Want')),
  fixed_variable text check (fixed_variable in ('Fixed','Variable')),
  payment_method text not null default 'Cash',
  recurring boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);

-- Accounts and wallets. The account_id on a transaction is optional for backwards compatibility.
create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'Bank account',
  opening_balance numeric(14,2) not null default 0,
  opening_balance_date date not null default current_date,
  color text not null default '#6c7cf5',
  created_at timestamptz not null default now()
);
alter table public.financial_accounts add column if not exists opening_balance_date date;
update public.financial_accounts set opening_balance_date = coalesce(created_at::date, current_date) where opening_balance_date is null;
alter table public.financial_accounts alter column opening_balance_date set default current_date;
alter table public.financial_accounts alter column opening_balance_date set not null;

alter table public.transactions add column if not exists account_id uuid references public.financial_accounts(id) on delete set null;
alter table public.transactions add column if not exists to_account_id uuid references public.financial_accounts(id) on delete set null;
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check check (type in ('Income','Expense','Transfer'));
create index if not exists financial_accounts_user_idx on public.financial_accounts(user_id, created_at);

-- Debt and installment tracking (manual tracker; no lender/payment integrations).
create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  lender text not null default '',
  original_amount numeric(14,2) not null default 0 check (original_amount >= 0),
  remaining_amount numeric(14,2) not null default 0 check (remaining_amount >= 0),
  monthly_payment numeric(14,2) not null default 0 check (monthly_payment >= 0),
  due_date date,
  frequency text not null default 'Monthly' check (frequency in ('Weekly','Monthly','Quarterly','Yearly')),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists debts_user_due_idx on public.debts(user_id, due_date);


create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  month date not null,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now(),
  unique(user_id, category, month)
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal_type text not null default 'Other',
  target_amount numeric(14,2) not null default 0 check (target_amount >= 0),
  saved_amount numeric(14,2) not null default 0 check (saved_amount >= 0),
  target_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.recurring_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Bills',
  subcategory text,
  amount numeric(14,2) not null default 0 check (amount >= 0),
  frequency text not null default 'Monthly' check (frequency in ('Weekly','Monthly','Quarterly','Yearly')),
  next_due_date date,
  auto_pay boolean not null default false,
  paid_this_cycle boolean not null default false,
  last_paid_date date,
  account_id uuid references public.financial_accounts(id) on delete set null,
  essential boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
-- Compatibility columns used by the current Pocket forms (safe for existing databases).
alter table public.savings_goals add column if not exists goal_type text not null default 'Other';
alter table public.recurring_payments add column if not exists subcategory text;
alter table public.recurring_payments add column if not exists account_id uuid references public.financial_accounts(id) on delete set null;

alter table public.savings_goals enable row level security;
alter table public.recurring_payments enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.debts enable row level security;

do $$ declare t text; begin
  foreach t in array array['transactions','budgets','savings_goals','recurring_payments','financial_accounts','debts'] loop
    execute format('drop policy if exists "Users manage own %s" on public.%I', t, t);
    execute format('create policy "Users manage own %s" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
  end loop;
end $$;


-- Optional profile table for account display name.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Create/update a profile when a new auth account is registered.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set full_name = excluded.full_name;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Safe migration for existing projects that created recurring_payments before last_paid_date was added.
alter table public.recurring_payments add column if not exists last_paid_date date;

-- Atomically record a recurring payment and advance its next due date.
-- This function only records the payment in Forma; it does not transfer money.
drop function if exists public.mark_recurring_payment_paid(uuid, date);
create or replace function public.mark_recurring_payment_paid(p_payment_id uuid, p_paid_date date default current_date, p_account_id uuid default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment public.recurring_payments%rowtype;
  v_base_date date;
  v_next_due date;
  v_account public.financial_accounts%rowtype;
  v_inflow numeric(14,2);
  v_outflow numeric(14,2);
  v_available numeric(14,2);
begin
  select * into v_payment
  from public.recurring_payments
  where id = p_payment_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Recurring payment not found or access denied';
  end if;

  if v_payment.last_paid_date is not null and v_payment.next_due_date is not null
     and p_paid_date < v_payment.next_due_date then
    raise exception 'This recurring payment has already been recorded for the current cycle';
  end if;

  if p_account_id is null then
    raise exception 'Choose an account or wallet for this recurring payment before marking it paid';
  end if;
  select * into v_account from public.financial_accounts
    where id = p_account_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Account not found or access denied';
  end if;
  select coalesce(sum(amount),0) into v_inflow from public.transactions
    where user_id = auth.uid() and ((type = 'Income' and account_id = p_account_id) or (type = 'Transfer' and to_account_id = p_account_id));
  select coalesce(sum(amount),0) into v_outflow from public.transactions
    where user_id = auth.uid() and type in ('Expense','Transfer') and account_id = p_account_id;
  v_available := coalesce(v_account.opening_balance,0) + v_inflow - v_outflow;
  if v_payment.amount > v_available then
    raise exception 'Insufficient balance in account. Available balance: %', v_available;
  end if;

  v_base_date := coalesce(v_payment.next_due_date, p_paid_date);
  v_next_due := case v_payment.frequency
    when 'Weekly' then (v_base_date + interval '7 days')::date
    when 'Monthly' then (v_base_date + interval '1 month')::date
    when 'Quarterly' then (v_base_date + interval '3 months')::date
    when 'Yearly' then (v_base_date + interval '1 year')::date
    else (v_base_date + interval '1 month')::date
  end;
  while v_next_due <= p_paid_date loop
    v_next_due := case v_payment.frequency
      when 'Weekly' then (v_next_due + interval '7 days')::date
      when 'Monthly' then (v_next_due + interval '1 month')::date
      when 'Quarterly' then (v_next_due + interval '3 months')::date
      when 'Yearly' then (v_next_due + interval '1 year')::date
      else (v_next_due + interval '1 month')::date
    end;
  end loop;

  insert into public.transactions
    (user_id, transaction_date, type, category, subcategory, description, amount, need_want, fixed_variable, payment_method, account_id, recurring, notes)
  values
    (auth.uid(), p_paid_date, 'Expense', coalesce(v_payment.category, 'Bills'), v_payment.subcategory,
     'Recurring payment: ' || v_payment.name, v_payment.amount, 'Need', 'Fixed', v_account.name, p_account_id, true,
     'Generated from recurring payment ' || v_payment.name);

  update public.recurring_payments
  set next_due_date = v_next_due, last_paid_date = p_paid_date, paid_this_cycle = true
  where id = p_payment_id and user_id = auth.uid();
end;
$$;
revoke all on function public.mark_recurring_payment_paid(uuid, date, uuid) from public;
grant execute on function public.mark_recurring_payment_paid(uuid, date, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Role-based access control and per-user feature visibility.
-- The owner is fixed by email; browser metadata never grants a role.
-- New users start as ordinary users with no optional features enabled.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists enabled_features text[] not null default '{}'::text[];
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('owner','super_admin','user'));

-- Backfill emails for existing profiles, (roles are kept as they are).
update public.profiles p
set email = coalesce(u.email, p.email, ''),
    full_name = coalesce(nullif(p.full_name,''), u.raw_user_meta_data ->> 'full_name', ''),
    updated_at = now()
from auth.users u
where u.id = p.id;

-- Owners are set by an existing Owner in the app; no email is written here.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  v_role := 'user';
  insert into public.profiles (id,email,full_name,role,enabled_features,created_at,updated_at)
  values (new.id, coalesce(new.email,''), coalesce(new.raw_user_meta_data ->> 'full_name',''), v_role, '{}'::text[], now(), now())
  on conflict (id) do update
    set email=excluded.email,
        full_name=case when excluded.full_name<>'' then excluded.full_name else public.profiles.full_name end,
        role = public.profiles.role,
        updated_at=now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_forma_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('owner','super_admin')
  );
$$;

-- Global UI permissions/settings. Regular users may read settings, but only admins may change them.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "Authenticated users can read app settings" on public.app_settings;
create policy "Authenticated users can read app settings" on public.app_settings
  for select to authenticated using (true);
drop policy if exists "Admins can insert app settings" on public.app_settings;
create policy "Admins can insert app settings" on public.app_settings
  for insert to authenticated with check (public.is_forma_admin());
drop policy if exists "Admins can update app settings" on public.app_settings;
create policy "Admins can update app settings" on public.app_settings
  for update to authenticated using (public.is_forma_admin()) with check (public.is_forma_admin());
grant select, insert, update on public.app_settings to authenticated;
insert into public.app_settings(key,value) values ('backup_restore_for_users','false'::jsonb)
on conflict (key) do nothing;


alter table public.profiles enable row level security;
drop policy if exists "Users manage own profile" on public.profiles;
drop policy if exists "Profiles readable by self or admins" on public.profiles;
drop policy if exists "Users update own profile name" on public.profiles;
create policy "Profiles readable by self or admins" on public.profiles
for select to authenticated using (id = auth.uid() or public.is_forma_admin());
create policy "Users update own profile name" on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Prevent users from editing their own role, email, or feature grants via the table API.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, updated_at) on public.profiles to authenticated;

drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  role text,
  enabled_features text[],
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_forma_admin() then
    raise exception 'Admin access required';
  end if;
  return query
    select p.id, p.email, p.full_name, p.role, p.enabled_features, p.created_at
    from public.profiles p
    order by p.created_at desc nulls last, p.email asc;
end;
$$;

create or replace function public.admin_update_user_access(
  p_target_user_id uuid,
  p_enabled_features text[] default null,
  p_role text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
  v_target_role text;
  v_allowed_features constant text[] := array[
    'overview','transactions','accounts','calendar','budgets','goals',
    'subscriptions','debts','insights','reports','expense_categories'
  ];
begin
  select p.role into v_actor_role from public.profiles p where p.id = auth.uid();
  if coalesce(v_actor_role,'') not in ('owner','super_admin') then
    raise exception 'Admin access required';
  end if;

  select p.role into v_target_role from public.profiles p where p.id = p_target_user_id for update;
  if not found then raise exception 'User profile not found'; end if;
  if v_target_role = 'owner' then raise exception 'The owner account cannot be modified here'; end if;

  if p_enabled_features is not null then
    if exists (select 1 from unnest(p_enabled_features) f where not (f = any(v_allowed_features))) then
      raise exception 'Unknown feature key';
    end if;
    update public.profiles
      set enabled_features = array(select distinct f from unnest(p_enabled_features) f where f = any(v_allowed_features)),
          updated_at = now()
      where id = p_target_user_id;
  end if;

  if p_role is not null then
    if v_actor_role <> 'owner' then raise exception 'Only the owner can change account roles'; end if;
    if p_role not in ('user','super_admin') then raise exception 'Invalid role'; end if;
    update public.profiles set role=p_role, updated_at=now() where id=p_target_user_id;
  end if;
end;
$$;

revoke all on function public.is_forma_admin() from public;
revoke all on function public.admin_list_users() from public;
revoke all on function public.admin_update_user_access(uuid,text[],text) from public;
grant execute on function public.is_forma_admin() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_update_user_access(uuid,text[],text) to authenticated;
-- Pocket: support transfers between accounts/wallets.
-- Run in Supabase SQL Editor before deploying the updated app.
alter table public.transactions add column if not exists to_account_id uuid references public.financial_accounts(id) on delete set null;
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check check (type in ('Income','Expense','Transfer'));
-- Pocket: persist transaction subcategories. Run in Supabase SQL Editor before deploying.
alter table public.transactions add column if not exists subcategory text;
-- Allows the owner/super admins to delete a user's Auth account and cascade their personal data.
-- The owner cannot be deleted. Super admins cannot delete themselves or other super admins.
create or replace function public.admin_delete_user(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
  v_target_role text;
begin
  select p.role into v_actor_role from public.profiles p where p.id = auth.uid();
  if coalesce(v_actor_role,'') not in ('owner','super_admin') then
    raise exception 'Admin access required';
  end if;
  if p_target_user_id = auth.uid() then raise exception 'You cannot delete your own account here'; end if;
  select p.role into v_target_role from public.profiles p where p.id = p_target_user_id for update;
  if not found then raise exception 'User not found'; end if;
  if v_target_role = 'owner' then raise exception 'The owner account cannot be deleted'; end if;
  if v_actor_role <> 'owner' and v_target_role = 'super_admin' then
    raise exception 'Only the owner can delete a super admin';
  end if;
  delete from auth.users where id = p_target_user_id;
  if not found then raise exception 'Auth user not found'; end if;
end;
$$;
revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
-- Pocket: remove legacy category labels and keep only the new category system.
-- Safe to rerun: transaction amounts/dates are preserved; when both an old and
-- new budget exist for the same user/month, the existing NEW budget is kept.

-- Transactions: move old category labels into the new category hierarchy.
update public.transactions
set category = 'Housing', subcategory = coalesce(nullif(btrim(subcategory), ''), 'Rent')
where type = 'Expense' and lower(btrim(category)) = 'rent';

update public.transactions
set category = 'Food & Groceries', subcategory = coalesce(nullif(btrim(subcategory), ''), 'Groceries')
where type = 'Expense' and lower(btrim(category)) = 'food';

update public.transactions
set category = 'Bills & Utilities', subcategory = coalesce(nullif(btrim(subcategory), ''), 'Other bill')
where type = 'Expense' and lower(btrim(category)) = 'bills';

update public.transactions
set category = 'Bills & Utilities', subcategory = coalesce(nullif(btrim(subcategory), ''), 'Mobile bill')
where type = 'Expense' and lower(btrim(category)) = 'mobile bill';

update public.transactions
set category = 'Education', subcategory = coalesce(nullif(btrim(subcategory), ''), 'Courses')
where type = 'Expense' and lower(btrim(category)) = 'training';

update public.transactions
set category = 'Other', subcategory = coalesce(nullif(btrim(subcategory), ''), 'Other expense')
where type = 'Expense' and lower(btrim(category)) = 'personal care';

-- Budgets: discard old duplicate rows if the corresponding new category already
-- exists for the same user/month; otherwise rename the old row to the new label.
begin;
create temporary table if not exists pocket_legacy_budget_map (
  old_category text primary key,
  new_category text not null
) on commit drop;
truncate table pocket_legacy_budget_map;
insert into pocket_legacy_budget_map(old_category,new_category) values
  ('Rent','Housing'),
  ('Food','Food & Groceries'),
  ('Bills','Bills & Utilities'),
  ('Mobile Bill','Bills & Utilities'),
  ('Training','Education'),
  ('Personal Care','Other');

delete from public.budgets old
using pocket_legacy_budget_map m, public.budgets newer
where lower(btrim(old.category)) = lower(m.old_category)
  and newer.user_id = old.user_id
  and newer.month = old.month
  and newer.category = m.new_category;

update public.budgets b
set category = m.new_category
from pocket_legacy_budget_map m
where lower(btrim(b.category)) = lower(m.old_category);
commit;

drop table if exists pocket_legacy_budget_map;

-- Recurring payments: normalize old labels to the new category names.
update public.recurring_payments set category = 'Housing' where lower(btrim(category)) = 'rent';
update public.recurring_payments set category = 'Food & Groceries' where lower(btrim(category)) = 'food';
update public.recurring_payments set category = 'Bills & Utilities' where lower(btrim(category)) in ('bills','mobile bill');
update public.recurring_payments set category = 'Education' where lower(btrim(category)) = 'training';
update public.recurring_payments set category = 'Other' where lower(btrim(category)) = 'personal care';

-- Collapse duplicate legacy/new budget labels case-insensitively, preferring the
-- exact new category label if any duplicate remains after the mapping above.


-- Compatibility columns used by the current Pocket add/edit wizards.
alter table public.recurring_payments add column if not exists subcategory text;
alter table public.recurring_payments add column if not exists account_id uuid references public.financial_accounts(id) on delete set null;
alter table public.debts add column if not exists debt_type text not null default 'Other';

-- Loan schedule and installment tracking (backwards-compatible for existing debts).
alter table public.debts add column if not exists start_date date;
alter table public.debts add column if not exists term_months integer;
alter table public.debts add column if not exists total_repayment numeric(14,2);
alter table public.debts add column if not exists interest_rate numeric(8,4);
alter table public.debts add column if not exists paid_installments integer not null default 0;
alter table public.debts add column if not exists amount_paid numeric(14,2) not null default 0;
update public.debts set total_repayment = coalesce(total_repayment, original_amount, 0), interest_rate = coalesce(interest_rate, 0), paid_installments = coalesce(paid_installments, 0), amount_paid = coalesce(amount_paid, greatest(0, coalesce(total_repayment, original_amount, 0) - coalesce(remaining_amount, 0)));

-- Savings goal linkage for transfers (safe to run on existing projects).
alter table public.transactions add column if not exists goal_id uuid null references public.savings_goals(id) on delete set null;
create index if not exists transactions_goal_id_idx on public.transactions(goal_id) where goal_id is not null;

-- Private access request log; emails are sent only by the request-access Edge Function.
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null default '',
  user_name text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
create index if not exists access_requests_user_created_idx on public.access_requests(user_id, created_at desc);
alter table public.access_requests enable row level security;
drop policy if exists "Users can view own access requests" on public.access_requests;
create policy "Users can view own access requests" on public.access_requests for select to authenticated using (auth.uid() = user_id);
revoke all on public.access_requests from anon, authenticated;
grant select on public.access_requests to authenticated;

-- Link repayment transactions to the debt record they reduce.
alter table public.transactions add column if not exists debt_id uuid null references public.debts(id) on delete set null;
create index if not exists transactions_debt_id_idx on public.transactions(debt_id);


-- Create one protected Goals savings account for every Pocket user.
-- Apply in Supabase SQL Editor. Safe to run more than once.

alter table public.financial_accounts
  add column if not exists is_system boolean not null default false;

-- Drop the guard temporarily so this migration remains safe to re-run.
drop trigger if exists protect_goals_system_account_changes on public.financial_accounts;

-- Mark any legacy account matching the reserved name as the system account,
-- then ensure one exists for every current auth user.
update public.financial_accounts
set name = 'Goals', type = 'Savings account', opening_balance = 0, color = '#50b99a'
where is_system = true;

update public.financial_accounts a
set is_system = true, name = 'Goals', type = 'Savings account', opening_balance = 0, color = '#50b99a'
where lower(trim(a.name)) = 'goals'
  and a.is_system = false
  and not exists (
    select 1 from public.financial_accounts existing
    where existing.user_id = a.user_id and existing.is_system = true
  )
  and a.id = (
    select candidate.id from public.financial_accounts candidate
    where candidate.user_id = a.user_id and lower(trim(candidate.name)) = 'goals'
    order by candidate.created_at, candidate.id limit 1
  );

create unique index if not exists financial_accounts_one_system_account_per_user
  on public.financial_accounts(user_id)
  where is_system = true;

create or replace function public.ensure_goals_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.financial_accounts(user_id, name, type, opening_balance, color, is_system)
  values (p_user_id, 'Goals', 'Savings account', 0, '#50b99a', true)
  on conflict (user_id) where is_system = true do nothing;
end;
$$;

revoke all on function public.ensure_goals_account(uuid) from public, anon, authenticated;

create or replace function public.create_goals_account_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_goals_account(new.id);
  return new;
end;
$$;

drop trigger if exists create_goals_account_after_signup on auth.users;
create trigger create_goals_account_after_signup
after insert on auth.users
for each row execute function public.create_goals_account_for_new_user();

revoke all on function public.create_goals_account_for_new_user() from public, anon, authenticated;

-- Backfill accounts for all users created before this migration.
do $$
declare user_row record;
begin
  for user_row in select id from auth.users loop
    perform public.ensure_goals_account(user_row.id);
  end loop;
end;
$$;

-- The Goals account is system-managed and cannot be renamed, edited, or deleted.
create or replace function public.protect_goals_system_account()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_system = true and current_user not in ('postgres', 'supabase_admin', 'service_role') then
      raise exception 'System accounts can only be created by Pocket.';
    end if;
    if lower(trim(new.name)) = 'goals' and new.is_system = false then
      raise exception 'The name Goals is reserved for the system savings account.';
    end if;
    return new;
  end if;
  -- Allow the system Goals account to be removed only as part of a
  -- cascading deletion of its owning user. Direct user-initiated deletion
  -- remains blocked.
  if tg_op = 'DELETE' and old.is_system = true and pg_trigger_depth() > 1 then
    return old;
  end if;
  if old.is_system = true then
    raise exception 'The system Goals account cannot be edited or deleted.';
  end if;
  if tg_op = 'UPDATE' and lower(trim(new.name)) = 'goals' and new.is_system = false then
    raise exception 'The name Goals is reserved for the system savings account.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_goals_system_account() from public, anon, authenticated;

drop trigger if exists protect_goals_system_account_changes on public.financial_accounts;
create trigger protect_goals_system_account_changes
before insert or update or delete on public.financial_accounts
for each row execute function public.protect_goals_system_account();


-- Link each debt to the account used to pay its installments.
alter table public.debts add column if not exists account_id uuid references public.financial_accounts(id) on delete set null;
create index if not exists debts_user_account_idx on public.debts(user_id, account_id);

-- Pocket: support username-based accounts created by Owner / Super Admin.
-- Run this migration in Supabase SQL Editor before deploying the app/function.

alter table public.profiles add column if not exists username text;
update public.profiles
set username = 'user_' || left(id::text, 8)
where username is null or btrim(username) = '';
create unique index if not exists profiles_username_lower_unique on public.profiles (lower(username));

-- Update profile creation trigger to persist usernames for both normal signups and managed accounts.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare v_role text;
begin
  v_role := 'user';
  insert into public.profiles (id,email,username,full_name,role,enabled_features,created_at,updated_at)
  values (
    new.id,
    case when coalesce(new.raw_user_meta_data ->> 'username','') <> '' and coalesce(new.email,'') like '%@users.pocket.local' then '' else coalesce(new.email,'') end,
    nullif(new.raw_user_meta_data ->> 'username',''),
    coalesce(new.raw_user_meta_data ->> 'full_name',''),
    v_role, '{}'::text[], now(), now()
  )
  on conflict (id) do update set
    email = case when excluded.email <> '' then excluded.email else public.profiles.email end,
    username = coalesce(excluded.username, public.profiles.username),
    full_name = case when excluded.full_name <> '' then excluded.full_name else public.profiles.full_name end,
    role = public.profiles.role,
    updated_at=now();
  return new;
end;
$$;

-- Include username in the admin user list. Drop first because PostgreSQL cannot change a table-returning function's output type in place.
drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  username text,
  full_name text,
  role text,
  enabled_features text[],
  created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_forma_admin() then raise exception 'Admin access required'; end if;
  return query
    select p.id, p.email, p.username, p.full_name, p.role, p.enabled_features, p.created_at
    from public.profiles p
    order by p.created_at desc nulls last, p.username asc nulls last, p.email asc;
end;
$$;
revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

-- ============================================================================
-- CONSOLIDATED MIGRATIONS
-- This section includes the project migrations so the full schema can be run
-- once from Supabase Dashboard > SQL Editor. Statements are preserved below.
-- ============================================================================


-- ============================================================================
-- BEGIN MIGRATION: 20261018_access_requests.sql
-- ============================================================================
-- Private access-request log. The admin email is kept server-side, never sent to the browser.
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null default '',
  user_name text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
create index if not exists access_requests_user_created_idx on public.access_requests(user_id, created_at desc);
alter table public.access_requests enable row level security;
drop policy if exists "Users can view own access requests" on public.access_requests;
create policy "Users can view own access requests" on public.access_requests for select to authenticated using (auth.uid() = user_id);
-- Inserts are performed by the Edge Function with the service role after validating the caller.
revoke all on public.access_requests from anon, authenticated;
grant select on public.access_requests to authenticated;
-- END MIGRATION: 20261018_access_requests.sql


-- ============================================================================
-- BEGIN MIGRATION: 20261018_debt_amount_paid.sql
-- ============================================================================
-- Add actual amount-paid tracking to debt records without deleting existing data.
alter table public.debts add column if not exists amount_paid numeric(14,2) not null default 0;

-- Backfill existing records using the previous total repayment and remaining balance,
-- where available. This keeps previously tracked progress instead of resetting it.
update public.debts
set amount_paid = greatest(
  0,
  coalesce(total_repayment, original_amount, 0) - coalesce(remaining_amount, 0)
)
where amount_paid is null or amount_paid = 0;
-- END MIGRATION: 20261018_debt_amount_paid.sql


-- ============================================================================
-- BEGIN MIGRATION: 20261018_debt_linked_account.sql
-- ============================================================================
-- Link each debt to the account used to pay its installments.
alter table public.debts
  add column if not exists account_id uuid references public.financial_accounts(id) on delete set null;

create index if not exists debts_user_account_idx on public.debts(user_id, account_id);

-- Existing debts remain editable; assign an account to each existing debt in the app before recording a new installment.
-- END MIGRATION: 20261018_debt_linked_account.sql


-- ============================================================================
-- BEGIN MIGRATION: 20261018_debt_repayment_schedule.sql
-- ============================================================================
-- Adds loan term details and installment tracking without deleting existing debt data.
alter table public.debts add column if not exists start_date date;
alter table public.debts add column if not exists term_months integer;
alter table public.debts add column if not exists total_repayment numeric(14,2);
alter table public.debts add column if not exists interest_rate numeric(8,4);
alter table public.debts add column if not exists paid_installments integer not null default 0;
update public.debts
set total_repayment = coalesce(total_repayment, original_amount, 0),
    interest_rate = coalesce(interest_rate, 0),
    paid_installments = coalesce(paid_installments, 0);
-- END MIGRATION: 20261018_debt_repayment_schedule.sql


-- ============================================================================
-- BEGIN MIGRATION: 20261018_expense_categories.sql
-- ============================================================================
-- Per-user Expense Categories for Pocket. Run in Supabase SQL Editor.
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 50),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists expense_categories_user_idx on public.expense_categories(user_id, name);
alter table public.expense_categories enable row level security;
drop policy if exists "Users can view own expense categories" on public.expense_categories;
create policy "Users can view own expense categories" on public.expense_categories for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can add own expense categories" on public.expense_categories;
create policy "Users can add own expense categories" on public.expense_categories for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own expense categories" on public.expense_categories;
create policy "Users can update own expense categories" on public.expense_categories for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own expense categories" on public.expense_categories;
create policy "Users can delete own expense categories" on public.expense_categories for delete to authenticated using (auth.uid() = user_id);
-- Seed each existing user with the current built-in expense categories. Safe to run more than once.
insert into public.expense_categories (user_id, name)
select u.id, c.name
from auth.users u
cross join (values
 ('Housing'),('Food & Groceries'),('Transportation'),('Bills & Utilities'),('Health'),('Shopping'),('Entertainment'),('Education'),('Travel'),('Savings & Debt'),('Family & Giving'),('Other'),('Beauty & Skincare'),('Hair & Nails'),('Personal & Period Care'),('Fashion & Styling'),('Grooming & Personal Care'),('Fitness & Sports'),('Style & Accessories'),('Car & Gear')
) as c(name)
on conflict (user_id, name) do nothing;
-- END MIGRATION: 20261018_expense_categories.sql


-- ============================================================================
-- BEGIN MIGRATION: 20261018_expense_category_visibility.sql
-- ============================================================================
-- Allow each user to choose which expense categories appear in transaction forms.
-- Run once in Supabase SQL Editor after the expense_categories table exists.
alter table public.expense_categories
  add column if not exists is_enabled boolean not null default true;
-- END MIGRATION: 20261018_expense_category_visibility.sql


-- ============================================================================
-- BEGIN MIGRATION: 20261018_goal_save_fix.sql
-- ============================================================================
-- Pocket: fix goal creation/editing for the current Goals wizard.
-- The UI submits goal_type; older schemas did not include this column.
-- Safe to run more than once.
alter table public.savings_goals
  add column if not exists goal_type text not null default 'Other';

-- Keep recurring payment schema aligned with the Add Payment wizard.
alter table public.recurring_payments
  add column if not exists subcategory text;
-- END MIGRATION: 20261018_goal_save_fix.sql


-- ============================================================================
-- BEGIN MIGRATION: 20261018_goals_system_account.sql
-- ============================================================================
-- Create one protected Goals savings account for every Pocket user.
-- Apply in Supabase SQL Editor. Safe to run more than once.

alter table public.financial_accounts
  add column if not exists is_system boolean not null default false;

-- Drop the guard temporarily so this migration remains safe to re-run.
drop trigger if exists protect_goals_system_account_changes on public.financial_accounts;

-- Mark any legacy account matching the reserved name as the system account,
-- then ensure one exists for every current auth user.
update public.financial_accounts
set name = 'Goals', type = 'Savings account', opening_balance = 0, color = '#50b99a'
where is_system = true;

update public.financial_accounts a
set is_system = true, name = 'Goals', type = 'Savings account', opening_balance = 0, color = '#50b99a'
where lower(trim(a.name)) = 'goals'
  and a.is_system = false
  and not exists (
    select 1 from public.financial_accounts existing
    where existing.user_id = a.user_id and existing.is_system = true
  )
  and a.id = (
    select candidate.id from public.financial_accounts candidate
    where candidate.user_id = a.user_id and lower(trim(candidate.name)) = 'goals'
    order by candidate.created_at, candidate.id limit 1
  );

create unique index if not exists financial_accounts_one_system_account_per_user
  on public.financial_accounts(user_id)
  where is_system = true;

create or replace function public.ensure_goals_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.financial_accounts(user_id, name, type, opening_balance, color, is_system)
  values (p_user_id, 'Goals', 'Savings account', 0, '#50b99a', true)
  on conflict (user_id) where is_system = true do nothing;
end;
$$;

revoke all on function public.ensure_goals_account(uuid) from public, anon, authenticated;

create or replace function public.create_goals_account_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_goals_account(new.id);
  return new;
end;
$$;

drop trigger if exists create_goals_account_after_signup on auth.users;
create trigger create_goals_account_after_signup
after insert on auth.users
for each row execute function public.create_goals_account_for_new_user();

revoke all on function public.create_goals_account_for_new_user() from public, anon, authenticated;

-- Backfill accounts for all users created before this migration.
do $$
declare user_row record;
begin
  for user_row in select id from auth.users loop
    perform public.ensure_goals_account(user_row.id);
  end loop;
end;
$$;

-- The Goals account is system-managed and cannot be renamed, edited, or deleted.
create or replace function public.protect_goals_system_account()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_system = true and current_user not in ('postgres', 'supabase_admin', 'service_role') then
      raise exception 'System accounts can only be created by Pocket.';
    end if;
    if lower(trim(new.name)) = 'goals' and new.is_system = false then
      raise exception 'The name Goals is reserved for the system savings account.';
    end if;
    return new;
  end if;
  -- Allow the system Goals account to be removed only as part of a
  -- cascading deletion of its owning user. Direct user-initiated deletion
  -- remains blocked.
  if tg_op = 'DELETE' and old.is_system = true and pg_trigger_depth() > 1 then
    return old;
  end if;
  if old.is_system = true then
    raise exception 'The system Goals account cannot be edited or deleted.';
  end if;
  if tg_op = 'UPDATE' and lower(trim(new.name)) = 'goals' and new.is_system = false then
    raise exception 'The name Goals is reserved for the system savings account.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_goals_system_account() from public, anon, authenticated;

drop trigger if exists protect_goals_system_account_changes on public.financial_accounts;
create trigger protect_goals_system_account_changes
before insert or update or delete on public.financial_accounts
for each row execute function public.protect_goals_system_account();
-- END MIGRATION: 20261018_goals_system_account.sql


-- ============================================================================
-- BEGIN MIGRATION: 20261018_recurring_account_link.sql
-- ============================================================================
-- Link recurring payments to a Pocket account and record paid items against its balance.
-- Safe to run on an existing project; existing payment records are preserved.
alter table public.recurring_payments
  add column if not exists account_id uuid references public.financial_accounts(id) on delete set null;

drop function if exists public.mark_recurring_payment_paid(uuid, date);
create or replace function public.mark_recurring_payment_paid(p_payment_id uuid, p_paid_date date default current_date, p_account_id uuid default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment public.recurring_payments%rowtype;
  v_base_date date;
  v_next_due date;
  v_account public.financial_accounts%rowtype;
  v_inflow numeric(14,2);
  v_outflow numeric(14,2);
  v_available numeric(14,2);
begin
  select * into v_payment
  from public.recurring_payments
  where id = p_payment_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Recurring payment not found or access denied';
  end if;

  if v_payment.last_paid_date is not null and v_payment.next_due_date is not null
     and p_paid_date < v_payment.next_due_date then
    raise exception 'This recurring payment has already been recorded for the current cycle';
  end if;

  if p_account_id is null then
    raise exception 'Choose an account or wallet for this recurring payment before marking it paid';
  end if;
  select * into v_account from public.financial_accounts
    where id = p_account_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Account not found or access denied';
  end if;
  select coalesce(sum(amount),0) into v_inflow from public.transactions
    where user_id = auth.uid() and ((type = 'Income' and account_id = p_account_id) or (type = 'Transfer' and to_account_id = p_account_id));
  select coalesce(sum(amount),0) into v_outflow from public.transactions
    where user_id = auth.uid() and type in ('Expense','Transfer') and account_id = p_account_id;
  v_available := coalesce(v_account.opening_balance,0) + v_inflow - v_outflow;
  if v_payment.amount > v_available then
    raise exception 'Insufficient balance in account. Available balance: %', v_available;
  end if;

  v_base_date := coalesce(v_payment.next_due_date, p_paid_date);
  v_next_due := case v_payment.frequency
    when 'Weekly' then (v_base_date + interval '7 days')::date
    when 'Monthly' then (v_base_date + interval '1 month')::date
    when 'Quarterly' then (v_base_date + interval '3 months')::date
    when 'Yearly' then (v_base_date + interval '1 year')::date
    else (v_base_date + interval '1 month')::date
  end;
  while v_next_due <= p_paid_date loop
    v_next_due := case v_payment.frequency
      when 'Weekly' then (v_next_due + interval '7 days')::date
      when 'Monthly' then (v_next_due + interval '1 month')::date
      when 'Quarterly' then (v_next_due + interval '3 months')::date
      when 'Yearly' then (v_next_due + interval '1 year')::date
      else (v_next_due + interval '1 month')::date
    end;
  end loop;

  insert into public.transactions
    (user_id, transaction_date, type, category, subcategory, description, amount, need_want, fixed_variable, payment_method, account_id, recurring, notes)
  values
    (auth.uid(), p_paid_date, 'Expense', coalesce(v_payment.category, 'Bills'), v_payment.subcategory,
     'Recurring payment: ' || v_payment.name, v_payment.amount, 'Need', 'Fixed', v_account.name, p_account_id, true,
     'Generated from recurring payment ' || v_payment.name);

  update public.recurring_payments
  set next_due_date = v_next_due, last_paid_date = p_paid_date, paid_this_cycle = true
  where id = p_payment_id and user_id = auth.uid();
end;
$$;
revoke all on function public.mark_recurring_payment_paid(uuid, date, uuid) from public;
grant execute on function public.mark_recurring_payment_paid(uuid, date, uuid) to authenticated;
-- END MIGRATION: 20261018_recurring_account_link.sql


-- ============================================================================
-- BEGIN MIGRATION: 20261018_savings_goal_transaction_link.sql
-- ============================================================================
-- Link a transfer to a savings goal without classifying the transfer as income or expense.
alter table public.transactions add column if not exists goal_id uuid null references public.savings_goals(id) on delete set null;
create index if not exists transactions_goal_id_idx on public.transactions(goal_id) where goal_id is not null;
-- END MIGRATION: 20261018_savings_goal_transaction_link.sql


-- ============================================================================
-- BEGIN MIGRATION: 20261018_transaction_debt_link.sql
-- ============================================================================
-- Link debt installment transactions to the debt they repay.
-- Safe to run on existing projects; preserves existing transaction data.
alter table public.transactions add column if not exists debt_id uuid null references public.debts(id) on delete set null;
create index if not exists transactions_debt_id_idx on public.transactions(debt_id);
-- END MIGRATION: 20261018_transaction_debt_link.sql


-- ============================================================================
-- BEGIN MIGRATION: 20261020_admin_create_username_users.sql
-- ============================================================================
-- Pocket: support username-based accounts created by Owner / Super Admin.
-- Run this migration in Supabase SQL Editor before deploying the app/function.

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists gender text not null default 'prefer_not_to_say';

update public.profiles set
  first_name = coalesce(nullif(first_name, ''), split_part(btrim(full_name), ' ', 1)),
  last_name = coalesce(nullif(last_name, ''), nullif(btrim(regexp_replace(btrim(full_name), '^\S+\s*', '')), ''))
where first_name is null or first_name = '' or last_name is null;
update public.profiles
set username = 'user_' || left(id::text, 8)
where username is null or btrim(username) = '';
create unique index if not exists profiles_username_lower_unique on public.profiles (lower(username));

-- Update profile creation trigger to persist usernames for both normal signups and managed accounts.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare v_role text;
begin
  v_role := 'user';
  insert into public.profiles (id,email,username,first_name,last_name,gender,full_name,role,enabled_features,created_at,updated_at)
  values (
    new.id,
    case when coalesce(new.raw_user_meta_data ->> 'username','') <> '' and coalesce(new.email,'') like '%@users.pocket.local' then '' else coalesce(new.email,'') end,
    nullif(new.raw_user_meta_data ->> 'username',''),
    nullif(new.raw_user_meta_data ->> 'first_name',''),
    nullif(new.raw_user_meta_data ->> 'last_name',''),
    coalesce(new.raw_user_meta_data ->> 'gender','prefer_not_to_say'),
    coalesce(new.raw_user_meta_data ->> 'full_name',''),
    v_role, '{}'::text[], now(), now()
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

-- Include username in the admin user list. Drop first because PostgreSQL cannot change a table-returning function's output type in place.
drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  username text,
  full_name text,
  first_name text,
  last_name text,
  gender text,
  role text,
  enabled_features text[],
  created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_forma_admin() then raise exception 'Admin access required'; end if;
  return query
    select p.id, p.email, p.username, p.full_name, p.first_name, p.last_name, p.gender, p.role, p.enabled_features, p.created_at
    from public.profiles p
    order by p.created_at desc nulls last, p.username asc nulls last, p.email asc;
end;
$$;
revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;
-- END MIGRATION: 20261020_admin_create_username_users.sql


-- ============================================================================
-- BEGIN MIGRATION: 20261020_expense_subcategories.sql
-- ============================================================================
create table if not exists public.expense_subcategories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_name text not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint expense_subcategories_name_nonempty check (length(trim(name)) > 0),
  constraint expense_subcategories_unique_per_category unique (user_id, category_name, name)
);

alter table public.expense_subcategories enable row level security;

drop policy if exists "Users can view their own expense subcategories" on public.expense_subcategories;
create policy "Users can view their own expense subcategories"
  on public.expense_subcategories for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own expense subcategories" on public.expense_subcategories;
create policy "Users can insert their own expense subcategories"
  on public.expense_subcategories for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own expense subcategories" on public.expense_subcategories;
create policy "Users can update their own expense subcategories"
  on public.expense_subcategories for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own expense subcategories" on public.expense_subcategories;
create policy "Users can delete their own expense subcategories"
  on public.expense_subcategories for delete to authenticated
  using (auth.uid() = user_id);
-- END MIGRATION: 20261020_expense_subcategories.sql


-- ============================================================================
-- BEGIN MIGRATION: 20261020_user_profile_name_gender.sql
-- ============================================================================
-- Pocket user profile names and gender for managed account creation. Safe to run once via Supabase migrations.
-- Pocket: support username-based accounts created by Owner / Super Admin.
-- Run this migration in Supabase SQL Editor before deploying the app/function.

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists gender text not null default 'prefer_not_to_say';

update public.profiles set
  first_name = coalesce(nullif(first_name, ''), split_part(btrim(full_name), ' ', 1)),
  last_name = coalesce(nullif(last_name, ''), nullif(btrim(regexp_replace(btrim(full_name), '^\S+\s*', '')), ''))
where first_name is null or first_name = '' or last_name is null;
update public.profiles
set username = 'user_' || left(id::text, 8)
where username is null or btrim(username) = '';
create unique index if not exists profiles_username_lower_unique on public.profiles (lower(username));

-- Update profile creation trigger to persist usernames for both normal signups and managed accounts.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare v_role text;
begin
  v_role := 'user';
  insert into public.profiles (id,email,username,first_name,last_name,gender,full_name,role,enabled_features,created_at,updated_at)
  values (
    new.id,
    case when coalesce(new.raw_user_meta_data ->> 'username','') <> '' and coalesce(new.email,'') like '%@users.pocket.local' then '' else coalesce(new.email,'') end,
    nullif(new.raw_user_meta_data ->> 'username',''),
    nullif(new.raw_user_meta_data ->> 'first_name',''),
    nullif(new.raw_user_meta_data ->> 'last_name',''),
    coalesce(new.raw_user_meta_data ->> 'gender','prefer_not_to_say'),
    coalesce(new.raw_user_meta_data ->> 'full_name',''),
    v_role, '{}'::text[], now(), now()
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

-- Include username in the admin user list. Drop first because PostgreSQL cannot change a table-returning function's output type in place.
drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  username text,
  full_name text,
  first_name text,
  last_name text,
  gender text,
  role text,
  enabled_features text[],
  created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_forma_admin() then raise exception 'Admin access required'; end if;
  return query
    select p.id, p.email, p.username, p.full_name, p.first_name, p.last_name, p.gender, p.role, p.enabled_features, p.created_at
    from public.profiles p
    order by p.created_at desc nulls last, p.username asc nulls last, p.email asc;
end;
$$;
revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;
-- END MIGRATION: 20261020_user_profile_name_gender.sql

-- ============================================================
-- Consolidated migration SQL (kept in schema.sql only)
-- ============================================================


-- Source: 20261018_access_requests.sql
-- Private access-request log. The admin email is kept server-side, never sent to the browser.
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_email text not null default '',
  user_name text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','denied')),
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
create index if not exists access_requests_user_created_idx on public.access_requests(user_id, created_at desc);
alter table public.access_requests enable row level security;
drop policy if exists "Users can view own access requests" on public.access_requests;
create policy "Users can view own access requests" on public.access_requests for select to authenticated using (auth.uid() = user_id);
-- Inserts are performed by the Edge Function with the service role after validating the caller.
revoke all on public.access_requests from anon, authenticated;
grant select on public.access_requests to authenticated;


-- Source: 20261018_debt_amount_paid.sql
-- Add actual amount-paid tracking to debt records without deleting existing data.
alter table public.debts add column if not exists amount_paid numeric(14,2) not null default 0;

-- Backfill existing records using the previous total repayment and remaining balance,
-- where available. This keeps previously tracked progress instead of resetting it.
update public.debts
set amount_paid = greatest(
  0,
  coalesce(total_repayment, original_amount, 0) - coalesce(remaining_amount, 0)
)
where amount_paid is null or amount_paid = 0;


-- Source: 20261018_debt_linked_account.sql
-- Link each debt to the account used to pay its installments.
alter table public.debts
  add column if not exists account_id uuid references public.financial_accounts(id) on delete set null;

create index if not exists debts_user_account_idx on public.debts(user_id, account_id);

-- Existing debts remain editable; assign an account to each existing debt in the app before recording a new installment.


-- Source: 20261018_debt_repayment_schedule.sql
-- Adds loan term details and installment tracking without deleting existing debt data.
alter table public.debts add column if not exists start_date date;
alter table public.debts add column if not exists term_months integer;
alter table public.debts add column if not exists total_repayment numeric(14,2);
alter table public.debts add column if not exists interest_rate numeric(8,4);
alter table public.debts add column if not exists paid_installments integer not null default 0;
update public.debts
set total_repayment = coalesce(total_repayment, original_amount, 0),
    interest_rate = coalesce(interest_rate, 0),
    paid_installments = coalesce(paid_installments, 0);


-- Source: 20261018_expense_categories.sql
-- Per-user Expense Categories for Pocket. Run in Supabase SQL Editor.
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 50),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists expense_categories_user_idx on public.expense_categories(user_id, name);
alter table public.expense_categories enable row level security;
drop policy if exists "Users can view own expense categories" on public.expense_categories;
create policy "Users can view own expense categories" on public.expense_categories for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can add own expense categories" on public.expense_categories;
create policy "Users can add own expense categories" on public.expense_categories for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own expense categories" on public.expense_categories;
create policy "Users can update own expense categories" on public.expense_categories for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own expense categories" on public.expense_categories;
create policy "Users can delete own expense categories" on public.expense_categories for delete to authenticated using (auth.uid() = user_id);
-- Seed each existing user with the current built-in expense categories. Safe to run more than once.
insert into public.expense_categories (user_id, name)
select u.id, c.name
from auth.users u
cross join (values
 ('Housing'),('Food & Groceries'),('Transportation'),('Bills & Utilities'),('Health'),('Shopping'),('Entertainment'),('Education'),('Travel'),('Savings & Debt'),('Family & Giving'),('Other'),('Beauty & Skincare'),('Hair & Nails'),('Personal & Period Care'),('Fashion & Styling'),('Grooming & Personal Care'),('Fitness & Sports'),('Style & Accessories'),('Car & Gear')
) as c(name)
on conflict (user_id, name) do nothing;


-- Source: 20261018_expense_category_visibility.sql
-- Allow each user to choose which expense categories appear in transaction forms.
-- Run once in Supabase SQL Editor after the expense_categories table exists.
alter table public.expense_categories
  add column if not exists is_enabled boolean not null default true;


-- Source: 20261018_goal_save_fix.sql
-- Pocket: fix goal creation/editing for the current Goals wizard.
-- The UI submits goal_type; older schemas did not include this column.
-- Safe to run more than once.
alter table public.savings_goals
  add column if not exists goal_type text not null default 'Other';

-- Keep recurring payment schema aligned with the Add Payment wizard.
alter table public.recurring_payments
  add column if not exists subcategory text;


-- Source: 20261018_goals_system_account.sql
-- Create one protected Goals savings account for every Pocket user.
-- Apply in Supabase SQL Editor. Safe to run more than once.

alter table public.financial_accounts
  add column if not exists is_system boolean not null default false;

-- Drop the guard temporarily so this migration remains safe to re-run.
drop trigger if exists protect_goals_system_account_changes on public.financial_accounts;

-- Mark any legacy account matching the reserved name as the system account,
-- then ensure one exists for every current auth user.
update public.financial_accounts
set name = 'Goals', type = 'Savings account', opening_balance = 0, color = '#50b99a'
where is_system = true;

update public.financial_accounts a
set is_system = true, name = 'Goals', type = 'Savings account', opening_balance = 0, color = '#50b99a'
where lower(trim(a.name)) = 'goals'
  and a.is_system = false
  and not exists (
    select 1 from public.financial_accounts existing
    where existing.user_id = a.user_id and existing.is_system = true
  )
  and a.id = (
    select candidate.id from public.financial_accounts candidate
    where candidate.user_id = a.user_id and lower(trim(candidate.name)) = 'goals'
    order by candidate.created_at, candidate.id limit 1
  );

create unique index if not exists financial_accounts_one_system_account_per_user
  on public.financial_accounts(user_id)
  where is_system = true;

create or replace function public.ensure_goals_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.financial_accounts(user_id, name, type, opening_balance, color, is_system)
  values (p_user_id, 'Goals', 'Savings account', 0, '#50b99a', true)
  on conflict (user_id) where is_system = true do nothing;
end;
$$;

revoke all on function public.ensure_goals_account(uuid) from public, anon, authenticated;

create or replace function public.create_goals_account_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_goals_account(new.id);
  return new;
end;
$$;

drop trigger if exists create_goals_account_after_signup on auth.users;
create trigger create_goals_account_after_signup
after insert on auth.users
for each row execute function public.create_goals_account_for_new_user();

revoke all on function public.create_goals_account_for_new_user() from public, anon, authenticated;

-- Backfill accounts for all users created before this migration.
do $$
declare user_row record;
begin
  for user_row in select id from auth.users loop
    perform public.ensure_goals_account(user_row.id);
  end loop;
end;
$$;

-- The Goals account is system-managed and cannot be renamed, edited, or deleted.
create or replace function public.protect_goals_system_account()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_system = true and current_user not in ('postgres', 'supabase_admin', 'service_role') then
      raise exception 'System accounts can only be created by Pocket.';
    end if;
    if lower(trim(new.name)) = 'goals' and new.is_system = false then
      raise exception 'The name Goals is reserved for the system savings account.';
    end if;
    return new;
  end if;
  -- Allow the system Goals account to be removed only as part of a
  -- cascading deletion of its owning user. Direct user-initiated deletion
  -- remains blocked.
  if tg_op = 'DELETE' and old.is_system = true and pg_trigger_depth() > 1 then
    return old;
  end if;
  if old.is_system = true then
    raise exception 'The system Goals account cannot be edited or deleted.';
  end if;
  if tg_op = 'UPDATE' and lower(trim(new.name)) = 'goals' and new.is_system = false then
    raise exception 'The name Goals is reserved for the system savings account.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_goals_system_account() from public, anon, authenticated;

drop trigger if exists protect_goals_system_account_changes on public.financial_accounts;
create trigger protect_goals_system_account_changes
before insert or update or delete on public.financial_accounts
for each row execute function public.protect_goals_system_account();


-- Source: 20261018_recurring_account_link.sql
-- Link recurring payments to a Pocket account and record paid items against its balance.
-- Safe to run on an existing project; existing payment records are preserved.
alter table public.recurring_payments
  add column if not exists account_id uuid references public.financial_accounts(id) on delete set null;

drop function if exists public.mark_recurring_payment_paid(uuid, date);
create or replace function public.mark_recurring_payment_paid(p_payment_id uuid, p_paid_date date default current_date, p_account_id uuid default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment public.recurring_payments%rowtype;
  v_base_date date;
  v_next_due date;
  v_account public.financial_accounts%rowtype;
  v_inflow numeric(14,2);
  v_outflow numeric(14,2);
  v_available numeric(14,2);
begin
  select * into v_payment
  from public.recurring_payments
  where id = p_payment_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Recurring payment not found or access denied';
  end if;

  if v_payment.last_paid_date is not null and v_payment.next_due_date is not null
     and p_paid_date < v_payment.next_due_date then
    raise exception 'This recurring payment has already been recorded for the current cycle';
  end if;

  if p_account_id is null then
    raise exception 'Choose an account or wallet for this recurring payment before marking it paid';
  end if;
  select * into v_account from public.financial_accounts
    where id = p_account_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Account not found or access denied';
  end if;
  select coalesce(sum(amount),0) into v_inflow from public.transactions
    where user_id = auth.uid() and ((type = 'Income' and account_id = p_account_id) or (type = 'Transfer' and to_account_id = p_account_id));
  select coalesce(sum(amount),0) into v_outflow from public.transactions
    where user_id = auth.uid() and type in ('Expense','Transfer') and account_id = p_account_id;
  v_available := coalesce(v_account.opening_balance,0) + v_inflow - v_outflow;
  if v_payment.amount > v_available then
    raise exception 'Insufficient balance in account. Available balance: %', v_available;
  end if;

  v_base_date := coalesce(v_payment.next_due_date, p_paid_date);
  v_next_due := case v_payment.frequency
    when 'Weekly' then (v_base_date + interval '7 days')::date
    when 'Monthly' then (v_base_date + interval '1 month')::date
    when 'Quarterly' then (v_base_date + interval '3 months')::date
    when 'Yearly' then (v_base_date + interval '1 year')::date
    else (v_base_date + interval '1 month')::date
  end;
  while v_next_due <= p_paid_date loop
    v_next_due := case v_payment.frequency
      when 'Weekly' then (v_next_due + interval '7 days')::date
      when 'Monthly' then (v_next_due + interval '1 month')::date
      when 'Quarterly' then (v_next_due + interval '3 months')::date
      when 'Yearly' then (v_next_due + interval '1 year')::date
      else (v_next_due + interval '1 month')::date
    end;
  end loop;

  insert into public.transactions
    (user_id, transaction_date, type, category, subcategory, description, amount, need_want, fixed_variable, payment_method, account_id, recurring, notes)
  values
    (auth.uid(), p_paid_date, 'Expense', coalesce(v_payment.category, 'Bills'), v_payment.subcategory,
     'Recurring payment: ' || v_payment.name, v_payment.amount, 'Need', 'Fixed', v_account.name, p_account_id, true,
     'Generated from recurring payment ' || v_payment.name);

  update public.recurring_payments
  set next_due_date = v_next_due, last_paid_date = p_paid_date, paid_this_cycle = true
  where id = p_payment_id and user_id = auth.uid();
end;
$$;
revoke all on function public.mark_recurring_payment_paid(uuid, date, uuid) from public;
grant execute on function public.mark_recurring_payment_paid(uuid, date, uuid) to authenticated;


-- Source: 20261018_savings_goal_transaction_link.sql
-- Link a transfer to a savings goal without classifying the transfer as income or expense.
alter table public.transactions add column if not exists goal_id uuid null references public.savings_goals(id) on delete set null;
create index if not exists transactions_goal_id_idx on public.transactions(goal_id) where goal_id is not null;


-- Source: 20261018_transaction_debt_link.sql
-- Link debt installment transactions to the debt they repay.
-- Safe to run on existing projects; preserves existing transaction data.
alter table public.transactions add column if not exists debt_id uuid null references public.debts(id) on delete set null;
create index if not exists transactions_debt_id_idx on public.transactions(debt_id);


-- Source: 20261020_admin_create_username_users.sql
-- Pocket: support username-based accounts created by Owner / Super Admin.
-- Run this migration in Supabase SQL Editor before deploying the app/function.

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists gender text not null default 'prefer_not_to_say';

update public.profiles set
  first_name = coalesce(nullif(first_name, ''), split_part(btrim(full_name), ' ', 1)),
  last_name = coalesce(nullif(last_name, ''), nullif(btrim(regexp_replace(btrim(full_name), '^\S+\s*', '')), ''))
where first_name is null or first_name = '' or last_name is null;
update public.profiles
set username = 'user_' || left(id::text, 8)
where username is null or btrim(username) = '';
create unique index if not exists profiles_username_lower_unique on public.profiles (lower(username));

-- Update profile creation trigger to persist usernames for both normal signups and managed accounts.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare v_role text;
begin
  v_role := 'user';
  insert into public.profiles (id,email,username,first_name,last_name,gender,full_name,role,enabled_features,created_at,updated_at)
  values (
    new.id,
    case when coalesce(new.raw_user_meta_data ->> 'username','') <> '' and coalesce(new.email,'') like '%@users.pocket.local' then '' else coalesce(new.email,'') end,
    nullif(new.raw_user_meta_data ->> 'username',''),
    nullif(new.raw_user_meta_data ->> 'first_name',''),
    nullif(new.raw_user_meta_data ->> 'last_name',''),
    coalesce(new.raw_user_meta_data ->> 'gender','prefer_not_to_say'),
    coalesce(new.raw_user_meta_data ->> 'full_name',''),
    v_role, '{}'::text[], now(), now()
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

-- Include username in the admin user list. Drop first because PostgreSQL cannot change a table-returning function's output type in place.
drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  username text,
  full_name text,
  first_name text,
  last_name text,
  gender text,
  role text,
  enabled_features text[],
  created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_forma_admin() then raise exception 'Admin access required'; end if;
  return query
    select p.id, p.email, p.username, p.full_name, p.first_name, p.last_name, p.gender, p.role, p.enabled_features, p.created_at
    from public.profiles p
    order by p.created_at desc nulls last, p.username asc nulls last, p.email asc;
end;
$$;
revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;


-- Source: 20261020_admin_delete_user.sql
-- Pocket: allow authorized admins to delete non-owner Auth users.
-- Apply this migration to the connected Supabase project before testing Delete User.
create or replace function public.admin_delete_user(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_role text;
  v_target_role text;
begin
  select p.role into v_actor_role
  from public.profiles p
  where p.id = auth.uid();

  if coalesce(v_actor_role, '') not in ('owner', 'super_admin') then
    raise exception 'Admin access required';
  end if;

  if p_target_user_id = auth.uid() then
    raise exception 'You cannot delete your own account here';
  end if;

  select p.role into v_target_role
  from public.profiles p
  where p.id = p_target_user_id
  for update;

  if not found then
    raise exception 'User not found';
  end if;

  if v_target_role = 'owner' then
    raise exception 'The owner account cannot be deleted';
  end if;

  if v_actor_role <> 'owner' and v_target_role = 'super_admin' then
    raise exception 'Only the owner can delete a super admin';
  end if;

  delete from auth.users where id = p_target_user_id;
  if not found then
    raise exception 'Auth user not found';
  end if;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;


-- Source: 20261020_expense_subcategories.sql
create table if not exists public.expense_subcategories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_name text not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint expense_subcategories_name_nonempty check (length(trim(name)) > 0),
  constraint expense_subcategories_unique_per_category unique (user_id, category_name, name)
);

alter table public.expense_subcategories enable row level security;

drop policy if exists "Users can view their own expense subcategories" on public.expense_subcategories;
create policy "Users can view their own expense subcategories"
  on public.expense_subcategories for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own expense subcategories" on public.expense_subcategories;
create policy "Users can insert their own expense subcategories"
  on public.expense_subcategories for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own expense subcategories" on public.expense_subcategories;
create policy "Users can update their own expense subcategories"
  on public.expense_subcategories for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own expense subcategories" on public.expense_subcategories;
create policy "Users can delete their own expense subcategories"
  on public.expense_subcategories for delete to authenticated
  using (auth.uid() = user_id);


-- Source: 20261020_user_profile_name_gender.sql
-- Pocket user profile names and gender for managed account creation. Safe to run once via Supabase migrations.
-- Pocket: support username-based accounts created by Owner / Super Admin.
-- Run this migration in Supabase SQL Editor before deploying the app/function.

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists gender text not null default 'prefer_not_to_say';

update public.profiles set
  first_name = coalesce(nullif(first_name, ''), split_part(btrim(full_name), ' ', 1)),
  last_name = coalesce(nullif(last_name, ''), nullif(btrim(regexp_replace(btrim(full_name), '^\S+\s*', '')), ''))
where first_name is null or first_name = '' or last_name is null;
update public.profiles
set username = 'user_' || left(id::text, 8)
where username is null or btrim(username) = '';
create unique index if not exists profiles_username_lower_unique on public.profiles (lower(username));

-- Update profile creation trigger to persist usernames for both normal signups and managed accounts.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare v_role text;
begin
  v_role := 'user';
  insert into public.profiles (id,email,username,first_name,last_name,gender,full_name,role,enabled_features,created_at,updated_at)
  values (
    new.id,
    case when coalesce(new.raw_user_meta_data ->> 'username','') <> '' and coalesce(new.email,'') like '%@users.pocket.local' then '' else coalesce(new.email,'') end,
    nullif(new.raw_user_meta_data ->> 'username',''),
    nullif(new.raw_user_meta_data ->> 'first_name',''),
    nullif(new.raw_user_meta_data ->> 'last_name',''),
    coalesce(new.raw_user_meta_data ->> 'gender','prefer_not_to_say'),
    coalesce(new.raw_user_meta_data ->> 'full_name',''),
    v_role, '{}'::text[], now(), now()
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

-- Include username in the admin user list. Drop first because PostgreSQL cannot change a table-returning function's output type in place.
drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (
  user_id uuid,
  email text,
  username text,
  full_name text,
  first_name text,
  last_name text,
  gender text,
  role text,
  enabled_features text[],
  created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_forma_admin() then raise exception 'Admin access required'; end if;
  return query
    select p.id, p.email, p.username, p.full_name, p.first_name, p.last_name, p.gender, p.role, p.enabled_features, p.created_at
    from public.profiles p
    order by p.created_at desc nulls last, p.username asc nulls last, p.email asc;
end;
$$;
revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;


-- Per-user settings are stored in Supabase so preferences follow the account across devices.
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
drop policy if exists "Users manage own settings" on public.user_settings;
create policy "Users manage own settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Normalize legacy case/whitespace duplicate expense category names per user.
-- Preserve the oldest category spelling, remap subcategories to it, then remove duplicate category rows.
do $$
declare
  dup record;
  canonical_name text;
begin
  for dup in
    select user_id, lower(trim(name)) as normalized_name,
           (array_agg(name order by created_at asc, id asc))[1] as keep_name
    from public.expense_categories
    group by user_id, lower(trim(name))
    having count(*) > 1
  loop
    canonical_name := dup.keep_name;

    -- Move subcategories attached to duplicate spellings to the canonical category.
    update public.expense_subcategories
       set category_name = canonical_name
     where user_id = dup.user_id
       and lower(trim(category_name)) = dup.normalized_name
       and category_name <> canonical_name
       and not exists (
         select 1 from public.expense_subcategories existing
         where existing.user_id = dup.user_id
           and existing.category_name = canonical_name
           and lower(trim(existing.name)) = lower(trim(public.expense_subcategories.name))
       );

    -- Remove duplicate subcategories that collide after remapping.
    delete from public.expense_subcategories a
     using public.expense_subcategories b
     where a.user_id = dup.user_id
       and b.user_id = dup.user_id
       and a.category_name = canonical_name
       and b.category_name = canonical_name
       and lower(trim(a.name)) = lower(trim(b.name))
       and a.id > b.id;

    delete from public.expense_categories
     where user_id = dup.user_id
       and lower(trim(name)) = dup.normalized_name
       and name <> canonical_name;
  end loop;
end $$;

create unique index if not exists expense_categories_user_normalized_name_key
  on public.expense_categories (user_id, lower(trim(name)));



-- Access requests admin dashboard RPCs. Safe to re-run.
create or replace function public.admin_list_access_requests()
returns table (
  id uuid,
  user_id uuid,
  user_email text,
  user_name text,
  status text,
  created_at timestamptz,
  notified_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_forma_admin() then
    raise exception 'Admin access required';
  end if;
  return query
    select ar.id, ar.user_id, ar.user_email, ar.user_name, ar.status, ar.created_at, ar.notified_at
    from public.access_requests ar
    order by case when ar.status = 'pending' then 0 else 1 end, ar.created_at desc;
end;
$$;

create or replace function public.admin_update_access_request(p_request_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_forma_admin() then
    raise exception 'Admin access required';
  end if;
  if p_status not in ('pending','approved','denied') then
    raise exception 'Invalid access request status';
  end if;
  update public.access_requests set status = p_status where id = p_request_id;
  if not found then raise exception 'Access request not found'; end if;
end;
$$;

revoke all on function public.admin_list_access_requests() from public, anon;
revoke all on function public.admin_update_access_request(uuid, text) from public, anon;
grant execute on function public.admin_list_access_requests() to authenticated;
grant execute on function public.admin_update_access_request(uuid, text) to authenticated;

-- ===== 20261027_credit_card_and_installment_accounts.sql =====
-- Credit cards and installment apps (Valu, Aman, Halan, ...) become real accounts.
-- Additive and safe to run more than once.

-- A credit card / installment app is a financial_accounts row (type 'Credit card' or 'Installment app').
alter table public.financial_accounts add column if not exists credit_limit numeric(14,2);
alter table public.financial_accounts add column if not exists statement_day integer;
alter table public.financial_accounts add column if not exists grace_days integer;
alter table public.financial_accounts add column if not exists pay_from_account_id uuid references public.financial_accounts(id) on delete set null;

alter table public.financial_accounts drop constraint if exists financial_accounts_statement_day_check;
alter table public.financial_accounts add constraint financial_accounts_statement_day_check
  check (statement_day is null or statement_day between 1 and 28);
alter table public.financial_accounts drop constraint if exists financial_accounts_grace_days_check;
alter table public.financial_accounts add constraint financial_accounts_grace_days_check
  check (grace_days is null or grace_days between 0 and 90);
alter table public.financial_accounts drop constraint if exists financial_accounts_credit_limit_check;
alter table public.financial_accounts add constraint financial_accounts_credit_limit_check
  check (credit_limit is null or credit_limit >= 0);

-- An installment plan can belong to an installment app account.
alter table public.debts add column if not exists provider_account_id uuid references public.financial_accounts(id) on delete set null;
create index if not exists debts_user_provider_idx on public.debts(user_id, provider_account_id);


-- Recurring payments: optional last date to pay + running part-payment total (additive).
alter table public.recurring_payments add column if not exists pay_by_date date;
alter table public.recurring_payments add column if not exists paid_amount numeric(12,2) not null default 0;

-- ===== Security hardening (RLS scope, grants, rate limiter) — see SECURITY.md =====
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
-- Simple fixed-window rate limiter used by Edge Functions (service role only).
create table if not exists public.rate_limits (
  key text primary key,
  hits integer not null default 0,
  window_start timestamptz not null default now()
);
alter table public.rate_limits enable row level security;   -- no policies: nobody but the service role can touch it
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare r public.rate_limits;
begin
  insert into public.rate_limits as rl (key, hits, window_start)
  values (p_key, 1, now())
  on conflict (key) do update set
    hits = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.hits + 1 end,
    window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning * into r;
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;
  return r.hits <= p_max;
end;
$$;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- Explicit deny: only the service role (which bypasses RLS) may use the limiter table.
drop policy if exists "No direct access" on public.rate_limits;
create policy "No direct access" on public.rate_limits for all to authenticated using (false) with check (false);

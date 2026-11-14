-- Pocket Plus: confirm payments on their own when the Owner's bank / wallet SMS matches a pending payment.
-- Additive only: new columns, a new index, new functions and triggers, one new storage read policy.
alter table public.subscriptions add column if not exists payer_name text;
alter table public.subscriptions add column if not exists proof_path text;
alter table public.subscriptions add column if not exists auto_confirmed boolean not null default false;
alter table public.subscriptions add column if not exists matched_sms_id uuid;
alter table public.subscriptions add column if not exists match_note text;
-- A transaction number can back only one payment.
create unique index if not exists subscriptions_payment_ref_once on public.subscriptions (lower(payment_ref))
  where payment_ref is not null and status in ('pending','active');
create unique index if not exists subscriptions_matched_sms_once on public.subscriptions (matched_sms_id) where matched_sms_id is not null;

-- The guard: same rules as before, plus (1) users may attach their name and screenshot, (2) the matcher may turn a plan on.
create or replace function public.pocket_guard_subscription()
returns trigger language plpgsql security definer set search_path = '' as $$
declare trial_days int;
begin
  new.updated_at := now();
  if coalesce(current_setting('pocket.plus_auto', true), '') = 'on' and tg_op = 'UPDATE' then
    return new;
  end if;
  if public.is_forma_admin() then
    if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
      new.confirmed_by := auth.uid(); new.confirmed_at := now();
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.confirmed_by := null; new.confirmed_at := null; new.admin_note := null; new.cancel_at_period_end := false;
    new.auto_confirmed := false; new.matched_sms_id := null; new.match_note := null;
    if new.proof_path is not null and split_part(new.proof_path, '/', 1) <> auth.uid()::text then new.proof_path := null; end if;
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
  new.user_id := old.user_id; new.plan := old.plan; new.period := old.period; new.status := old.status;
  new.trial_ends_at := old.trial_ends_at; new.current_period_end := old.current_period_end;
  new.payment_method := old.payment_method; new.payment_ref := old.payment_ref; new.payer_handle := old.payer_handle;
  new.amount := old.amount; new.confirmed_by := old.confirmed_by; new.confirmed_at := old.confirmed_at;
  new.admin_note := old.admin_note; new.created_at := old.created_at;
  new.payer_name := old.payer_name; new.proof_path := old.proof_path; new.auto_confirmed := old.auto_confirmed;
  new.matched_sms_id := old.matched_sms_id; new.match_note := old.match_note;
  return new;
end $$;

-- Helpers
create or replace function public.pocket_plus_digits(s text) returns text language sql immutable set search_path = '' as $$
  select case when length(d) >= 10 then '0' || right(d, 10) else d end
  from (select regexp_replace(translate(coalesce(s,''), '٠١٢٣٤٥٦٧٨٩', '0123456789'), '\D', '', 'g') d) x
$$;
create or replace function public.pocket_plus_name(s text) returns text language sql immutable set search_path = '' as $$
  select trim(regexp_replace(lower(coalesce(s,'')), '[^a-z؀-ۿ]+', ' ', 'g'))
$$;
-- Names match when the first and last word of the shorter one both appear in the other.
create or replace function public.pocket_plus_names_match(a text, b text) returns boolean language plpgsql immutable set search_path = '' as $$
declare x text := public.pocket_plus_name(a); y text := public.pocket_plus_name(b); wa text[]; wb text[];
begin
  if x = '' or y = '' then return false; end if;
  wa := string_to_array(x, ' '); wb := string_to_array(y, ' ');
  if array_length(wa,1) > array_length(wb,1) then declare t text[] := wa; begin wa := wb; wb := t; end; end if;
  return wa[1] = any(wb) and (array_length(wa,1) = 1 or wa[array_length(wa,1)] = any(wb));
end $$;

-- Try to pair one SMS with one pending payment. Turns Plus on only when exactly one payment fits.
create or replace function public.pocket_plus_try_match(p_sms_id uuid, p_sub_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  s record; amt numeric; body text; ref text; phone text; pname text; cfg jsonb; hits uuid[]; sub record; why text; ends timestamptz;
begin
  select * into s from public.sms_inbox where id = p_sms_id;
  if not found then return null; end if;
  if not exists (select 1 from public.profiles p where p.id = s.user_id and p.role in ('owner','super_admin')) then return null; end if;
  if exists (select 1 from public.subscriptions where matched_sms_id = p_sms_id) then return null; end if;
  body := translate(s.body, '٠١٢٣٤٥٦٧٨٩', '0123456789');
  amt := coalesce(nullif(s.amount, 0), replace(substring(body from 'مبلغ\s*([0-9][0-9,]*(?:\.[0-9]+)?)'), ',', '')::numeric);
  if coalesce(amt, 0) <= 0 then return null; end if;
  if body !~ '(استقبال|استلام|إستقبال|إستلام|إيداع|ايداع|received|credited)' then return null; end if;
  ref := lower(substring(body from '(?:رقم المعاملة|Ref(?:erence)?(?: No)?\.?)\s*[:#]?\s*([A-Za-z0-9]{6,})'));
  phone := public.pocket_plus_digits(substring(body from 'من رقم(?: حساب)?\s*\+?([0-9 ]{10,16})'));
  pname := coalesce(substring(body from 'المسجل باسم\s*([A-Za-z][A-Za-z .''-]{1,60}?)\s*(?:بنجاح|\.|$|\n|استخدم)'),
                    substring(body from 'من\s+([A-Za-z][A-Za-z .''-]{1,60}?)\s+في\s'));
  select value into cfg from public.app_settings where key = 'plus';

  select array_agg(x.id), max(x.why) into hits, why from (
    select r.id,
      case when ref is not null and r.payment_ref is not null and length(r.payment_ref) >= 6
                and (lower(r.payment_ref) like '%' || ref || '%' or ref like '%' || lower(r.payment_ref) || '%') then 'transaction number'
           when phone is not null and length(phone) >= 10 and public.pocket_plus_digits(r.payer_handle) = phone then 'wallet number'
           when pname is not null and public.pocket_plus_names_match(pname, r.payer_name) then 'name'
      end as why
    from public.subscriptions r
    where r.status = 'pending'
      and r.created_at between s.received_at - interval '2 days' and s.received_at + interval '2 days'
      and amt >= coalesce(nullif((cfg->>(r.period || '_price'))::numeric, 0), r.amount, 0)
  ) x where x.why is not null;

  if hits is null or array_length(hits, 1) <> 1 then return null; end if;
  if p_sub_id is not null and hits[1] <> p_sub_id then return null; end if;
  select * into sub from public.subscriptions where id = hits[1];
  -- New period continues from any Plus time still left (same rule as the Owner's Confirm button).
  select greatest(now(), coalesce(max(case when status = 'trial' then trial_ends_at else current_period_end end), now()))
    into ends from public.subscriptions
    where user_id = sub.user_id and id <> sub.id
      and ((status = 'trial' and trial_ends_at > now()) or (status = 'active' and current_period_end > now()));
  ends := ends + case when sub.period = 'yearly' then interval '1 year' else interval '1 month' end;
  perform set_config('pocket.plus_auto', 'on', true);
  update public.subscriptions set status = 'active', current_period_end = ends, confirmed_at = now(), confirmed_by = null,
    auto_confirmed = true, matched_sms_id = p_sms_id,
    match_note = 'Matched by ' || why || ' · ' || amt || ' received ' || to_char(s.received_at at time zone 'Africa/Cairo', 'DD Mon HH24:MI')
    where id = sub.id;
  perform set_config('pocket.plus_auto', '', true);
  update public.sms_inbox set merchant = 'Pocket Plus payment', category = coalesce(category, 'Pocket Plus') where id = p_sms_id;
  return sub.id;
end $$;
revoke all on function public.pocket_plus_try_match(uuid, uuid) from public, anon, authenticated;

-- When an SMS arrives, look for a waiting payment.
create or replace function public.pocket_plus_on_sms() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  begin perform public.pocket_plus_try_match(new.id); exception when others then null; end;
  return null;
end $$;
drop trigger if exists pocket_plus_on_sms on public.sms_inbox;
create trigger pocket_plus_on_sms after insert on public.sms_inbox for each row execute function public.pocket_plus_on_sms();

-- When a payment is sent, look for an SMS that already arrived (people often pay first, then fill the form).
create or replace function public.pocket_plus_on_payment() returns trigger language plpgsql security definer set search_path = '' as $$
declare m record;
begin
  if new.status <> 'pending' then return null; end if;
  for m in select i.id from public.sms_inbox i join public.profiles p on p.id = i.user_id and p.role in ('owner','super_admin')
           where i.received_at > now() - interval '2 days'
             and not exists (select 1 from public.subscriptions x where x.matched_sms_id = i.id)
           order by i.received_at desc limit 50 loop
    begin
      if public.pocket_plus_try_match(m.id, new.id) is not null then exit; end if;
    exception when others then null; end;
  end loop;
  return null;
end $$;
drop trigger if exists pocket_plus_on_payment on public.subscriptions;
create trigger pocket_plus_on_payment after insert on public.subscriptions for each row execute function public.pocket_plus_on_payment();

-- The Owner can open a payment screenshot a user attached (stored under <user id>/plus/).
drop policy if exists receipts_select_plus_admin on storage.objects;
create policy receipts_select_plus_admin on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and (storage.foldername(name))[2] = 'plus' and public.is_forma_admin());

revoke all on function public.pocket_plus_on_sms() from public, anon, authenticated;
revoke all on function public.pocket_plus_on_payment() from public, anon, authenticated;

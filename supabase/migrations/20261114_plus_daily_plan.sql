-- Pocket Plus: a 1-day plan (widen the allowed periods; nothing removed).
alter table public.subscriptions drop constraint if exists subscriptions_period_check;
alter table public.subscriptions add constraint subscriptions_period_check check (period in ('daily','monthly','yearly','trial','gift'));
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
      if new.period not in ('daily','monthly','yearly') or new.payment_method not in ('instapay','wallet') then
        raise exception 'Choose a plan and InstaPay or a wallet';
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
  ends := ends + case sub.period when 'yearly' then interval '1 year' when 'daily' then interval '1 day' else interval '1 month' end;
  perform set_config('pocket.plus_auto', 'on', true);
  update public.subscriptions set status = 'active', current_period_end = ends, confirmed_at = now(), confirmed_by = null,
    auto_confirmed = true, matched_sms_id = p_sms_id,
    match_note = 'Matched by ' || why || ' · ' || amt || ' received ' || to_char(s.received_at at time zone 'Africa/Cairo', 'DD Mon HH24:MI')
    where id = sub.id;
  perform set_config('pocket.plus_auto', '', true);
  update public.sms_inbox set merchant = 'Pocket Plus payment', category = coalesce(category, 'Pocket Plus') where id = p_sms_id;
  return sub.id;
end $$;
update public.app_settings set value = value || '{"daily_price":1}'::jsonb where key = 'plus' and not (value ? 'daily_price');

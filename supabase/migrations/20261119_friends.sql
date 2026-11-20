-- Friends, shared loans, loan payments, invites. Additive only.

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references auth.users(id) on delete cascade,
  addressee uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','blocked')),
  blocked_by uuid,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester <> addressee)
);
create unique index if not exists friendships_pair_idx on public.friendships (least(requester,addressee), greatest(requester,addressee));
alter table public.friendships enable row level security;
drop policy if exists "friendships read own" on public.friendships;
create policy "friendships read own" on public.friendships for select using (auth.uid() in (requester, addressee));

create table if not exists public.friend_invites (
  token uuid primary key default gen_random_uuid(),
  inviter uuid not null default auth.uid() references auth.users(id) on delete cascade,
  loan_id uuid references public.loans_given(id) on delete set null,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.friend_invites enable row level security;
drop policy if exists "invites read own" on public.friend_invites;
create policy "invites read own" on public.friend_invites for select using (inviter = auth.uid());
drop policy if exists "invites insert own" on public.friend_invites;
create policy "invites insert own" on public.friend_invites for insert with check (inviter = auth.uid());

alter table public.loans_given add column if not exists friend_id uuid references auth.users(id) on delete set null;
alter table public.loans_given add column if not exists share_status text check (share_status in ('pending','confirmed','rejected'));
alter table public.loans_given add column if not exists share_note text;
alter table public.loans_given add column if not exists borrower_account_id uuid;
alter table public.loans_given add column if not exists invite_token uuid;

create table if not exists public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans_given(id) on delete cascade,
  amount numeric not null check (amount > 0),
  paid_on date not null default current_date,
  status text not null check (status in ('pending_lender','pending_payer','confirmed','rejected')),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lender_tx_id uuid,
  payer_tx_id uuid,
  note text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
alter table public.loan_payments enable row level security;
drop policy if exists "loan payments read parties" on public.loan_payments;
create policy "loan payments read parties" on public.loan_payments for select using (
  exists (select 1 from public.loans_given l where l.id = loan_id and (l.user_id = auth.uid() or l.friend_id = auth.uid()))
);

-- helpers
create or replace function public.pocket_display_name(p uuid) returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(trim(coalesce(first_name,'')||' '||coalesce(last_name,'')),''), nullif(full_name,''), username, 'Pocket user') from public.profiles where id = p
$$;
revoke all on function public.pocket_display_name(uuid) from public, anon;

create or replace function public.are_friends(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships where status='accepted' and least(requester,addressee)=least(a,b) and greatest(requester,addressee)=greatest(a,b))
$$;
revoke all on function public.are_friends(uuid,uuid) from public, anon;

-- friends list with names
create or replace function public.friends_list() returns table(id uuid, friend_id uuid, name text, username text, status text, incoming boolean, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select f.id, case when f.requester = auth.uid() then f.addressee else f.requester end,
         public.pocket_display_name(case when f.requester = auth.uid() then f.addressee else f.requester end),
         (select p.username from public.profiles p where p.id = case when f.requester = auth.uid() then f.addressee else f.requester end),
         f.status, f.addressee = auth.uid(), f.created_at
  from public.friendships f
  where auth.uid() in (f.requester, f.addressee)
    and (f.status in ('pending','accepted') or (f.status='blocked' and f.blocked_by = auth.uid()))
$$;
grant execute on function public.friends_list() to authenticated;

create or replace function public.friend_request(p_username text) returns text language plpgsql security definer set search_path = public as $$
declare target uuid; existing public.friendships;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select id into target from public.profiles where lower(username) = lower(trim(both '@' from trim(p_username)));
  if target is null then return 'not_found'; end if;
  if target = auth.uid() then return 'self'; end if;
  select * into existing from public.friendships where least(requester,addressee)=least(auth.uid(),target) and greatest(requester,addressee)=greatest(auth.uid(),target);
  if found then
    if existing.status = 'accepted' then return 'already'; end if;
    if existing.status = 'blocked' then return 'not_found'; end if;
    if existing.status = 'pending' and existing.addressee = auth.uid() then
      update public.friendships set status='accepted', responded_at=now() where id = existing.id; return 'accepted';
    end if;
    update public.friendships set requester=auth.uid(), addressee=target, status='pending', created_at=now(), responded_at=null where id = existing.id;
    return 'sent';
  end if;
  insert into public.friendships(requester, addressee) values (auth.uid(), target);
  return 'sent';
end $$;
grant execute on function public.friend_request(text) to authenticated;

create or replace function public.friend_respond(p_id uuid, p_action text) returns void language plpgsql security definer set search_path = public as $$
declare f public.friendships;
begin
  select * into f from public.friendships where id = p_id and auth.uid() in (requester, addressee);
  if not found then raise exception 'Not found'; end if;
  if p_action = 'accept' and f.addressee = auth.uid() and f.status='pending' then
    update public.friendships set status='accepted', responded_at=now() where id=p_id;
  elsif p_action = 'decline' and f.addressee = auth.uid() and f.status='pending' then
    update public.friendships set status='declined', responded_at=now() where id=p_id;
  elsif p_action = 'remove' then
    delete from public.friendships where id=p_id and status <> 'blocked';
  elsif p_action = 'block' then
    update public.friendships set status='blocked', blocked_by=auth.uid(), responded_at=now() where id=p_id;
  elsif p_action = 'unblock' and f.blocked_by = auth.uid() then
    delete from public.friendships where id=p_id;
  else raise exception 'Not allowed';
  end if;
end $$;
grant execute on function public.friend_respond(uuid,text) to authenticated;

-- lender shares a loan with a friend (sets friend + pending)
create or replace function public.loan_share(p_loan uuid, p_friend uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.are_friends(auth.uid(), p_friend) then raise exception 'Not friends'; end if;
  update public.loans_given set friend_id = p_friend, share_status = 'pending', share_note = null where id = p_loan and user_id = auth.uid();
  if not found then raise exception 'Not found'; end if;
end $$;
grant execute on function public.loan_share(uuid,uuid) to authenticated;

-- loans where I am the borrower
create or replace function public.loans_i_owe() returns table(id uuid, lender_id uuid, lender_name text, amount numeric, lent_on date, due_on date, note text, share_status text, back numeric, closed_at timestamptz, borrower_account_id uuid)
language sql stable security definer set search_path = public as $$
  select l.id, l.user_id, public.pocket_display_name(l.user_id), l.amount, l.lent_on, l.due_on, l.note, l.share_status,
         coalesce((select sum(t.amount) from public.transactions t where t.loan_given_id = l.id and t.type='Income' and t.user_id = l.user_id),0),
         l.closed_at, l.borrower_account_id
  from public.loans_given l where l.friend_id = auth.uid() and coalesce(l.share_status,'pending') <> 'rejected' and public.are_friends(l.user_id, auth.uid())
$$;
grant execute on function public.loans_i_owe() to authenticated;

create or replace function public.loan_respond(p_loan uuid, p_accept boolean, p_account uuid, p_note text) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.loans_given set share_status = case when p_accept then 'confirmed' else 'rejected' end,
    share_note = case when p_accept then null else p_note end,
    borrower_account_id = case when p_accept then p_account else null end
  where id = p_loan and friend_id = auth.uid() and share_status = 'pending';
  if not found then raise exception 'Not found'; end if;
end $$;
grant execute on function public.loan_respond(uuid,boolean,uuid,text) to authenticated;

-- payments
create or replace function public.loan_payment_add(p_loan uuid, p_amount numeric, p_date date, p_lender_tx uuid, p_payer_tx uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare l public.loans_given; pid uuid;
begin
  select * into l from public.loans_given where id = p_loan;
  if not found or l.friend_id is null or auth.uid() not in (l.user_id, l.friend_id) then raise exception 'Not found'; end if;
  insert into public.loan_payments(loan_id, amount, paid_on, status, lender_tx_id, payer_tx_id)
  values (p_loan, p_amount, coalesce(p_date,current_date), case when auth.uid() = l.user_id then 'pending_payer' else 'pending_lender' end, p_lender_tx, p_payer_tx)
  returning id into pid;
  return pid;
end $$;
grant execute on function public.loan_payment_add(uuid,numeric,date,uuid,uuid) to authenticated;

create or replace function public.loan_payment_respond(p_id uuid, p_accept boolean, p_tx uuid) returns void language plpgsql security definer set search_path = public as $$
declare p public.loan_payments; l public.loans_given;
begin
  select * into p from public.loan_payments where id = p_id;
  if not found then raise exception 'Not found'; end if;
  select * into l from public.loans_given where id = p.loan_id;
  if p.status = 'pending_lender' and auth.uid() = l.user_id then
    update public.loan_payments set status = case when p_accept then 'confirmed' else 'rejected' end, lender_tx_id = coalesce(p_tx, lender_tx_id), responded_at = now() where id = p_id;
  elsif p.status = 'pending_payer' and auth.uid() = l.friend_id then
    update public.loan_payments set status = case when p_accept then 'confirmed' else 'rejected' end, payer_tx_id = coalesce(p_tx, payer_tx_id), responded_at = now() where id = p_id;
  else raise exception 'Not allowed';
  end if;
end $$;
grant execute on function public.loan_payment_respond(uuid,boolean,uuid) to authenticated;

-- invites
create or replace function public.friend_invite_accept(p_token uuid) returns text language plpgsql security definer set search_path = public as $$
declare i public.friend_invites;
begin
  select * into i from public.friend_invites where token = p_token;
  if not found then return 'not_found'; end if;
  if i.inviter = auth.uid() then return 'self'; end if;
  if i.used_by is not null and i.used_by <> auth.uid() then return 'used'; end if;
  update public.friend_invites set used_by = auth.uid(), used_at = coalesce(used_at, now()) where token = p_token;
  insert into public.friendships(requester, addressee, status, responded_at) values (i.inviter, auth.uid(), 'accepted', now())
  on conflict ((least(requester,addressee)), (greatest(requester,addressee))) do update set status = 'accepted', responded_at = now() where public.friendships.status <> 'blocked';
  update public.loans_given set friend_id = auth.uid(), share_status = 'pending' where user_id = i.inviter and (invite_token = p_token or id = i.loan_id) and friend_id is null;
  return 'ok';
end $$;
grant execute on function public.friend_invite_accept(uuid) to authenticated;

revoke execute on function public.friends_list(), public.friend_request(text), public.friend_respond(uuid,text), public.loan_share(uuid,uuid), public.loans_i_owe(), public.loan_respond(uuid,boolean,uuid,text), public.loan_payment_add(uuid,numeric,date,uuid,uuid), public.loan_payment_respond(uuid,boolean,uuid), public.friend_invite_accept(uuid) from public, anon;

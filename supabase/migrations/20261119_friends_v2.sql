-- Friends v2: transactions with a friend, borrow requests, splits, and
-- payments that only create transactions after the other side confirms. Additive.
alter table public.transactions add column if not exists friend_id uuid references auth.users(id) on delete set null;
alter table public.loan_payments add column if not exists lender_account_id uuid;
alter table public.loan_payments add column if not exists payer_account_id uuid;
alter table public.loans_given drop constraint if exists loans_given_share_status_check;
alter table public.loans_given add constraint loans_given_share_status_check check (share_status in ('pending','confirmed','rejected','requested'));
alter table public.loans_given add column if not exists split_id uuid;
-- Functions (applied in Supabase as migration "friends_v2"):
--   loan_request_from_friend(friend, amount, date, due, note, my_account)
--   loan_request_respond(loan, accept, account, note)
--   loan_payment_add2(loan, amount, date, account)   -- one pending payment at a time
--   loan_payment_respond2(payment, accept, account)
--   loan_payment_set_tx(payment, tx)                  -- each side links its own transaction once
--   loans_i_owe()                                     -- back = confirmed payments

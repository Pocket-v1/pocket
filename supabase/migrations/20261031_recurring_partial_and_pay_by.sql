-- Additive only: nothing is removed or rewritten.
alter table public.recurring_payments add column if not exists pay_by_date date;
alter table public.recurring_payments add column if not exists paid_amount numeric(12,2) not null default 0;

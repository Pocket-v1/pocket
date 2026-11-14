alter table public.recurring_payments add column if not exists is_active boolean not null default true;

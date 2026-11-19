-- Optional date the money is expected back. Additive only.
alter table public.loans_given add column if not exists due_on date;

-- Budget rollover: when on, what is left of this month's budget (or the overspend) carries into next month.
alter table public.budgets add column if not exists rollover boolean not null default false;

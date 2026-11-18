-- "Leave out of totals": money passing through. Still moves the account balance, not counted in income/spending reports. Additive.
alter table public.transactions add column if not exists exclude_from_totals boolean not null default false;

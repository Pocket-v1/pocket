-- Multi-currency accounts. Additive and safe to run more than once.
-- currency: the account's currency (null = the user's main currency).
-- fx_rate:  how much 1 unit of that currency is worth in the main currency, kept up to date by the user.
alter table public.financial_accounts add column if not exists currency text;
alter table public.financial_accounts add column if not exists fx_rate numeric(18,6);
alter table public.financial_accounts drop constraint if exists financial_accounts_fx_rate_positive;
alter table public.financial_accounts add constraint financial_accounts_fx_rate_positive check (fx_rate is null or fx_rate > 0);
-- to_amount: for a transfer between two currencies, what arrived in the destination account.
alter table public.transactions add column if not exists to_amount numeric(14,2);

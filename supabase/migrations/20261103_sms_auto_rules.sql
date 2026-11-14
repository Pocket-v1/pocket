alter table public.account_sms_config add column if not exists auto_rules jsonb not null default '[]'::jsonb;

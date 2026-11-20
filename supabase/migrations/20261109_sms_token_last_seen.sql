-- additive: main token last check
alter table public.sms_tokens add column if not exists last_seen_at timestamptz;

-- Run the daily reminder emails every morning (09:05 Cairo = 07:05 UTC). Additive: two extensions, one random secret row, one schedule.
-- RESEND_API_KEY / SUPPORT_RESEND_API_KEY are added directly in public.private_secrets (never in code).
create extension if not exists pg_net;
create extension if not exists pg_cron;
insert into public.private_secrets(name, value) values ('CRON_SECRET', encode(gen_random_bytes(24), 'hex')) on conflict (name) do nothing;
select cron.unschedule('pocket-daily-reminder-emails') where exists (select 1 from cron.job where jobname = 'pocket-daily-reminder-emails');
select cron.schedule('pocket-daily-reminder-emails', '5 7 * * *', $job$
  select net.http_post(
    url := 'https://umxbrpavnkwrqtvkxbtl.supabase.co/functions/v1/send-notification-emails',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select value from public.private_secrets where name = 'CRON_SECRET')),
    body := '{}'::jsonb);
$job$);

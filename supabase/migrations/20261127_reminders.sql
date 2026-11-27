-- Daily email reminders: schedules the send-reminders Edge Function with pg_cron + pg_net.
-- 1. Deploy the function:  supabase functions deploy send-reminders --no-verify-jwt
-- 2. Set its secrets:       REMINDERS_CRON_SECRET (any long random string), RESEND_API_KEY,
--                           REMINDER_FROM_EMAIL (sender verified in Resend), APP_URL (your Pocket URL)
-- 3. Enable the pg_cron and pg_net extensions (Dashboard → Database → Extensions), then run the
--    block below in the SQL Editor after replacing <project-ref> and <REMINDERS_CRON_SECRET>.
--    The secret is kept in Supabase Vault, not in this file.
--
-- select vault.create_secret('<REMINDERS_CRON_SECRET>', 'reminders_cron_secret');
-- select cron.schedule(
--   'pocket-send-reminders',
--   '0 6 * * *',   -- every day 06:00 UTC (08:00 Cairo)
--   $$
--   select net.http_post(
--     url := 'https://<project-ref>.supabase.co/functions/v1/send-reminders',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
--
-- To stop:  select cron.unschedule('pocket-send-reminders');

-- Speeds up the daily lookup of users who opted in.
create index if not exists user_settings_email_reminders_idx
  on public.user_settings ((settings -> 'settingsPrefs' ->> 'emailReminders'));

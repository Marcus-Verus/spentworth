-- Weekly Pulse Email Cron Job
-- Runs once per day at 10 AM UTC to check if users need a pulse email
-- The Edge Function handles timezone logic and "right day" checks per user

-- Schedule Weekly Pulse emails once daily
-- Unlike daily briefs (hourly), this runs once a day since:
-- 1. It's weekly, so timing is less critical
-- 2. The function checks user's preferred day internally
select cron.schedule(
  'weekly-pulse-emails',           -- job name
  '0 10 * * *',                   -- 10:00 AM UTC daily
  $$
  select net.http_post(
    url := 'https://trcvtpysiqjcjwmufmpc.supabase.co/functions/v1/send-weekly-pulse',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To view scheduled jobs:
-- select * from cron.job;

-- To view job run history:
-- select * from cron.job_run_details where jobname = 'weekly-pulse-emails' order by start_time desc limit 10;

-- To remove this job:
-- select cron.unschedule('weekly-pulse-emails');


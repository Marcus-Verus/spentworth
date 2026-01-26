-- Enable pg_cron and pg_net extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Grant usage to postgres role
grant usage on schema cron to postgres;
grant usage on schema net to postgres;

-- Schedule Daily Brief emails every hour
-- The Edge Function checks each user's timezone and preferred time
-- to determine if they should receive an email
select cron.schedule(
  'daily-brief-emails',           -- job name
  '0 * * * *',                    -- every hour on the hour
  $$
  select net.http_post(
    url := 'https://trcvtpysiqjcjwmufmpc.supabase.co/functions/v1/send-daily-briefs',
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
-- select * from cron.job_run_details order by start_time desc limit 10;

-- To remove a job:
-- select cron.unschedule('daily-brief-emails');


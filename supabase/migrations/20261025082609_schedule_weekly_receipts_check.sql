create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Every Monday around 6am Sydney time (Sunday 19:00 UTC; 5am during winter standard time).
select cron.schedule(
  'weekly-receipts-check',
  '0 19 * * 0',
  $$
  select net.http_post(
    url := 'https://mzudvulwtjkwbevpaiwo.supabase.co/functions/v1/sync-receipts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'receipts_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  );
  $$
);

-- Unschedule the old job
SELECT cron.unschedule('zernio-analytics-sync-job');

-- Reschedule Analytics Sync with vault secret
SELECT cron.schedule(
  'zernio-analytics-sync-job',
  '0 */4 * * *',
  $$
    SELECT net.http_post(
      url:='https://qybzidylewzsnmlofjul.supabase.co/functions/v1/zernio-analytics-sync',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body:='{}'::jsonb
    )
  $$
);

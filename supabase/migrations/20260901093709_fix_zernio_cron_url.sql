-- Unschedule the old job
SELECT cron.unschedule('zernio-analytics-sync-job');

-- Reschedule Analytics Sync with correct project URL (snm instead of snw)
SELECT cron.schedule(
  'zernio-analytics-sync-job',
  '0 */4 * * *',
  $$
    SELECT net.http_post(
      url:='https://qybzidylewzsnmlofjul.supabase.co/functions/v1/zernio-analytics-sync',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body:='{}'::jsonb
    )
  $$
);

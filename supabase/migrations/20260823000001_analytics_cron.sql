-- Ensure pg_cron and pg_net are active
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule any legacy cron
SELECT cron.unschedule('zernio-nightly-fallback-sync');

-- Schedule Analytics Sync (Every 4 hours)
SELECT cron.schedule(
  'zernio-analytics-sync-job',
  '0 */4 * * *',
  $$
    SELECT net.http_post(
      url:='https://qybzidylewzsnwlofjul.supabase.co/functions/v1/zernio-analytics-sync',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer " || current_setting(''app.settings.service_role_key'', true)}'::jsonb,
      body:='{}'::jsonb
    )
  $$
);

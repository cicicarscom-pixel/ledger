-- Gerekli eklentileri aktif et
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Varsa once eski cron'u temizle (idempotent yapi icin)
SELECT cron.unschedule('zernio-nightly-fallback-sync');

-- Her gece 03:00'te 'zernio-client' adli edge fonksiyonunu (sync-messages parametresiyle) tetikleyecek gorev
SELECT cron.schedule(
  'zernio-nightly-fallback-sync',
  '0 3 * * *', -- Her gece saat 03:00'te calisir
  $$
    SELECT net.http_post(
      url:='https://qybzidylewzsnwlofjul.supabase.co/functions/v1/zernio-client',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer " || current_setting(''app.settings.service_role_key'', true)}'::jsonb,
      body:='{"action": "sync-messages"}'::jsonb
    )
  $$
);

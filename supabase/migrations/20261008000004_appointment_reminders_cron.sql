-- WhatsApp randevu hatırlatma zamanlayıcısı: 10 dakikada bir `appointment-reminders` fonksiyonunu çağırır.
-- Hangi randevuya mesaj gideceğine veritabanı karar verir; hiçbir işletme açmadıysa çağrı boş döner.
-- Yetki: vault'taki service_role_key (diğer cron işleriyle aynı yöntem).
select cron.schedule(
  'appointment-reminders-job',
  '*/10 * * * *',
  $$
    select net.http_post(
      url := 'https://qybzidylewzsnmlofjul.supabase.co/functions/v1/appointment-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key' limit 1)
      ),
      body := '{}'::jsonb
    )
  $$
);

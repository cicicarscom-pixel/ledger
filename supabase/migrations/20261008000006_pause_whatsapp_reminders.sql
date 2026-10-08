-- WhatsApp randevu hatırlatma GEÇİCİ OLARAK DURDURULDU (uygulama henüz canlıda değil; kullanıcı kararı, 08.10.2026).
-- Geri açmak için:
--   select cron.alter_job((select jobid from cron.job where jobname = 'appointment-reminders-job'), active := true);
--   (ve işletme ayarından / set_reminder_settings(true) ile işletme başına yeniden açılır)
select cron.alter_job((select jobid from cron.job where jobname = 'appointment-reminders-job'), active := false);
update public.organizations set whatsapp_reminders_enabled = false where whatsapp_reminders_enabled = true;

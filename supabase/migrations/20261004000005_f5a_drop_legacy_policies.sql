-- F5-A: eski sahip-kimliği (auth.uid() = merchant_id / organization_id) RLS politikalarını kaldır.
-- Her birinin `org_id = current_org_id()` karşılığı zaten var (komut ve rol bazında doğrulandı); eski canlı fonksiyonlar
-- servis rolüyle çalıştığı için politikalardan etkilenmez. Geri alma: supabase/rollback/20261004000005_f5a_restore_legacy_policies.sql

-- (Zaten uygulandı) calendar_services politikası org_id'ye çevrildi:
-- alter policy "Merchants can manage their calendar services" on public.calendar_services
--   using (exists (select 1 from public.calendars c where c.id = calendar_services.calendar_id and c.org_id = public.current_org_id()))
--   with check (exists (select 1 from public.calendars c where c.id = calendar_services.calendar_id and c.org_id = public.current_org_id()));

drop policy if exists "Users can delete their own communication logs" on public.ai_communication_logs;
drop policy if exists "Users can insert their own communication logs" on public.ai_communication_logs;
drop policy if exists "Users can view their own communication logs" on public.ai_communication_logs;
drop policy if exists "Org-scoped delete for appointment_services" on public.appointment_services;
drop policy if exists "Org-scoped insert for appointment_services" on public.appointment_services;
drop policy if exists "Org-scoped read for appointment_services" on public.appointment_services;
drop policy if exists "Org-scoped insert for appointments" on public.appointments;
drop policy if exists "Org-scoped read for appointments" on public.appointments;
drop policy if exists "Org-scoped update for appointments" on public.appointments;
drop policy if exists "Esnaflar kendi ayarlarını ekleyebilir" on public.bot_settings;
drop policy if exists "Esnaflar kendi ayarlarını görebilir" on public.bot_settings;
drop policy if exists "Esnaflar kendi ayarlarını güncelleyebilir" on public.bot_settings;
drop policy if exists "Users can delete their own services" on public.business_services;
drop policy if exists "Users can insert their own services" on public.business_services;
drop policy if exists "Users can update their own services" on public.business_services;
drop policy if exists "Users can view their own services" on public.business_services;
drop policy if exists "calendar_blocks org read" on public.calendar_blocks;
drop policy if exists "Merchants can delete their own calendars" on public.calendars;
drop policy if exists "Merchants can insert their own calendars" on public.calendars;
drop policy if exists "Merchants can update their own calendars" on public.calendars;
drop policy if exists "Merchants can view their own calendars" on public.calendars;
drop policy if exists "Org-scoped insert for customers" on public.customers;
drop policy if exists "Org-scoped read for customers" on public.customers;
drop policy if exists "Org-scoped update for customers" on public.customers;
drop policy if exists "Users manage their own AI settings" on public.organization_ai_settings;

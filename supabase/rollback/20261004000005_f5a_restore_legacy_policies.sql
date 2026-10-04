-- F5-A GERİ ALMA: kaldırılan eski politikaları aynen yeniden oluşturur (canlıdaki tanımlardan alındı, 04.10.2026).
create policy "Users can delete their own communication logs" on public.ai_communication_logs as PERMISSIVE for DELETE to public using ((auth.uid() = merchant_id));
create policy "Users can insert their own communication logs" on public.ai_communication_logs as PERMISSIVE for INSERT to public with check ((auth.uid() = merchant_id));
create policy "Users can view their own communication logs" on public.ai_communication_logs as PERMISSIVE for SELECT to public using ((auth.uid() = merchant_id));
create policy "Org-scoped delete for appointment_services" on public.appointment_services as PERMISSIVE for DELETE to authenticated using ((organization_id = auth.uid()));
create policy "Org-scoped insert for appointment_services" on public.appointment_services as PERMISSIVE for INSERT to authenticated with check ((organization_id = auth.uid()));
create policy "Org-scoped read for appointment_services" on public.appointment_services as PERMISSIVE for SELECT to authenticated using ((organization_id = auth.uid()));
create policy "Org-scoped insert for appointments" on public.appointments as PERMISSIVE for INSERT to authenticated with check ((organization_id = auth.uid()));
create policy "Org-scoped read for appointments" on public.appointments as PERMISSIVE for SELECT to authenticated using ((organization_id = auth.uid()));
create policy "Org-scoped update for appointments" on public.appointments as PERMISSIVE for UPDATE to authenticated using ((organization_id = auth.uid())) with check ((organization_id = auth.uid()));
create policy "Esnaflar kendi ayarlarını ekleyebilir" on public.bot_settings as PERMISSIVE for INSERT to public with check ((auth.uid() = merchant_id));
create policy "Esnaflar kendi ayarlarını görebilir" on public.bot_settings as PERMISSIVE for SELECT to public using ((auth.uid() = merchant_id));
create policy "Esnaflar kendi ayarlarını güncelleyebilir" on public.bot_settings as PERMISSIVE for UPDATE to public using ((auth.uid() = merchant_id));
create policy "Users can delete their own services" on public.business_services as PERMISSIVE for DELETE to public using ((auth.uid() = merchant_id));
create policy "Users can insert their own services" on public.business_services as PERMISSIVE for INSERT to public with check ((auth.uid() = merchant_id));
create policy "Users can update their own services" on public.business_services as PERMISSIVE for UPDATE to public using ((auth.uid() = merchant_id)) with check ((auth.uid() = merchant_id));
create policy "Users can view their own services" on public.business_services as PERMISSIVE for SELECT to public using ((auth.uid() = merchant_id));
create policy "calendar_blocks org read" on public.calendar_blocks as PERMISSIVE for SELECT to authenticated using ((organization_id = current_org_owner_id()));
create policy "Merchants can delete their own calendars" on public.calendars as PERMISSIVE for DELETE to authenticated using ((merchant_id = auth.uid()));
create policy "Merchants can insert their own calendars" on public.calendars as PERMISSIVE for INSERT to authenticated with check ((merchant_id = auth.uid()));
create policy "Merchants can update their own calendars" on public.calendars as PERMISSIVE for UPDATE to authenticated using ((merchant_id = auth.uid()));
create policy "Merchants can view their own calendars" on public.calendars as PERMISSIVE for SELECT to authenticated using ((merchant_id = auth.uid()));
create policy "Org-scoped insert for customers" on public.customers as PERMISSIVE for INSERT to authenticated with check ((organization_id = auth.uid()));
create policy "Org-scoped read for customers" on public.customers as PERMISSIVE for SELECT to authenticated using ((organization_id = auth.uid()));
create policy "Org-scoped update for customers" on public.customers as PERMISSIVE for UPDATE to authenticated using ((organization_id = auth.uid())) with check ((organization_id = auth.uid()));
create policy "Users manage their own AI settings" on public.organization_ai_settings as PERMISSIVE for ALL to authenticated using ((auth.uid() = merchant_id)) with check ((auth.uid() = merchant_id));
-- calendar_services politikasının ESKİ hâli:
alter policy "Merchants can manage their calendar services" on public.calendar_services
  using (exists (select 1 from calendars where calendars.id = calendar_services.calendar_id and calendars.merchant_id = auth.uid()))
  with check (exists (select 1 from calendars where calendars.id = calendar_services.calendar_id and calendars.merchant_id = auth.uid()));

-- F4-1a: istemciler kimlik göndermesin; kuruluş kimliği veritabanında çözülsün (AGENTS.md §3 kural 2).
alter table public.appointments alter column org_id set default public.current_org_id();
alter table public.appointment_services alter column org_id set default public.current_org_id();
alter table public.customers alter column org_id set default public.current_org_id();
alter table public.calendars alter column org_id set default public.current_org_id();
alter table public.calendar_blocks alter column org_id set default public.current_org_id();
alter table public.business_services alter column org_id set default public.current_org_id();
alter table public.bot_settings alter column org_id set default public.current_org_id();
alter table public.organization_ai_settings alter column org_id set default public.current_org_id();

-- upsert için org_id benzersiz (şimdiye dek organization_ai_settings'te merchant_id PK idi)
create unique index if not exists organization_ai_settings_org_id_key on public.organization_ai_settings (org_id);
create unique index if not exists bot_settings_org_id_key on public.bot_settings (org_id);

-- F4-1b: istemcinin doğrudan yazdığı günlük tabloları
alter table public.ai_communication_logs alter column org_id set default public.current_org_id();
alter table public.waha_sessions alter column org_id set default public.current_org_id();

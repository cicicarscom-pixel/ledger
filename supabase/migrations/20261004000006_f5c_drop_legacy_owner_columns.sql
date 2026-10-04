-- F5-C — Eski sahip-kimliği sütunlarının (merchant_id / organization_id) kaldırılması.
-- Kapsam: ai_communication_logs, appointment_services, appointments, bot_settings, business_services,
--         calendar_blocks, calendars, customers, organization_ai_settings, waha_sessions.
-- Önkoşul (doğrulandı 04.10.2026): depolardaki ve canlı Edge Function'lardaki kod bu sütunları kullanmıyor;
--   hiçbir DB fonksiyonu/görünüm/politika bu sütunlara başvurmuyor; F5-A ile eski politikalar kalktı.
-- Tek işlem: ya hepsi uygulanır ya hiçbiri. Geri alma: supabase/rollback/20261004000006_f5c_restore_legacy_owner_columns.sql
-- Yedek: f5c_backup şeması (eski sütunlarıyla tam kopya). Bir ay sorun çıkmazsa: drop schema f5c_backup cascade;

begin;

-- 0) Güvenlik: her satırın org_id'si sahibiyle tutarlı olmalı; değilse hiçbir şey yapılmaz.
do $$
declare bad bigint;
begin
  select count(*) into bad from public.appointments a join public.organizations o on o.id = a.org_id
    where a.organization_id is distinct from o.owner_id;
  if bad > 0 then raise exception 'F5-C: appointments.organization_id <> sahip (% satır)', bad; end if;
  select count(*) into bad from public.customers a join public.organizations o on o.id = a.org_id
    where a.organization_id is distinct from o.owner_id;
  if bad > 0 then raise exception 'F5-C: customers.organization_id <> sahip (% satır)', bad; end if;
  select count(*) into bad from public.calendars a join public.organizations o on o.id = a.org_id
    where a.merchant_id is distinct from o.owner_id;
  if bad > 0 then raise exception 'F5-C: calendars.merchant_id <> sahip (% satır)', bad; end if;
  select count(*) into bad from public.business_services a join public.organizations o on o.id = a.org_id
    where a.merchant_id is distinct from o.owner_id;
  if bad > 0 then raise exception 'F5-C: business_services.merchant_id <> sahip (% satır)', bad; end if;
  select count(*) into bad from public.organization_ai_settings a join public.organizations o on o.id = a.org_id
    where a.merchant_id is distinct from o.owner_id;
  if bad > 0 then raise exception 'F5-C: organization_ai_settings.merchant_id <> sahip (% satır)', bad; end if;
end $$;

-- 1) Yedek (eski sütunlarıyla tam kopya; istemcilerden erişilemez)
create schema if not exists f5c_backup;
revoke all on schema f5c_backup from public, anon, authenticated;
create table f5c_backup.ai_communication_logs as select * from public.ai_communication_logs;
create table f5c_backup.appointment_services as select * from public.appointment_services;
create table f5c_backup.appointments as select * from public.appointments;
create table f5c_backup.bot_settings as select * from public.bot_settings;
create table f5c_backup.business_services as select * from public.business_services;
create table f5c_backup.calendar_blocks as select * from public.calendar_blocks;
create table f5c_backup.calendars as select * from public.calendars;
create table f5c_backup.customers as select * from public.customers;
create table f5c_backup.organization_ai_settings as select * from public.organization_ai_settings;
create table f5c_backup.waha_sessions as select * from public.waha_sessions;
revoke all on all tables in schema f5c_backup from public, anon, authenticated;

-- 2) Eşitleme tetikleyicileri ve işlevi
drop trigger if exists a00_sync_org_id on public.ai_communication_logs;
drop trigger if exists a00_sync_org_id on public.appointment_services;
drop trigger if exists a00_sync_org_id on public.appointments;
drop trigger if exists a00_sync_org_id on public.bot_settings;
drop trigger if exists a00_sync_org_id on public.business_services;
drop trigger if exists a00_sync_org_id on public.calendar_blocks;
drop trigger if exists a00_sync_org_id on public.calendars;
drop trigger if exists a00_sync_org_id on public.customers;
drop trigger if exists a00_sync_org_id on public.organization_ai_settings;
drop trigger if exists a00_sync_org_id on public.waha_sessions;
drop function if exists public.tr_sync_org_id();

-- 3) Eski sütunlardaki indeksler için org_id karşılıkları (sütunlar düşmeden önce)
create index if not exists appointments_org_id_date_idx on public.appointments (org_id, date);
create index if not exists calendar_blocks_org_id_time_idx on public.calendar_blocks (org_id, starts_at, ends_at);
-- customers (org_id, phone) benzersiz indeksi ve diğer org_id indeksleri zaten var.

-- 4) organization_ai_settings: birincil anahtar org_id olur
alter table public.organization_ai_settings drop constraint organization_ai_settings_pkey;
alter table public.organization_ai_settings add constraint organization_ai_settings_pkey primary key using index organization_ai_settings_org_id_key;

-- 5) Eski indeks ve benzersiz kısıtlar
drop index if exists public.idx_appointment_services_org;
drop index if exists public.idx_appointments_org_date;
drop index if exists public.calendar_blocks_org_time_idx;
drop index if exists public.idx_customers_org_phone;
alter table public.customers drop constraint if exists customers_organization_id_phone_key;

-- 6) Sütunlar (FK'ler sütunla birlikte düşer)
alter table public.ai_communication_logs drop column merchant_id;
alter table public.appointment_services drop column organization_id;
alter table public.appointments drop column organization_id;
alter table public.bot_settings drop column merchant_id;
alter table public.business_services drop column merchant_id;
alter table public.calendar_blocks drop column organization_id;
alter table public.calendars drop column merchant_id;
alter table public.customers drop column organization_id;
alter table public.organization_ai_settings drop column merchant_id;
alter table public.waha_sessions drop column merchant_id;

commit;

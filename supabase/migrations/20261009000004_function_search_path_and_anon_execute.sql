-- Kalite Faz 7 — veritabanı sertleştirme
-- 1) 21 fonksiyonda search_path sabitlenir (Supabase linter 0011 function_search_path_mutable).
-- 2) is_admin / check_accountant_document_access / org_today: anon ve PUBLIC EXECUTE kaldırılır (linter 0028).
--    Bu fonksiyonları çağıran 8 RLS politikası "public" rolüne tanımlıydı; anon sorgularında
--    "permission denied for function" hatası çıkmaması için politikalar önce "authenticated" rolüne
--    taşınır (hepsi auth.uid() kullandığından anon zaten hiçbir satır göremiyordu → davranış aynı).
-- Geri alma: docs/supabase/20261009000004_geri_alma.sql
-- Tek işlem (transaction) içinde çalışır; sonundaki doğrulama başarısızsa hepsi geri alınır.

begin;

-- ---------------------------------------------------------------------------
-- 1) search_path sabitleme (public, pg_temp). Gövdeler değişmez.
-- ---------------------------------------------------------------------------
alter function public._working_hours_for(p_hours jsonb, p_date date) set search_path = public, pg_temp;
alter function public.canonical_phone(p text) set search_path = public, pg_temp;
alter function public.claim_ai_jobs(p_batch_size integer) set search_path = public, pg_temp;
alter function public.complete_onboarding(p_full_name text, p_phone text, p_business_name text) set search_path = public, pg_temp;
alter function public.format_phone_display(p text) set search_path = public, pg_temp;
alter function public.get_financial_report_summary(p_target_month date) set search_path = public, pg_temp;
alter function public.get_storage_buckets() set search_path = public, pg_temp;
alter function public.get_storage_policies() set search_path = public, pg_temp;
alter function public.is_super_admin() set search_path = public, pg_temp;
alter function public.match_company_documents(query_embedding vector, match_threshold double precision, match_count integer, p_profile_id uuid) set search_path = public, pg_temp;
alter function public.normalize_phone(p text) set search_path = public, pg_temp;
alter function public.parse_appt_date(d text) set search_path = public, pg_temp;
alter function public.set_organization_ai_settings_updated_at() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.sync_appointment_date() set search_path = public, pg_temp;
alter function public.sync_business_name_to_org() set search_path = public, pg_temp;
alter function public.sync_org_name_to_profile() set search_path = public, pg_temp;
alter function public.tr_customers_canonical_phone() set search_path = public, pg_temp;
alter function public.update_appointments_updated_at_column() set search_path = public, pg_temp;
alter function public.update_business_profile(p_organization_id uuid, p_legal_name text, p_entity_type text, p_tax_identifier_type text, p_tax_identifier text, p_tax_office text, p_city text, p_district text, p_address_line_1 text, p_phone text, p_email text) set search_path = public, pg_temp;
alter function public.update_updated_at_column() set search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- 2a) Politikalar: is_admin()/check_accountant_document_access() kullananlar yalnız oturumlu kullanıcıya
-- ---------------------------------------------------------------------------
alter policy "Admins can view all ai logs" on public.ai_communication_logs to authenticated;
alter policy "admin_create_broadcast" on public.broadcast_notifications to authenticated;
alter policy "Users and accountants can view documents" on public.finance_documents to authenticated;
alter policy "Users and accountants can delete documents" on public.finance_documents to authenticated;
alter policy "Users and accountants can update documents" on public.finance_documents to authenticated;
alter policy "admin_send_to_anyone" on public.notifications to authenticated;
alter policy "Admins can view all organizations" on public.organizations to authenticated;
alter policy "Admins can view all profiles" on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2b) anon / PUBLIC EXECUTE kaldır; oturumlu kullanıcı ve service_role'e açık kalır
-- ---------------------------------------------------------------------------
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.check_accountant_document_access(uuid) from public, anon;
revoke execute on function public.org_today(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.check_accountant_document_access(uuid) to authenticated, service_role;
grant execute on function public.org_today(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Doğrulama: başarısızsa işlem geri alınır
-- ---------------------------------------------------------------------------
do $$
declare v_bad int;
begin
  select count(*) into v_bad
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('_working_hours_for','canonical_phone','claim_ai_jobs','complete_onboarding','format_phone_display',
      'get_financial_report_summary','get_storage_buckets','get_storage_policies','is_super_admin','match_company_documents',
      'normalize_phone','parse_appt_date','set_organization_ai_settings_updated_at','set_updated_at','sync_appointment_date',
      'sync_business_name_to_org','sync_org_name_to_profile','tr_customers_canonical_phone',
      'update_appointments_updated_at_column','update_business_profile','update_updated_at_column')
    and (p.proconfig is null or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'));
  if v_bad > 0 then raise exception 'search_path sabitlenmeyen fonksiyon kaldi: %', v_bad; end if;

  if has_function_privilege('anon', 'public.is_admin()', 'EXECUTE')
     or has_function_privilege('anon', 'public.check_accountant_document_access(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.org_today(uuid)', 'EXECUTE') then
    raise exception 'anon hala EXECUTE edebiliyor';
  end if;

  if not has_function_privilege('authenticated', 'public.is_admin()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.check_accountant_document_access(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.org_today(uuid)', 'EXECUTE') then
    raise exception 'authenticated/service_role EXECUTE yetkisi eksik';
  end if;
end $$;

commit;

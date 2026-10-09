-- Kalite Faz 1B: Supabase güvenlik uyarısı (advisor 0028/0029) — "anon/oturum açmış kullanıcı SECURITY DEFINER fonksiyonu REST üzerinden çağırabiliyor".
-- 1) Yalnız TETİKLEYİCİ olan 8 fonksiyondan tüm dış EXECUTE hakları alınır. PostgreSQL tetikleyici fonksiyonunun EXECUTE hakkını
--    tetikleyici OLUŞTURULURKEN denetler, çalışırken denetlemez; yani tetikleyiciler aynen çalışır, yalnız /rest/v1/rpc/... ile çağrılamaz.
--    Canlıda doğrulandı: hepsi `returns trigger`, hiçbiri RLS politikasında kullanılmıyor.
-- 2) İki oturum gerektiren fonksiyondan yalnız `anon` hakkı alınır (oturum açmış kullanıcı çağırmaya devam eder):
--    get_financial_report_summary (içeride auth.uid() null ise hata veriyordu), complete_onboarding (onboarding oturum açıkken yapılır).
-- DOKUNULMAYANLAR (bilinçli): is_admin, org_today, check_accountant_document_access, current_org_id vb. — iç kontrollerde/politikalarda
-- çağrılıyor olabilir; kaldırmak sorgu hatası üretebilir. Onlar ayrı, testli bir adımda ele alınır.
-- GERİ ALMA (gerekirse): grant execute on function public.<ad>() to anon, authenticated;  (anon yalnız 2. maddedekiler için)

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_business_name_to_org() from public, anon, authenticated;
revoke all on function public.sync_org_name_to_profile() from public, anon, authenticated;
revoke all on function public.tr_appointment_ensure_customer() from public, anon, authenticated;
revoke all on function public.tr_appointments_block_guard() from public, anon, authenticated;
revoke all on function public.tr_atl_events() from public, anon, authenticated;
revoke all on function public.tr_finance_document_to_transaction() from public, anon, authenticated;
revoke all on function public.tr_transactions_normalize() from public, anon, authenticated;

revoke all on function public.get_financial_report_summary(date) from public, anon;
grant execute on function public.get_financial_report_summary(date) to authenticated, service_role;
revoke all on function public.complete_onboarding(text, text, text) from public, anon;
grant execute on function public.complete_onboarding(text, text, text) to authenticated, service_role;

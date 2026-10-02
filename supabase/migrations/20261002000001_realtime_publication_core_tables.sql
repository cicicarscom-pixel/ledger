-- Realtime yayınına çekirdek tablolar (02.10.2026; Claude canlıya uyguladı, dosya kayıt amaçlı).
-- Koddaki canlı dinleyiciler bu tabloları dinliyordu ama tablolar yayında olmadığı için hiç tetiklenmiyordu:
--   Ledger Onaylananlar (finance_documents), Flow Randevu (appointments),
--   muhasebeci bağlantısı (accountant_taxpayer_links), bildirimler (notifications).
-- Realtime postgres_changes RLS'e uyar: her istemci yalnız SELECT yetkisi olduğu satırların olayını alır.
do $$
declare t text;
begin
  foreach t in array array['accountant_taxpayer_links', 'appointments', 'notifications', 'finance_documents'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

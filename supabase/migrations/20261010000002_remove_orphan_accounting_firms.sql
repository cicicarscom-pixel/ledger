-- FAZ E2 (2/2) — Sahipsiz muhasebeci firma kayıtlarının silinmesi (Claude, 10.10.2026; KULLANICI ONAYLI).
-- Kapsam: hiç üyesi ve hiç bağlantısı olmayan 10 firma (eski test/silinmiş hesap artıkları). Bağlı hiçbir satır yok
-- (olay, belge, kural, görev, konuşma, karar, denetim: hepsi 0 — silmeden önce canlıda sayıldı).
-- Koşullar tekrar denetlenir: ID listesi + "üyesi yok" + "bağlantısı yok"; biri değişmişse o firma silinmez.
-- Geri alma: docs/supabase/20261010000002_sahipsiz_firmalar_yedek.sql (birebir geri yükleme).
delete from public.accounting_firms f
where f.id in (
  'edb6ffee-efdb-4cac-9f8f-a678bbfff9e5',
  '73b3ba21-fc57-45b2-b091-f1f7a1028a55',
  '82b1344d-4d42-4ed1-b4ab-e2159b3296ac',
  '1c66d8d9-c46d-4de6-87aa-c2135dc835e5',
  'd6fd574d-f61c-41b4-aec8-1c418f263179',
  '379d24e4-4ed9-4fad-8eb5-909315e9e07f',
  'c77d2607-ce76-48f1-858d-6540956ab084',
  'c78c07fd-f073-49be-a2a9-050340f2a17a',
  '2b7c6c87-8809-4358-b7fe-d05663b9005a',
  '984203cc-c2c1-44b4-b4c3-c2da33953d35'
)
  and not exists (select 1 from public.accounting_firm_members m where m.accounting_firm_id = f.id)
  and not exists (select 1 from public.accountant_taxpayer_links l where l.accounting_firm_id = f.id);

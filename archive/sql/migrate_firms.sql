-- Mevcut ledger_accounting_firms verilerini yeni accounting_firms tablosuna taşıyalım
INSERT INTO public.accounting_firms (id, firm_name, connection_code, created_at)
SELECT id, firm_name, connection_code, created_at 
FROM public.ledger_accounting_firms
ON CONFLICT (id) DO NOTHING;

-- Mevcut yetkilileri (user_id) members tablosuna ekleyelim
INSERT INTO public.accounting_firm_members (accounting_firm_id, user_id, role)
SELECT id, user_id, 'admin' 
FROM public.ledger_accounting_firms
ON CONFLICT (accounting_firm_id, user_id) DO NOTHING;

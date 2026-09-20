-- Önce eski veya çakışan storage.objects policy'lerini temizleyelim (Faz 3 kapsamında olanlar)
-- Sadece bizim hedef bucket'larımıza özel tüm policy'leri yeniden kuracağımız için eskilere dokunmayabiliriz, ancak çakışma olmaması için ortak isimlendirilmişleri silebiliriz.
-- Güvenli olması açısından, bucket filtreli yeni spesifik policy'ler ekliyoruz.

-- Sahip: kendi klasöründe tam yetki
DROP POLICY IF EXISTS "owner_full_access" ON storage.objects;
CREATE POLICY "owner_full_access"
ON storage.objects FOR ALL
USING (
  bucket_id IN ('avatars','invoices','finance_receipts','documents')
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id IN ('avatars','invoices','finance_receipts','documents')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Mali müşavir: sadece SELECT, sadece atanmış olduğu müşterinin klasörü
DROP POLICY IF EXISTS "accountant_read_access" ON storage.objects;
CREATE POLICY "accountant_read_access"
ON storage.objects FOR SELECT
USING (
  bucket_id IN ('invoices','finance_receipts','documents')
  AND EXISTS (
    SELECT 1 FROM public.accountant_clients ac
    WHERE ac.accountant_id = auth.uid()
      AND ac.client_id::text = (storage.foldername(name))[1]
      AND ac.status = 'active'
  )
);

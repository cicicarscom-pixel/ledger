-- Mevcut "herkese açık okuma" policy'sini kaldır
DROP POLICY IF EXISTS "Allow authenticated users to read appointments" ON appointments;

-- Okuma: sadece kendi organization_id'sine ait randevular
CREATE POLICY "Org-scoped read for appointments"
ON appointments FOR SELECT
TO authenticated
USING (organization_id = auth.uid());

-- Ekleme: merchant kendi organization_id'si ile randevu oluşturabilsin
CREATE POLICY "Org-scoped insert for appointments"
ON appointments FOR INSERT
TO authenticated
WITH CHECK (organization_id = auth.uid());

-- Güncelleme: sadece kendi randevusunu onaylayabilsin/iptal edebilsin
CREATE POLICY "Org-scoped update for appointments"
ON appointments FOR UPDATE
TO authenticated
USING (organization_id = auth.uid())
WITH CHECK (organization_id = auth.uid());

-- Yeni sorgu paternimiz (organization_id + date) için index
CREATE INDEX IF NOT EXISTS idx_appointments_org_date
ON appointments(organization_id, date);
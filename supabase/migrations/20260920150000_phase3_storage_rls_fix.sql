-- Ensure old permissive policies are dropped so owner_full_access actually works
DROP POLICY IF EXISTS "Avatar Images Upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Images Update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Images View" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Images Delete" ON storage.objects;

-- We already created "owner_full_access" and "accountant_read_access" in 20260920142050_phase3_storage_rls.sql

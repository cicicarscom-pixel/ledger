-- Ensure the 'avatars' bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Avatar Images Upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Images Update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Images View" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Images Delete" ON storage.objects;



-- 1. Allow public to view (SELECT) avatars
CREATE POLICY "Avatar Images View"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 2. Allow authenticated users to upload (INSERT) avatars
CREATE POLICY "Avatar Images Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- 3. Allow authenticated users to update (UPDATE) avatars
CREATE POLICY "Avatar Images Update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- 4. Allow authenticated users to delete (DELETE) avatars
CREATE POLICY "Avatar Images Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

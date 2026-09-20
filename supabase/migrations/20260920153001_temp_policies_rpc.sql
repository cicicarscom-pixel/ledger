DROP FUNCTION IF EXISTS public.get_storage_policies();
CREATE OR REPLACE FUNCTION public.get_storage_policies()
RETURNS TABLE (
  policyname text,
  cmd text,
  roles text[],
  qual text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.policyname::text, 
    p.cmd::text, 
    p.roles::text[], 
    p.qual::text
  FROM pg_policies p
  WHERE p.schemaname = 'storage' AND p.tablename = 'objects';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

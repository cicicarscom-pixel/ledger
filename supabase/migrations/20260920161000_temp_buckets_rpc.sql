CREATE OR REPLACE FUNCTION public.get_storage_buckets()
RETURNS TABLE (
  id text,
  public boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id, 
    b.public
  FROM storage.buckets b;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

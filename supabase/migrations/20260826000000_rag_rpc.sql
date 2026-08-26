-- 20260826000000_rag_rpc.sql
CREATE OR REPLACE FUNCTION match_company_documents(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_profile_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  file_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    company_documents.id,
    company_documents.content,
    1 - (company_documents.embedding <=> query_embedding) AS similarity,
    company_documents.file_name
  FROM company_documents
  WHERE 
    company_documents.profile_id = p_profile_id
    AND 1 - (company_documents.embedding <=> query_embedding) > match_threshold
  ORDER BY company_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

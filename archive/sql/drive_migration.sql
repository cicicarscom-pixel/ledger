-- ==============================================================================
-- 11. COMPANY DOCUMENTS (RAG - Vector Database)
-- ==============================================================================
-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.company_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_id TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768), -- Gemini text-embedding-004 uses 768 dimensions by default
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kullanici kendi dökümanlarini gorebilir" ON public.company_documents FOR SELECT USING (auth.uid() = profile_id);
-- Trigger for updated_at
CREATE TRIGGER update_company_documents_updated_at BEFORE UPDATE ON public.company_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX ON public.company_documents USING hnsw (embedding vector_cosine_ops);


-- ==============================================================================
-- 12. DRIVE WATCH CHANNELS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.drive_watch_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  folder_id TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  resource_id TEXT NOT NULL,
  expiration TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.drive_watch_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kullanici kendi kanallarini gorebilir" ON public.drive_watch_channels FOR ALL USING (auth.uid() = profile_id);
CREATE TRIGGER update_drive_watch_channels_updated_at BEFORE UPDATE ON public.drive_watch_channels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

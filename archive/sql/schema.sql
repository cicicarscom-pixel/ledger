-- ==============================================================================
-- Workigom Flow - Supabase PostgreSQL Schema
-- ==============================================================================

-- DİKKAT: Bu komutlar mevcut tabloları siler (Geliştirme aşaması için güvenlidir).
-- Hatalı kalıntıları temizlemek için:
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.social_accounts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;


-- Bütün tablolar için otomatik updated_at güncelleyici fonksiyon
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==============================================================================
-- 1. PROFILES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  business_name TEXT,
  category TEXT,
  phone_number TEXT,
  address JSONB,
  avatar_url TEXT,
  ai_plan TEXT DEFAULT 'free',
  system_prompt TEXT,
  google_drive_folder_id TEXT,
  whatsapp_phone_number_id TEXT,
  whatsapp_business_account_id TEXT,
  whatsapp_access_token TEXT,
  whatsapp_message_count INTEGER DEFAULT 0,
  whatsapp_monthly_quota INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Sadece kendi profiline erişebilir)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profiles" ON public.profiles FOR ALL USING (auth.uid() = id);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view and manage their own notifications" ON public.notifications FOR ALL USING (auth.uid() = profile_id);

CREATE TRIGGER handle_updated_at_notifications BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE POLICY "Kullanicilar kendi profillerini guncelleyebilir" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- 2. SOCIAL ACCOUNTS (Bağlı Zernio Hesapları)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  zernio_account_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kullanici kendi hesaplarini gorebilir" ON public.social_accounts FOR ALL USING (auth.uid() = profile_id);
CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON public.social_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- 3. POSTS (Gönderiler)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  zernio_post_id TEXT, -- Eğer yayınlandıysa dolar
  content TEXT,
  media_urls TEXT[],
  status TEXT DEFAULT 'draft', -- draft, scheduled, published, failed
  scheduled_for TIMESTAMPTZ,
  platforms TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kullanici kendi gonderilerini gorebilir" ON public.posts FOR ALL USING (auth.uid() = profile_id);
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- 4. CONVERSATIONS & MESSAGES (Gelen Kutusu: Mesajlar)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  zernio_conversation_id TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active, archived
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kullanici kendi sohbetlerini gorebilir" ON public.conversations FOR ALL USING (auth.uid() = profile_id);
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  zernio_message_id TEXT NOT NULL UNIQUE,
  direction TEXT NOT NULL, -- incoming, outgoing
  content TEXT,
  reactions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kullanici kendi mesajlarini gorebilir" ON public.messages FOR ALL USING (auth.uid() = profile_id);
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- 5. COMMENTS (Gelen Kutusu: Yorumlar)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL, -- Kendi attığımız bir post ise
  zernio_post_id TEXT, -- Başkası attıysa dış ID
  zernio_comment_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  liked BOOLEAN DEFAULT false,
  hidden BOOLEAN DEFAULT false,
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kullanici kendi yorumlarini gorebilir" ON public.comments FOR ALL USING (auth.uid() = profile_id);
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- 6. REVIEWS (Gelen Kutusu: Değerlendirmeler)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  zernio_review_id TEXT NOT NULL UNIQUE,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  reply TEXT, -- İşletme/AI yanıtı
  platform TEXT DEFAULT 'google',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kullanici kendi degerlendirmelerini gorebilir" ON public.reviews FOR ALL USING (auth.uid() = profile_id);
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- 7. TRANSACTIONS (AI Muhasebe / Fiş / Gelir Gider)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- paid, pending
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kullanici kendi finansal islemlerini gorebilir" ON public.transactions FOR ALL USING (auth.uid() = profile_id);
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ==============================================================================
-- 9. API USAGE LOGS (Maliyet ve Kullanım Günlüğü)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL, -- 'finance', 'whatsapp', 'social_image'
  model_name TEXT NOT NULL, -- 'gemini-2.5-flash', 'imagen-4.0-generate-001', etc.
  prompt_tokens INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  generated_image_count INT DEFAULT 0,
  estimated_cost_try NUMERIC(10, 4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Esnaflar sadece kendi harcamalarını görebilir" ON public.api_usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Esnaflar kendi harcamalarını kaydedebilir" ON public.api_usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_usage_user_monthly ON public.api_usage_logs(user_id, created_at);

-- ==============================================================================
-- INDEXES (Performans artışı için)
-- ==============================================================================
CREATE INDEX idx_social_accounts_profile_id ON public.social_accounts(profile_id);
CREATE INDEX idx_posts_profile_id ON public.posts(profile_id);
CREATE INDEX idx_conversations_profile_id ON public.conversations(profile_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_profile_id ON public.messages(profile_id);
CREATE INDEX idx_comments_profile_id ON public.comments(profile_id);
CREATE INDEX idx_comments_post_id ON public.comments(post_id);
CREATE INDEX idx_reviews_profile_id ON public.reviews(profile_id);
CREATE INDEX idx_transactions_profile_id_date ON public.transactions(profile_id, date);

-- ==============================================================================
-- 10. AUTOMATIC PROFILE TRIGGER (Kayıt Esnasında Profil Oluşturucu)
-- ==============================================================================
-- auth.users tablosuna yeni eklenen kayıtları otomatik olarak public.profiles tablosuna kopyalar.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, phone_number, ai_plan, system_prompt)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'phone',
    'free',
    ''
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- ENABLE REALTIME
-- ==============================================================================
-- DİKKAT: Yeni tabloların veritabanı değişikliklerini (INSERT, UPDATE, DELETE) 
-- frontend tarafına websocket üzerinden anlık (realtime) gönderebilmesi için zorunludur.
alter publication supabase_realtime add table conversations, messages, comments, reviews, posts;


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

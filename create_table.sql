
CREATE TABLE IF NOT EXISTS public.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  zernio_account_id TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Kullanici kendi hesaplarini gorebilir" ON public.social_accounts FOR ALL USING (auth.uid() = profile_id);
CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON public.social_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_social_accounts_profile_id ON public.social_accounts(profile_id);
NOTIFY pgrst, 'reload schema';


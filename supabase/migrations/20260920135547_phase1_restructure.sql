-- 1. PROFILES: Mevcut tabloya eksik kolonların güvenle eklenmesi
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- 2. ORGANIZATIONS: owner_id kolonunun eklenmesi (Mevcut veriler patlamasın diye şimdilik NOT NULL olmadan ekliyoruz)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS owner_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. ACCOUNTANT_CLIENTS: Sıfırdan oluşturuluyor
CREATE TABLE IF NOT EXISTS public.accountant_clients (
  id uuid primary key default gen_random_uuid(),
  accountant_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  created_at timestamptz not null default now(),
  unique (accountant_id, client_id)
);

-- 4. UPDATE TRIGGER'LARI
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

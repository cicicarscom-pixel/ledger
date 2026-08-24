
-- Add Super Admin and Account Status columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned'));

-- Policy to allow super admins to see all profiles
CREATE POLICY "Super admins can see all profiles"
  ON public.profiles FOR SELECT
  USING ( (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true );

-- Policy to allow super admins to see all organizations
CREATE POLICY "Super admins can see all organizations"
  ON public.organizations FOR SELECT
  USING ( (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()) = true );

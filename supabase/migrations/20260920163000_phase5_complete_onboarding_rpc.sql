CREATE OR REPLACE FUNCTION public.complete_onboarding(
  p_full_name text,
  p_phone text,
  p_business_name text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_profile_updated boolean;
  v_org_updated boolean;
BEGIN
  -- 1. Update Profile
  UPDATE public.profiles
  SET full_name = p_full_name,
      phone = p_phone,
      onboarding_completed = true
  WHERE id = auth.uid()
  RETURNING true INTO v_profile_updated;
  
  IF v_profile_updated IS NULL THEN
    RAISE EXCEPTION 'Profil bulunamadı veya güncellenemedi';
  END IF;
  
  -- 2. Update Organization
  UPDATE public.organizations
  SET name = p_business_name
  WHERE owner_id = auth.uid()
  RETURNING true INTO v_org_updated;
  
  IF v_org_updated IS NULL THEN
    RAISE EXCEPTION 'Organizasyon bulunamadı veya güncellenemedi';
  END IF;
END;
$$;

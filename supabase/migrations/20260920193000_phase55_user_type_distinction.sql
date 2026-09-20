-- Migration for Phase 5.5: user_type distinction and trigger update

-- 1. Add user_type to profiles
ALTER TABLE public.profiles 
ADD COLUMN user_type text NOT NULL DEFAULT 'business'
CHECK (user_type IN ('business', 'accountant'));

-- 2. Update trigger to respect user_type
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_type text;
BEGIN
  -- Extract user_type from metadata, default to 'business'
  v_user_type := coalesce(new.raw_user_meta_data->>'user_type', 'business');

  -- Create profile
  INSERT INTO public.profiles (id, full_name, email, user_type, onboarding_completed)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, v_user_type, false)
  ON CONFLICT (id) DO NOTHING;

  -- Create organization ONLY for business users
  IF v_user_type = 'business' THEN
    INSERT INTO public.organizations (owner_id, name)
    VALUES (new.id, null)
    ON CONFLICT (owner_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

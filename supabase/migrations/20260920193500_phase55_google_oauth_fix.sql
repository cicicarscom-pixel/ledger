-- Fix user_type for Google OAuth

ALTER TABLE public.profiles ALTER COLUMN user_type DROP NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN user_type DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_type text;
BEGIN
  -- No default, can be null for OAuth
  v_user_type := new.raw_user_meta_data->>'user_type';

  INSERT INTO public.profiles (id, full_name, email, user_type, onboarding_completed)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, v_user_type, false)
  ON CONFLICT (id) DO NOTHING;

  IF v_user_type = 'business' THEN
    INSERT INTO public.organizations (owner_id, name)
    VALUES (new.id, null)
    ON CONFLICT (owner_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

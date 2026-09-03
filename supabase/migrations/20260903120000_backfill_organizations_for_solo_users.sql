DO $$
DECLARE
  u RECORD;
  new_org_id uuid;
BEGIN
  FOR u IN
    SELECT au.id, au.raw_user_meta_data->>'full_name' AS full_name, au.email
    FROM auth.users au
    LEFT JOIN public.organization_members om ON om.user_id = au.id
    WHERE om.id IS NULL
  LOOP
    INSERT INTO public.organizations (name)
    VALUES (COALESCE(NULLIF(u.full_name, ''), u.email, 'Workigom Flow Kullanıcısı'))
    RETURNING id INTO new_org_id;

    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, u.id, 'owner');
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_org_id uuid;
BEGIN
  INSERT INTO public.profiles (id, phone_number, ai_plan, system_prompt)
  VALUES (new.id, new.raw_user_meta_data->>'phone', 'free', '');

  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NULLIF(new.raw_user_meta_data->>'full_name', ''), new.email, 'Workigom Flow Kullanıcısı'))
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (new_org_id, new.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

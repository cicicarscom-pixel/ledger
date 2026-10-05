-- 1. Mükerrer firma üyeliklerini sil (her kullanıcı için en eski olanı bırak)
DELETE FROM accounting_firm_members
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY created_at ASC) as rnum
        FROM accounting_firm_members
    ) dupes
    WHERE rnum > 1
);

-- 2. user_id üzerinde benzersizlik (unique constraint) ekle
ALTER TABLE accounting_firm_members
ADD CONSTRAINT accounting_firm_members_user_id_key UNIQUE (user_id);

-- 3. ensure_my_accounting_firm fonksiyonunu oluştur
CREATE OR REPLACE FUNCTION ensure_my_accounting_firm()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_firm_id uuid;
    v_member_id uuid;
    v_user_email text;
    v_user_name text;
    v_connection_code text;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Zaten var mı kontrol et
    SELECT accounting_firm_id INTO v_firm_id
    FROM accounting_firm_members
    WHERE user_id = v_user_id
    LIMIT 1;

    IF v_firm_id IS NOT NULL THEN
        RETURN v_firm_id;
    END IF;

    -- Yoksa güvenli oluştur (connection_code üret)
    v_connection_code := 'WG-' || floor(random() * 90000 + 10000)::text;

    BEGIN
        SELECT email, raw_user_meta_data->>'full_name' INTO v_user_email, v_user_name FROM auth.users WHERE id = v_user_id;

        INSERT INTO accounting_firms (firm_name, connection_code)
        VALUES (COALESCE(v_user_name, split_part(v_user_email, '@', 1), 'Yeni Müşavirlik Firması'), v_connection_code)
        RETURNING id INTO v_firm_id;

        INSERT INTO accounting_firm_members (accounting_firm_id, user_id, role)
        VALUES (v_firm_id, v_user_id, 'admin');

        RETURN v_firm_id;
    EXCEPTION WHEN unique_violation THEN
        -- Başka bir işlem zaten oluşturduysa yakala
        SELECT accounting_firm_id INTO v_firm_id
        FROM accounting_firm_members
        WHERE user_id = v_user_id
        LIMIT 1;
        RETURN v_firm_id;
    END;
END;
$$;

-- 4. handle_new_user trigger'ını güncelle
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type text;
  v_connection_code text;
  v_firm_id uuid;
BEGIN
  v_user_type := new.raw_user_meta_data->>'user_type';

  INSERT INTO public.profiles (id, full_name, email, user_type, onboarding_completed)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, v_user_type, false)
  ON CONFLICT (id) DO NOTHING;

  IF v_user_type = 'business' THEN
    INSERT INTO public.organizations (owner_id, name)
    VALUES (new.id, null)
    ON CONFLICT (owner_id) DO NOTHING;
  ELSIF v_user_type = 'accountant' THEN
    -- Müşavirler için yeni firma aç
    v_connection_code := 'WG-' || floor(random() * 90000 + 10000)::text;
    INSERT INTO public.accounting_firms (firm_name, connection_code)
    VALUES (COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1), 'Yeni Müşavirlik Firması'), v_connection_code)
    RETURNING id INTO v_firm_id;

    INSERT INTO public.accounting_firm_members (accounting_firm_id, user_id, role)
    VALUES (v_firm_id, new.id, 'admin')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$;

-- Eksik müşavirlere firmalarını açalım
DO $$
DECLARE
    rec RECORD;
    v_firm_id uuid;
    v_connection_code text;
BEGIN
    FOR rec IN 
        SELECT p.id as user_id, p.full_name, p.email
        FROM public.profiles p
        LEFT JOIN public.accounting_firm_members afm ON p.id = afm.user_id
        WHERE p.user_type = 'accountant' AND afm.id IS NULL
    LOOP
        v_connection_code := 'WG-' || floor(random() * 90000 + 10000)::text;
        
        INSERT INTO public.accounting_firms (firm_name, connection_code)
        VALUES (COALESCE(rec.full_name, split_part(rec.email, '@', 1), 'Yeni Müşavirlik Firması'), v_connection_code)
        RETURNING id INTO v_firm_id;

        INSERT INTO public.accounting_firm_members (accounting_firm_id, user_id, role)
        VALUES (v_firm_id, rec.user_id, 'admin')
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END;
$$;

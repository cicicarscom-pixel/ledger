-- Migration V10: Sync Taxpayer Profile on Connection

CREATE OR REPLACE FUNCTION public.connect_accountant(input_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_firm_id UUID;
    v_existing_link RECORD;
    v_profile RECORD;
BEGIN
    -- 1. Identify User
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Yetkisiz erisim. Lutfen giris yapin.');
    END IF;

    -- 1.5 Get Profile Data
    SELECT business_name, authorized_person, phone_number, address INTO v_profile
    FROM public.profiles WHERE id = v_user_id;

    -- 2. Resolve Taxpayer Organization
    SELECT organization_id INTO v_org_id
    FROM public.organization_members
    WHERE user_id = v_user_id
    LIMIT 1;

    IF v_org_id IS NULL THEN
        INSERT INTO public.organizations (name) 
        VALUES (COALESCE(v_profile.business_name, 'Benim Isletmem')) 
        RETURNING id INTO v_org_id;
        
        INSERT INTO public.organization_members (organization_id, user_id, role) 
        VALUES (v_org_id, v_user_id, 'owner');
    ELSE
        -- Update existing organization name with profile data just in case
        UPDATE public.organizations 
        SET name = COALESCE(v_profile.business_name, name)
        WHERE id = v_org_id;
    END IF;

    -- 3. Resolve Accounting Firm
    SELECT id INTO v_firm_id 
    FROM public.accounting_firms 
    WHERE connection_code = input_code 
    LIMIT 1;

    IF v_firm_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Musavir bulunamadi.');
    END IF;

    -- 4. Check existing link
    SELECT id, status INTO v_existing_link
    FROM public.accountant_taxpayer_links
    WHERE taxpayer_organization_id = v_org_id AND accounting_firm_id = v_firm_id
    LIMIT 1;

    IF v_existing_link IS NOT NULL THEN
        IF v_existing_link.status = 'active' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Zaten aktif bir musavir baglantiniz bulunuyor.');
        ELSIF v_existing_link.status = 'pending_confirmation' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Onay bekleyen bir isteginiz zaten mevcut.');
        ELSE
            UPDATE public.accountant_taxpayer_links
            SET status = 'pending_confirmation',
                disconnected_by_user_id = NULL,
                disconnect_reason = NULL,
                disconnect_source = NULL,
                updated_at = NOW()
            WHERE id = v_existing_link.id;

            INSERT INTO public.accountant_connection_events (
                event_type, actor_user_id, accounting_firm_id, taxpayer_organization_id, previous_status, new_status, source
            ) VALUES (
                'connection.request_sent', v_user_id, v_firm_id, v_org_id, v_existing_link.status, 'pending_confirmation', 'flow'
            );

            RETURN jsonb_build_object('success', true, 'message', 'Baglanti istegi musavirinize iletildi.');
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.accountant_taxpayer_links 
        WHERE taxpayer_organization_id = v_org_id AND status = 'active'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mevcut bir musaviriniz varken yeni istek gonderemezsiniz.');
    END IF;

    -- 5. Create new connection link
    INSERT INTO public.accountant_taxpayer_links (
        taxpayer_organization_id, accounting_firm_id, status
    ) VALUES (
        v_org_id, v_firm_id, 'pending_confirmation'
    );

    INSERT INTO public.accountant_connection_events (
        event_type, actor_user_id, accounting_firm_id, taxpayer_organization_id, new_status, source
    ) VALUES (
        'connection.request_sent', v_user_id, v_firm_id, v_org_id, 'pending_confirmation', 'flow'
    );

    RETURN jsonb_build_object('success', true, 'message', 'Baglanti istegi musavirinize iletildi.');
END;
$$;

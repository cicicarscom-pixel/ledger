-- Migration V5: Connection Approval Flow

-- 1. Modify `connect_accountant` to UPSERT into `pending_confirmation`
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
BEGIN
    -- 1. Identify User
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Yetkisiz erişim. Lütfen giriş yapın.');
    END IF;

    -- 2. Resolve Taxpayer Organization
    SELECT organization_id INTO v_org_id
    FROM public.organization_members
    WHERE user_id = v_user_id
    LIMIT 1;

    IF v_org_id IS NULL THEN
        INSERT INTO public.organizations (name) VALUES ('Benim İşletmem') RETURNING id INTO v_org_id;
        INSERT INTO public.organization_members (organization_id, user_id, role) VALUES (v_org_id, v_user_id, 'owner');
    END IF;

    -- 3. Resolve Accounting Firm
    SELECT id INTO v_firm_id 
    FROM public.accounting_firms 
    WHERE connection_code = input_code 
    LIMIT 1;

    IF v_firm_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Müşavir bulunamadı.');
    END IF;

    -- 4. Check existing link (Specific to this firm and org)
    SELECT id, status INTO v_existing_link
    FROM public.accountant_taxpayer_links
    WHERE taxpayer_organization_id = v_org_id AND accounting_firm_id = v_firm_id
    LIMIT 1;

    IF v_existing_link IS NOT NULL THEN
        IF v_existing_link.status = 'active' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Zaten aktif bir müşavir bağlantınız bulunuyor.');
        ELSIF v_existing_link.status = 'pending_confirmation' THEN
            RETURN jsonb_build_object('success', false, 'error', 'Onay bekleyen bir isteğiniz zaten mevcut.');
        ELSE
            -- UPSERT logic: it was disconnected, rejected, cancelled etc.
            UPDATE public.accountant_taxpayer_links
            SET status = 'pending_confirmation',
                disconnected_by_user_id = NULL,
                disconnect_reason = NULL,
                disconnect_source = NULL,
                updated_at = NOW()
            WHERE id = v_existing_link.id;

            -- Audit log
            INSERT INTO public.accountant_connection_events (
                event_type, actor_user_id, accounting_firm_id, taxpayer_organization_id, previous_status, new_status, source
            ) VALUES (
                'connection.request_sent', v_user_id, v_firm_id, v_org_id, v_existing_link.status, 'pending_confirmation', 'flow'
            );

            RETURN jsonb_build_object('success', true, 'message', 'Bağlantı isteği müşavirinize iletildi.');
        END IF;
    END IF;

    -- Also check if they are actively linked to ANOTHER firm
    IF EXISTS (
        SELECT 1 FROM public.accountant_taxpayer_links 
        WHERE taxpayer_organization_id = v_org_id AND status = 'active'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mevcut bir müşaviriniz varken yeni istek gönderemezsiniz.');
    END IF;

    -- 5. Create new connection link as pending
    INSERT INTO public.accountant_taxpayer_links (
        taxpayer_organization_id, accounting_firm_id, status
    ) VALUES (
        v_org_id, v_firm_id, 'pending_confirmation'
    );

    -- Audit log
    INSERT INTO public.accountant_connection_events (
        event_type, actor_user_id, accounting_firm_id, taxpayer_organization_id, new_status, source
    ) VALUES (
        'connection.request_sent', v_user_id, v_firm_id, v_org_id, 'pending_confirmation', 'flow'
    );

    RETURN jsonb_build_object('success', true, 'message', 'Bağlantı isteği müşavirinize iletildi.');
END;
$$;

-- 2. New RPC: review_connection_request for Ledger to Accept/Reject
CREATE OR REPLACE FUNCTION public.review_connection_request(
    p_link_id UUID,
    p_action TEXT -- 'accept' or 'reject'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_firm_id UUID;
    v_link_record RECORD;
    v_new_status TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Yetkisiz erişim');
    END IF;

    -- Verify the user belongs to the accounting firm that owns this link
    SELECT l.id, l.taxpayer_organization_id, l.accounting_firm_id, l.status
    INTO v_link_record
    FROM public.accountant_taxpayer_links l
    JOIN public.accounting_firm_members m ON l.accounting_firm_id = m.accounting_firm_id
    WHERE l.id = p_link_id AND m.user_id = v_user_id
    LIMIT 1;

    IF v_link_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bu işlemi yapmaya yetkiniz yok veya kayıt bulunamadı.');
    END IF;

    IF v_link_record.status != 'pending_confirmation' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Sadece "onay bekleyen" istekleri değerlendirebilirsiniz.');
    END IF;

    IF p_action = 'accept' THEN
        v_new_status := 'active';
    ELSIF p_action = 'reject' THEN
        v_new_status := 'rejected';
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Geçersiz işlem');
    END IF;

    -- Update link
    UPDATE public.accountant_taxpayer_links
    SET status = v_new_status, updated_at = NOW()
    WHERE id = p_link_id;

    -- Audit log
    INSERT INTO public.accountant_connection_events (
        event_type, actor_user_id, accounting_firm_id, taxpayer_organization_id, previous_status, new_status, source
    ) VALUES (
        'connection.' || p_action || 'ed', v_user_id, v_link_record.accounting_firm_id, v_link_record.taxpayer_organization_id, 'pending_confirmation', v_new_status, 'ledger'
    );

    RETURN jsonb_build_object('success', true, 'message', 'İşlem başarıyla kaydedildi.');
END;
$$;

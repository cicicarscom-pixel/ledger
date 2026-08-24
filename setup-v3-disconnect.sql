-- Setup V3: Disconnect & Audit Flow for Ledger & Flow Integration

-- 1. Add fields to accountant_taxpayer_links
ALTER TABLE public.accountant_taxpayer_links 
ADD COLUMN IF NOT EXISTS disconnected_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS disconnect_reason TEXT,
ADD COLUMN IF NOT EXISTS disconnect_source TEXT CHECK (disconnect_source IN ('flow', 'ledger', 'system'));

-- 2. Create Audit Events Table
CREATE TABLE IF NOT EXISTS public.accountant_connection_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    accounting_firm_id UUID REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
    taxpayer_organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT,
    reason TEXT,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for audit table
ALTER TABLE public.accountant_connection_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firms can view their own audit events" 
ON public.accountant_connection_events FOR SELECT 
USING (accounting_firm_id IN (SELECT accounting_firm_id FROM public.accounting_firm_members WHERE user_id = auth.uid()));

CREATE POLICY "Orgs can view their own audit events" 
ON public.accountant_connection_events FOR SELECT 
USING (taxpayer_organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));


-- 3. RPC: Disconnect Current Accountant (For Flow Mobile App)
CREATE OR REPLACE FUNCTION public.disconnect_current_accountant(p_reason TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_link_id UUID;
    v_firm_id UUID;
    v_rows_affected INT;
BEGIN
    -- Identify User
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Yetkisiz erişim. Lütfen giriş yapın.');
    END IF;

    -- Find User's Organization
    SELECT organization_id INTO v_org_id
    FROM public.organization_members
    WHERE user_id = v_user_id
    LIMIT 1;

    IF v_org_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Herhangi bir organizasyona bağlı değilsiniz.');
    END IF;

    -- Find Active Link
    SELECT id, accounting_firm_id INTO v_link_id, v_firm_id
    FROM public.accountant_taxpayer_links
    WHERE taxpayer_organization_id = v_org_id AND status = 'active'
    LIMIT 1;

    IF v_link_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ACTIVE_CONNECTION_NOT_FOUND', 'message', 'Kesilecek aktif bir bağlantı bulunamadı.');
    END IF;

    -- Disconnect
    UPDATE public.accountant_taxpayer_links
    SET 
        status = 'disconnected',
        disconnected_at = NOW(),
        disconnected_by_user_id = v_user_id,
        disconnect_source = 'flow',
        disconnect_reason = p_reason,
        updated_at = NOW()
    WHERE id = v_link_id AND status = 'active';

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected = 0 THEN
         RETURN jsonb_build_object('success', false, 'error', 'Bağlantı kesme işlemi başarısız oldu (Zaten kesilmiş olabilir).');
    END IF;

    -- Write Audit Event
    INSERT INTO public.accountant_connection_events (
        event_type, actor_user_id, accounting_firm_id, taxpayer_organization_id, 
        previous_status, new_status, reason, source
    ) VALUES (
        'connection.disconnected_by_taxpayer',
        v_user_id,
        v_firm_id,
        v_org_id,
        'active',
        'disconnected',
        p_reason,
        'flow'
    );

    RETURN jsonb_build_object('success', true, 'message', 'Bağlantı başarıyla kesildi.');
END;
$$;

-- Setup V2 Architecture for Ledger & Flow Integration
-- Run this script in the Supabase SQL Editor

-- 1. Organizations (Flow Taxpayer Businesses)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Organization Members
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'owner',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 3. Accounting Firms (Replaces ledger_accounting_firms conceptually, or map to it)
-- Note: If you already use ledger_accounting_firms, you can rename it or use this new one.
CREATE TABLE IF NOT EXISTS public.accounting_firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_name TEXT NOT NULL,
    connection_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Accounting Firm Members
CREATE TABLE IF NOT EXISTS public.accounting_firm_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accounting_firm_id UUID NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(accounting_firm_id, user_id)
);

-- 5. Accountant Taxpayer Links (The core connection table)
CREATE TABLE IF NOT EXISTS public.accountant_taxpayer_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accounting_firm_id UUID NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
    taxpayer_organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('pending_confirmation', 'active', 'disconnected', 'rejected', 'replaced')),
        
    source TEXT NOT NULL
        CHECK (source IN ('advisor_code', 'whatsapp_invitation', 'manual')),
        
    initiated_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    confirmed_by_user_id UUID REFERENCES auth.users(id),
    
    connected_at TIMESTAMPTZ,
    disconnected_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index to ensure one active firm per taxpayer organization
CREATE UNIQUE INDEX IF NOT EXISTS taxpayer_one_active_accounting_firm
ON public.accountant_taxpayer_links (taxpayer_organization_id)
WHERE status = 'active';

-- RLS Enablement
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_firm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountant_taxpayer_links ENABLE ROW LEVEL SECURITY;

-- Organizations & Members RLS
CREATE POLICY "Users can view orgs they belong to" 
ON public.organizations FOR SELECT 
USING (id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own org memberships" 
ON public.organization_members FOR SELECT 
USING (user_id = auth.uid());

-- Accounting Firms & Members RLS
CREATE POLICY "Users can view firms they belong to" 
ON public.accounting_firms FOR SELECT 
USING (id IN (SELECT accounting_firm_id FROM public.accounting_firm_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own firm memberships" 
ON public.accounting_firm_members FOR SELECT 
USING (user_id = auth.uid());

-- Links RLS
CREATE POLICY "Orgs can view their own links" 
ON public.accountant_taxpayer_links FOR SELECT 
USING (taxpayer_organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Firms can view their own links" 
ON public.accountant_taxpayer_links FOR SELECT 
USING (accounting_firm_id IN (SELECT accounting_firm_id FROM public.accounting_firm_members WHERE user_id = auth.uid()));


-- 6. RPC: Resolve Accountant Code (Safe Preview)
CREATE OR REPLACE FUNCTION public.resolve_accountant_code(input_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_firm RECORD;
BEGIN
    -- Check if firm exists with this code
    SELECT id, firm_name 
    INTO v_firm 
    FROM public.accounting_firms 
    WHERE connection_code = input_code 
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Müşavir bulunamadı. Lütfen kodu kontrol edin.');
    END IF;

    -- Return safe preview data (no emails or sensitive info)
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'accounting_firm_id', v_firm.id,
            'firm_name', v_firm.firm_name,
            'is_verified', true
        )
    );
END;
$$;

-- 7. RPC: Connect Accountant
CREATE OR REPLACE FUNCTION public.connect_accountant(input_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_org_id UUID;
    v_firm_id UUID;
    v_existing_link UUID;
BEGIN
    -- 1. Identify User
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Yetkisiz erişim. Lütfen giriş yapın.');
    END IF;

    -- 2. Resolve Taxpayer Organization
    -- Assume the user is an owner/admin of exactly one organization for simplicity, 
    -- or get the first one. In production, pass the org_id explicitly if they have multiple.
    SELECT organization_id INTO v_org_id
    FROM public.organization_members
    WHERE user_id = v_user_id
    LIMIT 1;

    IF v_org_id IS NULL THEN
        -- Auto-create an organization if they don't have one (for seamless UX)
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

    -- 4. Check existing active link
    SELECT id INTO v_existing_link
    FROM public.accountant_taxpayer_links
    WHERE taxpayer_organization_id = v_org_id AND status = 'active'
    LIMIT 1;

    IF v_existing_link IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Zaten aktif bir müşavir bağlantınız bulunuyor.');
    END IF;

    -- 5. Create Link
    INSERT INTO public.accountant_taxpayer_links (
        accounting_firm_id,
        taxpayer_organization_id,
        status,
        source,
        initiated_by_user_id,
        connected_at
    ) VALUES (
        v_firm_id,
        v_org_id,
        'active', -- Assuming auto-connect for now based on WG code
        'advisor_code',
        v_user_id,
        NOW()
    );

    -- 6. Return Success
    RETURN jsonb_build_object('success', true, 'message', 'Müşavir bağlantınız başarıyla oluşturuldu.');
END;
$$;

-- Migration: V4 Organizations Legal & Contact Profiles

-- 1. Legal Profiles
CREATE TABLE IF NOT EXISTS public.organization_legal_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    entity_type TEXT CHECK (entity_type IN ('sole_proprietorship', 'limited_company', 'joint_stock_company', 'partnership', 'other')),
    tax_identifier_type TEXT, -- e.g. VKN, TCKN, VAT
    tax_identifier TEXT,
    tax_office TEXT,
    registration_number TEXT,
    country_code TEXT DEFAULT 'TR',
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_at TIMESTAMPTZ,
    updated_by_user_id UUID REFERENCES auth.users(id),
    source TEXT CHECK (source IN ('flow', 'ledger', 'import', 'api')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- 2. Addresses
CREATE TABLE IF NOT EXISTS public.organization_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'headquarters',
    country_code TEXT DEFAULT 'TR',
    city TEXT,
    district TEXT,
    postal_code TEXT,
    address_line_1 TEXT,
    address_line_2 TEXT,
    is_primary BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Contacts
CREATE TABLE IF NOT EXISTS public.organization_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('phone', 'email')),
    value TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Audit Table
CREATE TABLE IF NOT EXISTS public.organization_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    actor_user_id UUID REFERENCES auth.users(id),
    previous_data JSONB,
    new_data JSONB,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. RLS Policies
ALTER TABLE public.organization_legal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_audit_events ENABLE ROW LEVEL SECURITY;

-- Read policies for organization members
CREATE POLICY "Members can view org legal profiles" ON public.organization_legal_profiles FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can view org addresses" ON public.organization_addresses FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can view org contacts" ON public.organization_contacts FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can view org audit events" ON public.organization_audit_events FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Update policies (owner, admin only)
CREATE POLICY "Admins can update legal profiles" ON public.organization_legal_profiles FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "Admins can update addresses" ON public.organization_addresses FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
CREATE POLICY "Admins can update contacts" ON public.organization_contacts FOR ALL USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- Provide read access to linked accounting firms
CREATE POLICY "Firms can view linked org legal profiles" ON public.organization_legal_profiles FOR SELECT USING (organization_id IN (SELECT taxpayer_organization_id FROM public.accountant_taxpayer_links WHERE accounting_firm_id IN (SELECT accounting_firm_id FROM public.accounting_firm_members WHERE user_id = auth.uid())));
CREATE POLICY "Firms can view linked org addresses" ON public.organization_addresses FOR SELECT USING (organization_id IN (SELECT taxpayer_organization_id FROM public.accountant_taxpayer_links WHERE accounting_firm_id IN (SELECT accounting_firm_id FROM public.accounting_firm_members WHERE user_id = auth.uid())));
CREATE POLICY "Firms can view linked org contacts" ON public.organization_contacts FOR SELECT USING (organization_id IN (SELECT taxpayer_organization_id FROM public.accountant_taxpayer_links WHERE accounting_firm_id IN (SELECT accounting_firm_id FROM public.accounting_firm_members WHERE user_id = auth.uid())));

-- 6. RPC: Update Business Profile (Single endpoint for Flow)
CREATE OR REPLACE FUNCTION public.update_business_profile(
    p_organization_id UUID,
    p_legal_name TEXT,
    p_entity_type TEXT,
    p_tax_identifier_type TEXT,
    p_tax_identifier TEXT,
    p_tax_office TEXT,
    p_city TEXT,
    p_district TEXT,
    p_address_line_1 TEXT,
    p_phone TEXT,
    p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Yetkisiz erişim');
    END IF;

    -- Verify Role
    SELECT role INTO v_role FROM public.organization_members WHERE organization_id = p_organization_id AND user_id = v_user_id LIMIT 1;
    IF v_role NOT IN ('owner', 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bu işletmeyi güncelleme yetkiniz yok');
    END IF;

    -- 1. Update organizations table
    UPDATE public.organizations SET name = p_legal_name, updated_at = NOW() WHERE id = p_organization_id;

    -- 2. Update Legal Profile
    INSERT INTO public.organization_legal_profiles (organization_id, entity_type, tax_identifier_type, tax_identifier, tax_office, updated_by_user_id, source)
    VALUES (p_organization_id, p_entity_type, p_tax_identifier_type, p_tax_identifier, p_tax_office, v_user_id, 'flow')
    ON CONFLICT (organization_id) DO UPDATE SET 
        entity_type = EXCLUDED.entity_type,
        tax_identifier_type = EXCLUDED.tax_identifier_type,
        tax_identifier = EXCLUDED.tax_identifier,
        tax_office = EXCLUDED.tax_office,
        updated_by_user_id = EXCLUDED.updated_by_user_id,
        source = EXCLUDED.source,
        updated_at = NOW();

    -- 3. Update Address (just UPSERT the primary)
    DELETE FROM public.organization_addresses WHERE organization_id = p_organization_id;
    INSERT INTO public.organization_addresses (organization_id, city, district, address_line_1, is_primary)
    VALUES (p_organization_id, p_city, p_district, p_address_line_1, true);

    -- 4. Update Contacts (upsert primary phone and email)
    DELETE FROM public.organization_contacts WHERE organization_id = p_organization_id;
    IF p_phone IS NOT NULL AND p_phone != '' THEN
        INSERT INTO public.organization_contacts (organization_id, type, value, is_primary) VALUES (p_organization_id, 'phone', p_phone, true);
    END IF;
    IF p_email IS NOT NULL AND p_email != '' THEN
        INSERT INTO public.organization_contacts (organization_id, type, value, is_primary) VALUES (p_organization_id, 'email', p_email, true);
    END IF;

    -- 5. Audit Logging
    INSERT INTO public.organization_audit_events (organization_id, event_type, actor_user_id, source)
    VALUES (p_organization_id, 'organization.profile_updated', v_user_id, 'flow');

    RETURN jsonb_build_object('success', true, 'message', 'İşletme bilgileri başarıyla güncellendi.');
END;
$$;

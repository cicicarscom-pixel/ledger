-- Phase 2 & 3: Ledger AI Settings and Audit Log

-- 1. Ledger AI Settings (Phase 2 Onboarding)
CREATE TABLE IF NOT EXISTS public.ledger_ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
    
    bot_name TEXT DEFAULT 'Ledger AI',
    country_code TEXT DEFAULT 'TR',
    
    -- Structure of the extracted data
    extraction_schema JSONB DEFAULT '{}'::jsonb,
    
    -- Business rules for extraction
    instruction_rules JSONB DEFAULT '{}'::jsonb,
    
    -- AI Context
    system_prompt TEXT,
    
    schema_version INT DEFAULT 1,
    is_locked BOOLEAN DEFAULT false,
    
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(firm_id)
);

ALTER TABLE public.ledger_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firms can manage their AI settings" 
ON public.ledger_ai_settings FOR ALL 
USING (firm_id IN (SELECT accounting_firm_id FROM public.accounting_firm_members WHERE user_id = auth.uid()));


-- 2. Document Events (Phase 3 Audit Log)
CREATE TABLE IF NOT EXISTS public.document_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.finance_documents(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL, -- e.g., 'extracted', 'modified', 'approved', 'exported'
    actor_type TEXT NOT NULL CHECK (actor_type IN ('ai', 'accountant', 'taxpayer', 'system')),
    actor_id UUID, -- Can be null if actor is 'ai' or 'system', otherwise maps to auth.users
    
    old_value JSONB,
    new_value JSONB,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.document_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events of their org documents" 
ON public.document_events FOR SELECT 
USING (
    document_id IN (
        SELECT id FROM public.finance_documents WHERE organization_id IN (
            SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Firms can view events of their clients documents" 
ON public.document_events FOR SELECT 
USING (
    document_id IN (
        SELECT fd.id FROM public.finance_documents fd
        JOIN public.accountant_taxpayer_links atl ON fd.organization_id = atl.taxpayer_organization_id
        WHERE atl.status = 'active' AND atl.accounting_firm_id IN (
            SELECT accounting_firm_id FROM public.accounting_firm_members WHERE user_id = auth.uid()
        )
    )
);

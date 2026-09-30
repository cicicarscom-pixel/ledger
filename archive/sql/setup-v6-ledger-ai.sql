-- Migration V6: Ledger AI Operations Engine

-- 1. Documents Table
CREATE TABLE IF NOT EXISTS public.accounting_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accounting_firm_id UUID NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
    taxpayer_organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    uploaded_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    
    storage_bucket TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    checksum TEXT,
    
    document_type TEXT NOT NULL CHECK (document_type IN ('receipt', 'invoice', 'other')),
    processing_status TEXT NOT NULL DEFAULT 'uploaded' CHECK (processing_status IN ('uploaded', 'processing', 'completed', 'failed')),
    review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'in_review', 'approved', 'rejected')),
    source TEXT NOT NULL,
    
    issue_date DATE,
    vendor_name TEXT,
    vendor_tax_identifier TEXT,
    currency TEXT DEFAULT 'TRY',
    net_amount NUMERIC(12, 2),
    tax_amount NUMERIC(12, 2),
    total_amount NUMERIC(12, 2),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. AI Processing Runs
CREATE TABLE IF NOT EXISTS public.document_processing_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.accounting_documents(id) ON DELETE CASCADE,
    model_provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    schema_version TEXT,
    
    raw_output JSONB,
    normalized_output JSONB,
    processing_errors JSONB,
    
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 3. Accounting Drafts
CREATE TABLE IF NOT EXISTS public.accounting_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.accounting_documents(id) ON DELETE CASCADE,
    taxpayer_organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    category_id TEXT, -- Logical category (e.g., 'fuel', 'meals')
    ledger_account_code TEXT, -- e.g., '770.01', '760.01'
    
    currency TEXT DEFAULT 'TRY',
    net_amount NUMERIC(12, 2),
    tax_amount NUMERIC(12, 2),
    gross_amount NUMERIC(12, 2),
    
    draft_status TEXT NOT NULL DEFAULT 'prepared' CHECK (draft_status IN ('prepared', 'reviewed', 'approved')),
    prepared_by_ai BOOLEAN DEFAULT true,
    reviewed_by_user_id UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Document Lines
CREATE TABLE IF NOT EXISTS public.accounting_document_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.accounting_documents(id) ON DELETE CASCADE,
    
    description TEXT,
    quantity NUMERIC(10, 2),
    unit_price NUMERIC(12, 2),
    tax_rate NUMERIC(5, 2),
    net_amount NUMERIC(12, 2),
    tax_amount NUMERIC(12, 2),
    total_amount NUMERIC(12, 2),
    
    suggested_account_code TEXT,
    approved_account_code TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AI Decision Events (Audit / Decision Log)
CREATE TABLE IF NOT EXISTS public.ai_decision_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accounting_firm_id UUID NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
    taxpayer_organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.accounting_documents(id) ON DELETE CASCADE,
    
    decision_type TEXT NOT NULL,
    explanation TEXT NOT NULL,
    rule_id UUID, -- References ledger_ai_rules
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. AI Rules Memory
CREATE TABLE IF NOT EXISTS public.ledger_ai_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_level TEXT NOT NULL CHECK (scope_level IN ('global_country_rule', 'accounting_firm_rule', 'taxpayer_rule', 'supplier_rule', 'taxpayer_supplier_rule', 'document_exception')),
    
    accounting_firm_id UUID REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
    taxpayer_organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    supplier_tax_identifier TEXT, -- To map to a specific supplier
    
    rule_type TEXT NOT NULL, -- e.g., 'account_code_mapping'
    condition_json JSONB NOT NULL,
    action_json JSONB NOT NULL,
    
    created_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. AI Communications (Tasks, Conversations, Messages)
CREATE TABLE IF NOT EXISTS public.accountant_ai_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accounting_firm_id UUID NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
    task_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    prompt_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.accountant_ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accounting_firm_id UUID NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
    taxpayer_organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.accounting_documents(id) ON DELETE SET NULL,
    task_id UUID REFERENCES public.accountant_ai_tasks(id) ON DELETE SET NULL,
    
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.accountant_ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.accountant_ai_conversations(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('ai', 'taxpayer', 'accountant')),
    sender_user_id UUID REFERENCES auth.users(id),
    
    message_text TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Enablement
ALTER TABLE public.accounting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_processing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_document_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_decision_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_ai_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountant_ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountant_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accountant_ai_messages ENABLE ROW LEVEL SECURITY;

-- Documents RLS
CREATE POLICY "Orgs can view their own documents" 
ON public.accounting_documents FOR SELECT 
USING (taxpayer_organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Firms can view documents of their taxpayers" 
ON public.accounting_documents FOR SELECT 
USING (accounting_firm_id IN (SELECT accounting_firm_id FROM public.accounting_firm_members WHERE user_id = auth.uid()));

CREATE POLICY "Orgs can insert documents" 
ON public.accounting_documents FOR INSERT 
WITH CHECK (taxpayer_organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Simplified Policies for Drafts & Lines (Viewable by both Org and Firm)
CREATE POLICY "Orgs and Firms can view drafts" 
ON public.accounting_drafts FOR SELECT 
USING (
    taxpayer_organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()) OR
    document_id IN (SELECT id FROM public.accounting_documents WHERE accounting_firm_id IN (SELECT accounting_firm_id FROM public.accounting_firm_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Firms can update drafts" 
ON public.accounting_drafts FOR UPDATE 
USING (document_id IN (SELECT id FROM public.accounting_documents WHERE accounting_firm_id IN (SELECT accounting_firm_id FROM public.accounting_firm_members WHERE user_id = auth.uid())));

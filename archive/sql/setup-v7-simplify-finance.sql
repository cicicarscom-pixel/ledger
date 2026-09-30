-- Phase 1: Simplify Finance Schema
-- Goal: Remove complex ERP tables, keep amount_minor and currency_code, separate document and payment statuses.

-- 1. Safely rename legacy tables if they exist
DO $$
BEGIN
    -- Check and rename payments
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        ALTER TABLE public.payments RENAME TO legacy_payments;
    END IF;

    -- Check and rename payment_allocations
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_allocations') THEN
        ALTER TABLE public.payment_allocations RENAME TO legacy_payment_allocations;
    END IF;

    -- Check and rename country_tax_schemas
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'country_tax_schemas') THEN
        ALTER TABLE public.country_tax_schemas RENAME TO legacy_country_tax_schemas;
    END IF;
END $$;


-- 2. Create the simplified finance documents table
CREATE TABLE IF NOT EXISTS public.finance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    counterparty_name TEXT, -- Supplier or Customer name
    
    amount_minor BIGINT NOT NULL DEFAULT 0, -- e.g. 10050 for 100.50
    currency_code TEXT NOT NULL DEFAULT 'TRY',
    
    tax_details JSONB, -- Embedded JSON for tax rates, amounts, country rules
    
    document_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (document_status IN ('draft', 'processing', 'ready_for_review', 'approved', 'rejected', 'archived')),
        
    payment_status TEXT NOT NULL DEFAULT 'unpaid'
        CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'not_applicable')),
        
    extraction_schema_version INT, -- Version of the schema used to process this document
    
    -- Future fields for export & archive
    export_batch_id TEXT,
    exported_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Enablement
ALTER TABLE public.finance_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents of their org" 
ON public.finance_documents FOR SELECT 
USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert documents to their org" 
ON public.finance_documents FOR INSERT 
WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update documents of their org" 
ON public.finance_documents FOR UPDATE 
USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

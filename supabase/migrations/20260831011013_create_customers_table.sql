CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, phone)
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org-scoped read for customers"
ON public.customers FOR SELECT TO authenticated
USING (organization_id = auth.uid());

CREATE POLICY "Org-scoped insert for customers"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Org-scoped update for customers"
ON public.customers FOR UPDATE TO authenticated
USING (organization_id = auth.uid())
WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Service role manages customers"
ON public.customers FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_customers_org_phone ON public.customers(organization_id, phone);

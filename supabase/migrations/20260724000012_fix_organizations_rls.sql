-- Fix the RLS policy for organizations for accountants

-- First, drop the old broken policy if it exists
DROP POLICY IF EXISTS "Accountants can view linked taxpayer orgs" ON public.organizations;

-- Create the correct policy using accounting_firm_id and accounting_firm_members
CREATE POLICY "Accountants can view linked taxpayer orgs"
ON public.organizations FOR SELECT
USING (
  id IN (
    SELECT taxpayer_organization_id
    FROM public.accountant_taxpayer_links
    WHERE accounting_firm_id IN (
        SELECT accounting_firm_id 
        FROM public.accounting_firm_members 
        WHERE user_id = auth.uid()
    )
  )
);

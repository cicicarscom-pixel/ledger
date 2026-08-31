
CREATE TABLE IF NOT EXISTS public.appointment_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.business_services(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_id, service_id)
);

ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org-scoped read for appointment_services"
ON public.appointment_services FOR SELECT TO authenticated
USING (organization_id = auth.uid());

CREATE POLICY "Org-scoped insert for appointment_services"
ON public.appointment_services FOR INSERT TO authenticated
WITH CHECK (organization_id = auth.uid());

CREATE POLICY "Org-scoped delete for appointment_services"
ON public.appointment_services FOR DELETE TO authenticated
USING (organization_id = auth.uid());

CREATE POLICY "Service role manages appointment_services"
ON public.appointment_services FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment ON public.appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_org ON public.appointment_services(organization_id);

INSERT INTO public.appointment_services (appointment_id, organization_id, service_id)
SELECT id, organization_id, service_id::uuid
FROM public.appointments
WHERE service_id IS NOT NULL
ON CONFLICT (appointment_id, service_id) DO NOTHING;


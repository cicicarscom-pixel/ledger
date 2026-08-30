CREATE TABLE IF NOT EXISTS public.business_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'TL',
    unit TEXT NOT NULL DEFAULT 'seans',
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    description TEXT,
    color TEXT,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.business_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own services" 
ON public.business_services FOR SELECT 
USING (auth.uid() = merchant_id);

CREATE POLICY "Users can insert their own services" 
ON public.business_services FOR INSERT 
WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Users can update their own services" 
ON public.business_services FOR UPDATE 
USING (auth.uid() = merchant_id) 
WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Users can delete their own services" 
ON public.business_services FOR DELETE 
USING (auth.uid() = merchant_id);

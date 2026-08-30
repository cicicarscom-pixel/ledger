ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

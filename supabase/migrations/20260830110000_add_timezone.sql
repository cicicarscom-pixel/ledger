ALTER TABLE public.organization_ai_settings ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul';

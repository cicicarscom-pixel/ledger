ALTER TABLE organization_ai_settings ADD COLUMN IF NOT EXISTS appointment_module_enabled BOOLEAN NOT NULL DEFAULT true;


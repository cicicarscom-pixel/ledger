-- The `integration` schema (zernio_profiles, social_accounts) was created with RLS
-- policies already in place, but the base schema/table GRANTs needed for PostgREST
-- (service_role for edge functions, authenticated for client-side reads) were never
-- issued. Without these, every direct `.schema('integration').from(...)` call fails
-- with "permission denied for schema integration" (42501), regardless of RLS.
GRANT USAGE ON SCHEMA integration TO service_role, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA integration TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA integration TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA integration
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA integration
  GRANT SELECT ON TABLES TO authenticated;

-- Sequences (if any) in the schema also need usage for service_role to insert.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA integration TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA integration
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;

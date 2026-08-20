-- ==============================================================================
-- PHASE 1: AI, AUDIT & ANALYTICS SCHEMA MIGRATION
-- ==============================================================================

-- 1. Create Target Schemas
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS ai;

-- 2. Move Audit Tables
ALTER TABLE IF EXISTS public.api_usage_logs SET SCHEMA audit;
ALTER TABLE IF EXISTS public.ai_audit_logs SET SCHEMA audit;
ALTER TABLE IF EXISTS public.organization_audit_events SET SCHEMA audit;

-- 3. Move Analytics Tables
ALTER TABLE IF EXISTS public.analytics_cache SET SCHEMA analytics;

-- 4. Move AI Tables
ALTER TABLE IF EXISTS public.extraction_schemas SET SCHEMA ai;
ALTER TABLE IF EXISTS public.ai_decision_events SET SCHEMA ai;
ALTER TABLE IF EXISTS public.ledger_ai_rules SET SCHEMA ai;
ALTER TABLE IF EXISTS public.ledger_ai_settings SET SCHEMA ai;
ALTER TABLE IF EXISTS public.accountant_ai_tasks SET SCHEMA ai;
ALTER TABLE IF EXISTS public.accountant_ai_conversations SET SCHEMA ai;
ALTER TABLE IF EXISTS public.accountant_ai_messages SET SCHEMA ai;

-- NOTE: core, finance, flow, and communication schemas are untouched in this phase.

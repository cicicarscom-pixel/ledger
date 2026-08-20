-- ==============================================================================
-- CLEANUP MIGRATION: Drop Deprecated V1 Architecture Tables
-- Date: 2026-08-20
-- Description: Dropping tables that have been superseded by the new
--              Domain-Driven Design (DDD) V2 schema structure.
-- ==============================================================================

-- 1. Deprecated taxpayers structure (Superseded by core.organizations & core.organization_legal_profiles)
DROP TABLE IF EXISTS public.taxpayers CASCADE;

-- 2. Deprecated invoices & schemas (Superseded by finance.finance_documents & ai.extraction_schemas)
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.invoice_schemas CASCADE;

-- 3. Deprecated flat chat history (Superseded by ai.accountant_ai_conversations & messages)
DROP TABLE IF EXISTS public.ledger_chat_history CASCADE;

-- Note: We use CASCADE to cleanly wipe out any lingering foreign keys that depended on these legacy tables.

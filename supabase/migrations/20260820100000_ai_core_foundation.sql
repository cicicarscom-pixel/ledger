-- ==============================================================================
-- WORKIGOM AI CORE FOUNDATION
-- Migration: Create AI schema and audit logging tables
-- ==============================================================================

-- 1. Create the dedicated 'ai' schema for Domain-Driven Design separation
CREATE SCHEMA IF NOT EXISTS ai;

-- 2. Create the AI Audit Logs table for security, billing, and debugging
CREATE TABLE IF NOT EXISTS ai.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant & Identity (References public schema)
    firm_id UUID NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Conversation Context
    conversation_id UUID, -- Optional reference to ledger_chat_history or accountant_ai_conversations
    
    -- Execution Details
    intent VARCHAR(100),
    tool_name VARCHAR(100) NOT NULL,
    risk_level VARCHAR(20) CHECK (risk_level IN ('read', 'write', 'external_action')),
    
    -- Data Payloads
    input_payload JSONB,
    output_payload JSONB,
    
    -- Status & Metrics
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    execution_ms INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes for fast querying by tenant and tool
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_firm_id ON ai.audit_logs(firm_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_user_id ON ai.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_tool_name ON ai.audit_logs(tool_name);
CREATE INDEX IF NOT EXISTS idx_ai_audit_logs_created_at ON ai.audit_logs(created_at DESC);

-- 4. Row Level Security (RLS)
ALTER TABLE ai.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Firm members can read their own firm's audit logs
CREATE POLICY "Firm members can view firm AI audit logs"
    ON ai.audit_logs
    FOR SELECT
    USING (
        firm_id IN (
            SELECT accounting_firm_id 
            FROM public.accounting_firm_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Service roles / Edge Functions can insert audit logs
-- (Users should NOT insert audit logs directly from the client side)
CREATE POLICY "Service roles can insert AI audit logs"
    ON ai.audit_logs
    FOR INSERT
    WITH CHECK (true); -- Usually restricted by Postgres role (authenticated/service_role) in production

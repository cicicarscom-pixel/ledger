-- 20260819_ai_audit_logs.sql (setup-v9-ai-audit.sql)
CREATE TABLE IF NOT EXISTS ai_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL,
    user_id UUID NOT NULL,
    conversation_id UUID,
    
    intent VARCHAR(255),
    tool_name VARCHAR(255),
    tool_risk VARCHAR(50),
    
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    
    input_json JSONB,
    output_json JSONB,
    
    status VARCHAR(50) NOT NULL,
    error_code VARCHAR(100),
    error_message TEXT,
    
    latency_ms INT,
    model VARCHAR(255),
    model_latency_ms INT,
    tool_latency_ms INT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexler
CREATE INDEX IF NOT EXISTS idx_ai_audit_firm_id ON ai_audit_logs(firm_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_status ON ai_audit_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_audit_created_at ON ai_audit_logs(created_at);

-- RLS
ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Örnek RLS policy: Sadece ilgili firmadaki yetkililer okuyabilir
-- CREATE POLICY "Firm members can view audit logs" ON ai_audit_logs
--   FOR SELECT USING (firm_id IN (
--     SELECT organization_id FROM accounting_firm_members WHERE user_id = auth.uid()
--   ));

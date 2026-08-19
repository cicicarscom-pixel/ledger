export interface AuditLogEntry {
  firmId: string;
  userId: string;
  conversationId?: string;
  intent?: string;
  toolName?: string;
  toolRisk?: string;
  entityType?: string;
  entityId?: string;
  inputJson?: any;
  outputJson?: any;
  status: 'success' | 'failed' | 'denied';
  errorCode?: string;
  errorMessage?: string;
  latencyMs?: number;
}

export class AuditService {
  async log(entry: AuditLogEntry): Promise<void> {
    // TODO: Insert into ai_audit_logs table via Supabase
    console.log('[AUDIT LOG]', entry);
  }
}

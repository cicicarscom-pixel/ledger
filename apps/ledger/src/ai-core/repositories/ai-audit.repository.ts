import { createClient } from '@supabase/supabase-js';
import { ToolContext } from '../shared/types';

/**
 * Repository for interacting with the audit.ai_audit_logs table.
 * Demonstrates safe cross-schema operations hiding Supabase logic from Tools.
 */
export class AiAuditRepository {
  private supabase;

  constructor() {
    // Note: In Next.js App Router, this would typically be injected or use a server client instance
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        db: {
          schema: 'audit' // Target the new DDD schema explicitly
        }
      }
    );
  }

  /**
   * Logs a tool execution event to the database.
   */
  public async logToolExecution(
    context: ToolContext,
    toolName: string,
    riskLevel: string,
    payload: any,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Because we specified schema: 'audit' in the client initialization, 
      // this automatically targets audit.ai_audit_logs
      const { error } = await this.supabase
        .from('ai_audit_logs')
        .insert({
          firm_id: context.firmId,
          user_id: context.userId,
          conversation_id: context.conversationId,
          tool_name: toolName,
          risk_level: riskLevel,
          input_payload: payload,
          success: success,
          error_message: errorMessage || null
        });

      if (error) {
        console.error('Failed to log AI execution to audit schema:', error);
      }
    } catch (e) {
      console.error('Unexpected error inserting audit log:', e);
    }
  }
}

export const aiAuditRepository = new AiAuditRepository();

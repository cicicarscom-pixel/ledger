import { WorkigomTool } from '../registry';
import { ToolContext, ToolResult } from '../../shared/types';
import { taxpayerResolver } from '../../entities/taxpayer-resolver';
import { policyEngine } from '../../policy/policy-engine';
import { aiAuditRepository } from '../../repositories/ai-audit.repository';
import { createClient } from '@supabase/supabase-js';

export interface SendNotificationInput { entityQuery: string; message: string; }

export const sendNotificationTool: WorkigomTool<SendNotificationInput, { success: boolean, timestamp: string, deliveredTo?: number }> = {
  name: 'send_notification',
  description: 'Sends a notification or message to a specific taxpayer.',
  risk: 'external_action',
  schema: { type: 'object', properties: { entityQuery: { type: 'string' }, message: { type: 'string' } }, required: ['entityQuery', 'message'] },

  async execute(context: ToolContext, input: SendNotificationInput): Promise<ToolResult<{ success: boolean, timestamp: string, deliveredTo?: number }>> {
    let executionSuccess = false;
    let errorMessage: string | undefined = undefined;
    let deliveredCount = 0;

    try {
      const candidates = await taxpayerResolver.resolve(input.entityQuery, context.firmId);
      if (candidates.length === 0 || candidates[0].confidence < 0.85) {
        errorMessage = 'Taxpayer ' + input.entityQuery + ' could not be resolved.';
        return { success: false, error: errorMessage };
      }
      
      const targetTaxpayer = candidates[0].taxpayer;
      if (!policyEngine.canExecute(this.risk, context)) {
        errorMessage = 'Execution blocked by Policy Engine.';
        return { success: false, error: errorMessage };
      }

      console.log('[NOTIFICATION DISPATCH] Resolving users for organization: ' + targetTaxpayer.name);
      
      // Initialize Supabase Client (Service Role needed to insert notifications across RLS)
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        { db: { schema: 'public' } }
      );

      // 1. Get the users (owners/members) of this taxpayer organization
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', targetTaxpayer.id);

      if (membersError || !members || members.length === 0) {
         throw new Error('No user accounts attached to this taxpayer organization.');
      }

      // 2. Insert actual notifications for each member
      const notifications = members.map(m => ({
        profile_id: m.user_id,
        title: 'Muhasebecinizden Mesaj',
        message: input.message,
        type: 'ai_message',
        is_read: false
      }));

      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) {
         throw insertError;
      }

      deliveredCount = notifications.length;
      console.log('[NOTIFICATION DISPATCH] Successfully sent ' + deliveredCount + ' notifications to ' + targetTaxpayer.name);
      executionSuccess = true;
      
      return { 
        success: true, 
        data: { success: true, timestamp: new Date().toISOString(), deliveredTo: deliveredCount } 
      };

    } catch (error: any) {
      errorMessage = error.message;
      return { success: false, error: 'Notification failed: ' + errorMessage };
    } finally {
      await aiAuditRepository.logToolExecution(context, this.name, this.risk, input, executionSuccess, errorMessage);
    }
  }
};

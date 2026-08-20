import { WorkigomTool } from '../registry';
import { ToolContext, ToolResult } from '../../shared/types';
import { taxpayerResolver } from '../../entities/taxpayer-resolver';
import { policyEngine } from '../../policy/policy-engine';
import { aiAuditRepository } from '../../repositories/ai-audit.repository';

export interface SendNotificationInput { entityQuery: string; message: string; }

export const sendNotificationTool: WorkigomTool<SendNotificationInput, { success: boolean, timestamp: string }> = {
  name: 'send_notification',
  description: 'Sends a notification or message to a specific taxpayer.',
  risk: 'external_action',
  schema: { type: 'object', properties: { entityQuery: { type: 'string' }, message: { type: 'string' } }, required: ['entityQuery', 'message'] },

  async execute(context: ToolContext, input: SendNotificationInput): Promise<ToolResult<{ success: boolean, timestamp: string }>> {
    let executionSuccess = false;
    let errorMessage: string | undefined = undefined;
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

      console.log('[NOTIFICATION DISPATCH] Sending to ' + targetTaxpayer.name + ': ' + input.message);
      executionSuccess = true;
      return { success: true, data: { success: true, timestamp: new Date().toISOString() } };
    } catch (error: any) {
      errorMessage = error.message;
      return { success: false, error: 'Notification failed: ' + errorMessage };
    } finally {
      await aiAuditRepository.logToolExecution(context, this.name, this.risk, input, executionSuccess, errorMessage);
    }
  }
};


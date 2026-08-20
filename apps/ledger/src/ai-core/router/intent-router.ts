import { IntentResultSchema, IntentResult } from './intent.schemas';
import { toolRegistry } from '../tools/registry';
import { ToolContext, ToolResult } from '../shared/types';

const IntentToToolMap: Record<string, string> = {
  'COUNT_TAXPAYERS': 'count_taxpayers',
  'GET_TAXPAYER_BALANCE': 'get_taxpayer_balance',
  'SEND_NOTIFICATION': 'send_notification'
};

export class RouterService {
  public async routeMessage(userMessage: string, context: ToolContext): Promise<ToolResult<any>> {
    try {
      const mockLlmResponse: IntentResult = this.mockLlmIntentParsing(userMessage);
      const parsed = IntentResultSchema.parse(mockLlmResponse);

      const toolName = IntentToToolMap[parsed.intent];

      if (parsed.intent !== 'UNKNOWN' && parsed.confidence > 0.80 && parsed.risk === 'read') {
        if (toolName) {
          const toolInput = parsed.entityQuery ? { entityQuery: parsed.entityQuery } : undefined;
          return await toolRegistry.executeTool(toolName, context, toolInput);
        }
      }

      if (parsed.intent !== 'UNKNOWN' && parsed.risk === 'external_action') {
         console.log('\n[ORCHESTRATOR] Fast path bypassed for risk=' + parsed.risk + '. Simulating Agent Orchestration calling ' + toolName + '...');
         const toolInput = parsed.intent === 'SEND_NOTIFICATION' 
            ? { entityQuery: parsed.entityQuery, message: 'Muhasebe borcunuzu hatirlatiriz.' }
            : {};
            
         return await toolRegistry.executeTool(toolName, context, toolInput);
      }

      return {
        success: false,
        error: 'Fast Path failed. Intent ' + parsed.intent + ' could not be routed. Requires Agent Orchestration.'
      };

    } catch (error: any) {
      return { success: false, error: 'Router encountered an error: ' + error.message };
    }
  }

  private mockLlmIntentParsing(message: string): IntentResult {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('kac mukellef') || lowerMessage.includes('kac kisi')) {
      return { intent: 'COUNT_TAXPAYERS', risk: 'read', confidence: 0.95 };
    }
    
    if (lowerMessage.includes('hatirlat') || lowerMessage.includes('mesaj')) {
      const entity = lowerMessage.replace('muhasebe borcunu hatirlat', '').replace('a', '').replace("'", "").trim();
      return { intent: 'SEND_NOTIFICATION', risk: 'external_action', entityQuery: entity, confidence: 0.90 };
    }

    if (lowerMessage.includes('bakiye') || lowerMessage.includes('borcu ne')) {
      const entity = lowerMessage.replace('in borcu ne', '').replace('larin borcu ne', '').trim();
      return { intent: 'GET_TAXPAYER_BALANCE', risk: 'read', entityQuery: entity, confidence: 0.90 };
    }

    return { intent: 'UNKNOWN', risk: 'read', confidence: 0.50 };
  }
}

export const routerService = new RouterService();

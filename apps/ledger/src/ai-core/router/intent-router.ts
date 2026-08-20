import { IntentResultSchema } from './intent.schemas';
import { toolRegistry } from '../tools/registry';
import { ToolContext, ToolResult } from '../shared/types';
import { geminiProvider } from '../providers/gemini-provider';

const IntentToToolMap: Record<string, string> = {
  'COUNT_TAXPAYERS': 'count_taxpayers',
  'GET_TAXPAYER_BALANCE': 'get_taxpayer_balance',
  'SEND_NOTIFICATION': 'send_notification'
};

export class RouterService {
  public async routeMessage(userMessage: string, context: ToolContext): Promise<ToolResult<any>> {
    try {
      // 1. REAL LLM PARSING (Gemini)
      const llmResponse = await geminiProvider.classifyIntent(userMessage);
      
      // Zod strict validation of the AI output
      const parsed = IntentResultSchema.parse(llmResponse);

      const toolName = IntentToToolMap[parsed.intent];

      // 2. Fast Path Evaluation
      if (parsed.intent !== 'UNKNOWN' && parsed.confidence > 0.80 && parsed.risk === 'read') {
        if (toolName) {
          const toolInput = parsed.entityQuery ? { entityQuery: parsed.entityQuery } : undefined;
          return await toolRegistry.executeTool(toolName, context, toolInput);
        }
      }

      // 3. Simulated Orchestration Fallback
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
}

export const routerService = new RouterService();

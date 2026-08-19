import { AIProvider } from '../providers/ai-provider';
import { ToolRegistry } from '../tools/registry';
import { TaxpayerResolver } from '../entities/taxpayer-resolver';
import { ToolContext } from '../tools/tool.types';

export class AIRouter {
  constructor(
    private aiProvider: AIProvider,
    private toolRegistry: ToolRegistry,
    private taxpayerResolver: TaxpayerResolver
  ) {}

  async processMessage(userMessage: string, context: ToolContext) {
    const classification = await this.aiProvider.classifyIntent(userMessage, context);

    if (classification.confidence < 0.70) {
      return { 
        status: 'clarification_needed', 
        message: 'Tam olarak ne demek istediğinizi anlayamadım. (Confidence < 0.70)' 
      };
    }

    let resolvedTaxpayerId = context.activeTaxpayerId;
    if (classification.entityQuery) {
      const resolution = await this.taxpayerResolver.resolve(classification.entityQuery, context);
      
      if (resolution.taxpayer && resolution.confidence >= 0.85) {
        resolvedTaxpayerId = resolution.taxpayer.id;
      } else {
        return { 
          status: 'ambiguous_entity', 
          message: '"' + classification.entityQuery + '" icin tam eslesme bulamadim. Hangisini kastediyorsunuz?' 
        };
      }
    }

    const toolName = this.mapIntentToTool(classification.intent);
    if (!toolName) {
      return { status: 'unsupported', message: 'Bu islemi henuz desteklemiyorum.' };
    }

    const tool = this.toolRegistry.getTool(toolName);
    if (!tool) {
      return { status: 'error', message: 'Tool bulunamadi: ' + toolName };
    }

    if (tool.risk === 'read') {
      const toolInput = this.buildToolInput(toolName, resolvedTaxpayerId);
      const result = await tool.execute(context, toolInput);
      
      return {
        status: 'fast_path_success',
        intent: classification.intent,
        tool: toolName,
        data: result.data
      };
    } else {
      return { 
        status: 'action_required', 
        intent: classification.intent, 
        tool: toolName, 
        resolvedTaxpayerId 
      };
    }
  }

  private mapIntentToTool(intent: string): string | null {
    switch (intent) {
      case 'COUNT_TAXPAYERS': return 'count_taxpayers';
      case 'GET_TAXPAYER_BALANCE': return 'get_taxpayer_balance';
      case 'GET_TAXPAYER_INVOICES': return 'get_taxpayer_invoices';
      case 'SEND_NOTIFICATION': return 'send_notification';
      default: return null;
    }
  }

  private buildToolInput(toolName: string, taxpayerId?: string): any {
    if (toolName === 'get_taxpayer_balance' || toolName === 'get_taxpayer_invoices') {
      return { taxpayerId };
    }
    return {};
  }
}

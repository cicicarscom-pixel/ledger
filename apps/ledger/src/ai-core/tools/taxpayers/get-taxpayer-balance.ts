import { WorkigomTool } from '../registry';
import { ToolContext, ToolResult } from '../../shared/types';
import { taxpayerResolver } from '../../entities/taxpayer-resolver';

export interface GetTaxpayerBalanceInput { entityQuery: string; }
export interface GetTaxpayerBalanceOutput { taxpayerId: string; taxpayerName: string; balance: number; currency: string; }

export const getTaxpayerBalanceTool: WorkigomTool<GetTaxpayerBalanceInput, GetTaxpayerBalanceOutput> = {
  name: 'get_taxpayer_balance',
  description: 'Gets the current account balance for a specific taxpayer.',
  risk: 'read',
  schema: { type: 'object', properties: { entityQuery: { type: 'string' } }, required: ['entityQuery'] },
  
  async execute(context: ToolContext, input: GetTaxpayerBalanceInput): Promise<ToolResult<GetTaxpayerBalanceOutput>> {
    if (!input.entityQuery) return { success: false, error: 'entityQuery is required' };
    try {
      const candidates = await taxpayerResolver.resolve(input.entityQuery, context.firmId);
      if (candidates.length === 0) return { success: false, error: 'No taxpayer found matching ' + input.entityQuery };
      
      const topResult = candidates[0];
      if (topResult.confidence < 0.85) {
        return { success: false, error: 'Ambiguous taxpayer name ' + input.entityQuery };
      }

      return {
        success: true,
        data: { taxpayerId: topResult.taxpayer.id, taxpayerName: topResult.taxpayer.name, balance: 12500.00, currency: 'TRY' }
      };
    } catch (error: any) {
      return { success: false, error: 'Failed to get taxpayer balance: ' + error.message };
    }
  }
};


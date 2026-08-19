import { WorkigomTool, ToolContext, ToolResult } from '../tool.types';
import { financeService } from '../../services/business-services';

export interface GetBalanceInput {
  taxpayerId: string;
}

export const getTaxpayerBalanceTool: WorkigomTool<GetBalanceInput, { balance: number, currency: string }> = {
  name: 'get_taxpayer_balance',
  description: 'Belirli bir mükellefin güncel muhasebe borcunu/bakiyesini getirir.',
  risk: 'read',
  inputSchema: { type: 'object', properties: { taxpayerId: { type: 'string' } }, required: ['taxpayerId'] },
  
  async execute(context: ToolContext, input: GetBalanceInput): Promise<ToolResult<{ balance: number, currency: string }>> {
    try {
      // Authorization is inherently handled in Business Layer by passing firmId
      const balance = await financeService.getTaxpayerBalance(context.firmId, input.taxpayerId);
      return {
        success: true,
        data: { balance, currency: 'TL' }
      };
    } catch (err: any) {
      return { success: false, error: { code: 'BALANCE_ERROR', message: err.message } };
    }
  }
};

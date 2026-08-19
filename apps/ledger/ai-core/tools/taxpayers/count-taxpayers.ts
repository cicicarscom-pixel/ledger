import { WorkigomTool, ToolContext, ToolResult } from '../tool.types';
import { financeService } from '../../services/business-services';

export const countTaxpayersTool: WorkigomTool<void, { count: number }> = {
  name: 'count_taxpayers',
  description: 'Müşavire ait aktif mükellef sayısını getirir.',
  risk: 'read',
  inputSchema: null,
  
  async execute(context: ToolContext, input: void): Promise<ToolResult<{ count: number }>> {
    try {
      const count = await financeService.countTaxpayers(context.firmId);
      return {
        success: true,
        data: { count }
      };
    } catch (err: any) {
      return { success: false, error: { code: 'DB_ERROR', message: err.message } };
    }
  }
};

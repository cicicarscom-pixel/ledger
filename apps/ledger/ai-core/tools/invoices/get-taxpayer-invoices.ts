import { WorkigomTool, ToolContext, ToolResult } from '../tool.types';
import { invoiceService } from '../../services/business-services';

export interface GetInvoicesInput {
  taxpayerId: string;
  period?: { from: string; to: string };
}

export const getTaxpayerInvoicesTool: WorkigomTool<GetInvoicesInput, { invoices: any[] }> = {
  name: 'get_taxpayer_invoices',
  description: 'Belirli bir mükellefin belirli bir dönemdeki faturalarını listeler.',
  risk: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      taxpayerId: { type: 'string' },
      period: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } } }
    },
    required: ['taxpayerId']
  },
  
  async execute(context: ToolContext, input: GetInvoicesInput): Promise<ToolResult<{ invoices: any[] }>> {
    try {
      const invoices = await invoiceService.getInvoices(context.firmId, input.taxpayerId, input.period);
      return {
        success: true,
        data: { invoices }
      };
    } catch (err: any) {
      return { success: false, error: { code: 'INVOICES_ERROR', message: err.message } };
    }
  }
};

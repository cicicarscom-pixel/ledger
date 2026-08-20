import { WorkigomTool } from '../registry';
import { ToolContext, ToolResult } from '../../shared/types';
import { taxpayerRepository } from '../../repositories/taxpayer.repository';

export const countTaxpayersTool: WorkigomTool<void, { count: number }> = {
  name: 'count_taxpayers',
  description: 'Returns the total number of taxpayers/clients currently connected to the accounting firm.',
  risk: 'read',
  
  async execute(context: ToolContext, _input: void): Promise<ToolResult<{ count: number }>> {
    try {
      const taxpayers = await taxpayerRepository.getTaxpayersByFirmId(context.firmId);
      return { success: true, data: { count: taxpayers.length } };
    } catch (error: any) {
      return { success: false, error: 'Failed to count taxpayers: ' + error.message };
    }
  }
};

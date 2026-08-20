import { ToolContext, ToolResult, ToolRisk } from '../shared/types';

export interface WorkigomTool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  risk: ToolRisk;
  schema?: any; 
  execute(context: ToolContext, input: TInput): Promise<ToolResult<TOutput>>;
}

export class ToolRegistry {
  private tools: Map<string, WorkigomTool> = new Map();

  public register(tool: WorkigomTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error('Tool ' + tool.name + ' is already registered.');
    }
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): WorkigomTool | undefined {
    return this.tools.get(name);
  }

  public async executeTool(name: string, context: ToolContext, input: any): Promise<ToolResult<any>> {
    const tool = this.getTool(name);
    if (!tool) return { success: false, error: 'Tool ' + name + ' not found.' };
    if (!context || !context.userId || !context.firmId) return { success: false, error: 'Missing context' };
    
    try {
      return await tool.execute(context, input);
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
export const toolRegistry = new ToolRegistry();

import { countTaxpayersTool } from './taxpayers/count-taxpayers';
import { getTaxpayerBalanceTool } from './taxpayers/get-taxpayer-balance';
import { sendNotificationTool } from './notifications/send-notification';

toolRegistry.register(countTaxpayersTool);
toolRegistry.register(getTaxpayerBalanceTool);
toolRegistry.register(sendNotificationTool);

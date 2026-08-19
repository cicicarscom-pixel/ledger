export type ToolRisk = 'read' | 'write' | 'external_action';

export interface ToolContext {
  userId: string;
  firmId: string;
  role: string;
  conversationId?: string;
  activeTaxpayerId?: string;
}

export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface WorkigomTool<TInput, TOutput> {
  name: string;
  description: string;
  risk: ToolRisk;
  inputSchema: any;
  execute(
    context: ToolContext,
    input: TInput
  ): Promise<ToolResult<TOutput>>;
}

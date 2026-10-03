import type { AIContext } from '../types.ts';

export interface ToolResult {
  status: string;
  message?: string;
  data?: unknown;
}

export interface ITool {
  readonly name: string;
  readonly description: string;
  readonly schema: Record<string, unknown>;

  execute(
    context: AIContext,
    args: Record<string, unknown>,
  ): Promise<ToolResult>;
}

export type ToolRiskLevel =
  | 'READ'

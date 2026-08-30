import { AIContext } from '../types.ts';

export interface ToolResult {
  status: "SUCCESS" | "SLOT_ALREADY_TAKEN" | "SERVICE_NOT_FOUND" | "INVALID_DATE" | "CUSTOMER_REQUIRED" | "CUSTOMER_NAME_REQUIRED" | "ERROR" | "NOT_FOUND" | "DB_ERROR";
  data?: any;
  message?: string;
}

export interface ITool {
  name: string;
  description: string;
  schema: Record<string, unknown>; // JSON Schema format for Gemini
  execute(context: AIContext, args: Record<string, unknown>): Promise<ToolResult>;
}

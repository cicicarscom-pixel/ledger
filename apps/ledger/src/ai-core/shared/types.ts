/**
 * Core Types for WORKIGOM AI CORE
 */

export type ToolRisk = "read" | "write" | "external_action";

export interface ToolContext {
  userId: string;
  firmId: string;
  role: string;
  conversationId: string;
}

export type ToolResult<T> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string };

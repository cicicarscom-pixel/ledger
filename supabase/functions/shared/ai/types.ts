export interface ToolCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

export type GeminiTurnResult =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "tool_calls";
      calls: ToolCall[];
    };

export interface ChannelContext {
  source: string;
  platform: string;
  supportsInteractiveButtons: boolean;
  maxSuggestedResponseLength?: string;
}

export interface AIContext {
  organizationId: string;
  customerId?: string;
  merchantId?: string;
  now: Date;
  timezone: string;
  botSettings: Record<string, any>;
  channel: ChannelContext;
}

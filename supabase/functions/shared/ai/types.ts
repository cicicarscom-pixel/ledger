import type { ExecutionMode, PersonaRenderConfig } from './persona/PersonaTypes.ts';

export type AIChannelSource = 'whatsapp' | 'social';

export interface AIChannelContext {
  source: AIChannelSource;
  platform: string;
  supportsInteractiveButtons: boolean;
  maxSuggestedResponseLength?: string;
}

export interface AICustomerProfile {
  isReturning: boolean;
  name?: string | null;
  pastAppointments?: unknown[];
}

export interface AIActiveAppointment {
  id: string;
  date: string;
  service_id?: string | null;
  status: string;
}

export interface AIContext {
  organizationId: string;
  merchantId?: string;
  customerId: string;
  now: Date;
  timezone: string;
  botSettings?: Record<string, unknown> & {
    system_prompt?: string | null;
  };
  personaConfig?: PersonaRenderConfig | null;
  customerProfile?: AICustomerProfile | null;
  appointmentModuleEnabled?: boolean;
  multiCalendarEnabled?: boolean;
  activeAppointments?: AIActiveAppointment[];
  executionMode?: ExecutionMode;
  channel: AIChannelContext;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export type GeminiTurnResult =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'tool_calls';
      calls: ToolCall[];
    };

export interface AITextPart {
  text: string;
}

export interface AIFunctionCallPart {
  functionCall: {
    name: string;
    args: Record<string, unknown>;
  };
}

export interface AIFunctionResponsePart {
  functionResponse: {
    name: string;
    response: {
      result: unknown;
    };
  };

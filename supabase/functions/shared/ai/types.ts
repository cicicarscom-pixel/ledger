import { ExecutionMode, PersonaRenderConfig } from "./persona/PersonaTypes.ts";

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

// Persona Engine (Phase 3): a resolved, ready-to-render persona config, or
// null/undefined when there is none (no organization_ai_settings row yet,
// persona_id is null == "Standart", or the persona failed the publish gate
// in production mode — see PersonaService.resolveFromRows). PromptBuilder's
// own fallback chain (guardrail #6) decides what happens when this is empty
// — nothing upstream of PromptBuilder needs to know about that fallback.
export interface AIContext {
  organizationId: string;
  customerId?: string;
  merchantId?: string;
  now: Date;
  timezone: string;
  botSettings: Record<string, any>;
  channel: ChannelContext;
  personaConfig?: PersonaRenderConfig | null;
  customerProfile?: {
    name: string | null;
    isReturning: boolean;
    pastAppointments: Array<{
      service_id: string;
      date: string;
      status: string;
    }>;
  };
  appointmentModuleEnabled?: boolean; // false = randevu/rezervasyon tamamen kapalı. undefined = true gibi davranır.
  activeAppointments?: Array<{ id: string; service_id: string; date: string; status: string }>; // müşterinin var olan aktif randevuları — sadece update_appointment için
  // Phase 4: "production" (default, real customer messages) or "simulation"
  // (persona-test / Live Test). Write tools (e.g. CreatePendingAppointmentTool)
  // MUST check this and never create real side effects in simulation mode —
  // see AppointmentService.createPendingAppointment(). Undefined behaves as
  // "production" everywhere this is checked, so existing call sites that
  // don't set it (there are none left — HandleIncomingMessageUseCase sets it
  // explicitly) are unaffected.
  executionMode?: ExecutionMode;
}

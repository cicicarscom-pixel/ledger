import { z } from 'zod';

/**
 * Zod schema defining the strict structured output expected from the LLM
 * during the Fast Path intent classification phase.
 */
export const IntentResultSchema = z.object({
  /** The specific business intent derived from the user's message */
  intent: z.enum(['COUNT_TAXPAYERS', 'GET_TAXPAYER_BALANCE', 'SEND_NOTIFICATION', 'UNKNOWN']),
  
  /** The identified risk level associated with this intent */
  risk: z.enum(['read', 'write', 'external_action']),
  
  /** An optional entity string extracted (e.g., 'yilmaz insaat') */
  entityQuery: z.string().nullable().optional(),
  
  /** The LLM's confidence in this classification */
  confidence: z.number().min(0).max(1)
});

// Infer the TypeScript type from the Zod schema
export type IntentResult = z.infer<typeof IntentResultSchema>;


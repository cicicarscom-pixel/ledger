import { z } from 'zod';

export const AIIntentEnum = z.enum([
  'COUNT_TAXPAYERS',
  'GET_TAXPAYER_BALANCE',
  'GET_TAXPAYER_HISTORY',
  'GET_TAXPAYER_INVOICES',
  'CHECK_MISSING_INVOICES',
  'SEND_NOTIFICATION',
  'UNKNOWN'
]);

export const IntentResultSchema = z.object({
  intent: AIIntentEnum,
  risk: z.enum(['read', 'write', 'external_action']),
  entityQuery: z.string().nullable(),
  confidence: z.number().min(0).max(1)
});

export type AIIntent = z.infer<typeof AIIntentEnum>;

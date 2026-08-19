export interface IntentResult {
  intent: string;
  risk: 'read' | 'write' | 'external_action';
  entityQuery: string | null;
  confidence: number;
}

export interface AIProvider {
  classifyIntent(prompt: string, context?: any): Promise<IntentResult>;
  structuredOutput<T>(prompt: string, schema: any): Promise<T>;
}

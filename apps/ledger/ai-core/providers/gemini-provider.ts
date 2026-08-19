import { AIProvider, IntentResult } from './ai-provider';

export class MockGeminiProvider implements AIProvider {
  async classifyIntent(prompt: string, context?: any): Promise<IntentResult> {
    const lower = prompt.toLowerCase();
    
    if (lower.includes('kaç mükellef')) {
      return { intent: 'COUNT_TAXPAYERS', risk: 'read', entityQuery: null, confidence: 0.98 };
    }
    if (lower.includes('borcu ne')) {
      // Very naive mock extraction for "Yılmaz İnşaat'ın borcu ne?"
      const entity = prompt.split('\'')[0].trim();
      return { intent: 'GET_TAXPAYER_BALANCE', risk: 'read', entityQuery: entity, confidence: 0.95 };
    }
    if (lower.includes('hatırlatma')) {
      return { intent: 'SEND_NOTIFICATION', risk: 'external_action', entityQuery: 'Yılmaz İnşaat', confidence: 0.95 };
    }
    if (lower.includes('belirsiz')) {
      return { intent: 'UNKNOWN', risk: 'read', entityQuery: null, confidence: 0.45 };
    }
    
    return { intent: 'UNKNOWN', risk: 'read', entityQuery: null, confidence: 0.10 };
  }

  async structuredOutput<T>(prompt: string, schema: any): Promise<T> {
    throw new Error('Method not implemented.');
  }
}

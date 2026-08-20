import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { AIProvider } from './ai-provider';
import { IntentResult, IntentResultSchema } from '../router/intent.schemas';

export class GeminiProvider implements AIProvider {
  
  public async classifyIntent(message: string): Promise<IntentResult> {
    try {
      const { object } = await generateObject({
        model: google('gemini-1.5-flash'),
        schema: IntentResultSchema,
        system: `Sen Türkçe hizmet veren bir Muhasebe AI Yönlendirme asistanısın.
Kullanıcının girdiği metni analiz et ve aşağıdaki intent'lerden birini seç:
- COUNT_TAXPAYERS: Kullanıcı kaç mükellefi/müşterisi olduğunu soruyorsa (Risk: read)
- GET_TAXPAYER_BALANCE: Kullanıcı belirli bir mükellefin borcunu veya bakiyesini soruyorsa (Risk: read)
- SEND_NOTIFICATION: Kullanıcı bir mükellefe bildirim/mesaj atmak veya borç hatırlatmak istiyorsa (Risk: external_action)
- UNKNOWN: Yukarıdakilerin hiçbiri değilse (Risk: read)

Eğer belirli bir firma/mükellef adı geçiyorsa (örneğin "Yılmaz İnşaat'a mesaj at", "Ahmet Bakkal borcu ne"),
firma adını eklerden (ın, a, ye vb.) arındırmadan veya arındırarak 'entityQuery' alanına ekle.
'confidence' alanına 0.0 ile 1.0 arasında emin olma oranını yaz.`,
        prompt: message,
      });

      return object;
    } catch (error) {
      console.error('[GeminiProvider] Error classifying intent:', error);
      // Graceful fallback on API failure
      return {
        intent: 'UNKNOWN',
        risk: 'read',
        confidence: 0,
      };
    }
  }
}

export const geminiProvider = new GeminiProvider();

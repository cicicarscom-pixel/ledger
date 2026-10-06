import { resolveForSession } from "../waha/WahaServerResolver.ts";

export class WahaClient {
  async sendWhatsAppMessage(merchantId: string, chatId: string, message: string): Promise<void> {
    const server = await resolveForSession(merchantId);
    
    if (!server) {
      throw new Error(`No WAHA server assignment found for session: ${merchantId}`);
    }

    const url = `${server.baseUrl}/sendText`;
    
    const payload = {
      session: merchantId,
      chatId: chatId,
      text: message
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Api-Key': server.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("WAHA reply failed:", errorText);
      throw new Error(`WAHA API error: ${errorText}`);
    }
  }
}

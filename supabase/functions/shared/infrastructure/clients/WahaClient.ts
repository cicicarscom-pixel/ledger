export class WahaClient {
  private baseUrl = 'http://31.97.37.208:3000/api';
  private apiKey = Deno.env.get("WAHA_API_KEY") || '';

  async sendWhatsAppMessage(merchantId: string, chatId: string, message: string): Promise<void> {
    const url = `${this.baseUrl}/sendText`;
    
    const payload = {
      session: merchantId,
      chatId: chatId,
      text: message
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Api-Key': this.apiKey,
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


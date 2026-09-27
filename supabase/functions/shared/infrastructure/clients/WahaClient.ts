export class WahaClient {
  private get baseUrl(): string {
    const url = Deno.env.get('WAHA_BASE_URL');
    if (!url) throw new Error('WAHA_BASE_URL is missing in environment variables');
    // Ensure we don't double /api if user adds it, but append it if missing
    return url.endsWith('/api') ? url : url.endsWith('/') ? `${url}api` : `${url}/api`;
  }

  private get apiKey(): string {
    const key = Deno.env.get('WAHA_API_KEY');
    if (!key) throw new Error('WAHA_API_KEY is missing in environment variables');
    return key;
  }

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

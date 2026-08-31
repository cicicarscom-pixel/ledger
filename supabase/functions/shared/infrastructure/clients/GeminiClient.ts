import { GeminiTurnResult } from '../../ai/types.ts';

export class GeminiClient {
  private apiKey = Deno.env.get('GEMINI_API_KEY') || '';

  async generateResponse(
    systemPrompt: string, 
    messages: Array<{ role: 'user' | 'model'; parts: Array<any> }>,
    tools: Array<Record<string, unknown>> = []
  ): Promise<GeminiTurnResult> {
    
    const payload: any = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: messages,
    };

    if (tools.length > 0) {
      payload.tools = [{ functionDeclarations: tools }];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[GeminiClient] API Error:", errorText);
      throw new Error("Gemini API error: " + errorText);
    }
    
    const result = await response.json();
    const parts = result.candidates?.[0]?.content?.parts || [];
    
    const functionCallParts = parts.filter((p: any) => p.functionCall);
    if (functionCallParts.length > 0) {
      return {
        type: "tool_calls",
        calls: functionCallParts.map((p: any) => ({
          name: p.functionCall.name,
          args: p.functionCall.args || {}
        }))
      };
    }

    const textPart = parts.find((p: any) => p.text);
    if (!textPart || !textPart.text) {
      const finishReason = result.candidates?.[0]?.finishReason;
      console.error("[GeminiClient] Boş yanıt: ne metin ne araç çağrısı geldi. finishReason:", finishReason);
      throw new Error(`Gemini boş yanıt döndürdü (finishReason: ${finishReason})`);
    }
    return {
      type: "text",
      text: textPart.text
    };
  }
}

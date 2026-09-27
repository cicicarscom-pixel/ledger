import { AIContext, GeminiTurnResult } from './types.ts';
import { PromptBuilder } from './PromptBuilder.ts';
import { ToolExecutor } from './tools/ToolExecutor.ts';
import { ToolRegistry } from './tools/ToolRegistry.ts';
import { GeminiClient } from '../infrastructure/clients/GeminiClient.ts';
import { claimsAction, claimsDeferredAction, claimsUnavailable } from './guards/ResponseGuards.ts';

interface AIOrchestratorDeps {
  geminiClient: GeminiClient;
  toolExecutor: ToolExecutor;
  toolRegistry: ToolRegistry;
  promptBuilder: PromptBuilder;
}

export class AIOrchestrator {
  private MAX_TOOL_ROUNDS = 5;

  constructor(private readonly deps: AIOrchestratorDeps) {}

  async handleMessage(
    context: AIContext, 
    userMessage: string, 
    history: { role: string, parts: { text: string }[] }[] = []
  ): Promise<string> {
    const systemPrompt = this.deps.promptBuilder.build(context);
    const tools = this.deps.toolRegistry.getAllSchemas();
    
    let hasSuccessfulBookingAction = false;
    let hasCheckedAvailability = false;

    // Pass chat history, then append the new user message.
    const messages: any[] = [
      ...history,
      { role: "user", parts: [{ text: userMessage }] }
    ];

    for (let round = 0; round < this.MAX_TOOL_ROUNDS; round++) {
      console.log(`[AIOrchestrator] Round ${round} - Gemini isteği gönderiliyor. Tool sayısı: ${tools.length}`);
      const turnResult = await this.deps.geminiClient.generateResponse(systemPrompt, messages, tools);
      console.log(`[AIOrchestrator] Round ${round} - Gemini yanıtı alındı. Yanıt tipi: ${turnResult.type}`);

      if (turnResult.type === "text") {
        const text = turnResult.text;
        let correction: string | null = null;
        let tag = "";

        if (claimsAction(text) && !hasSuccessfulBookingAction) {
          tag = "blocked_false_action_claim";
          correction =
            "SİSTEM: Bu turda randevu aracı SUCCESS dönmedi. Müşteriye randevunun oluşturulduğunu, " +
            "güncellendiğini veya iptal edildiğini SÖYLEYEMEZSİN. Gerekli bilgiler tamamsa " +
            "create_pending_appointment aracını ŞİMDİ çağır; eksikse sadece eksik bilgiyi sor.";
        } else if (claimsDeferredAction(text) && !hasCheckedAvailability && !hasSuccessfulBookingAction) {
          tag = "blocked_deferred_action";
          correction =
            "SİSTEM: 'Kontrol ediyorum / bekleyin' deyip turu bitiremezsin; müşteri tekrar yazana kadar " +
            "arka planda hiçbir şey çalışmaz. Söylediğin kontrolü ŞİMDİ yap: list_available_slots aracını " +
            "bu turda çağır ve sonucunu müşteriye ilet.";
        } else if (claimsUnavailable(text) && !hasCheckedAvailability) {
          tag = "blocked_false_availability_claim";
          correction =
            "SİSTEM: list_available_slots aracını çağırmadan bir saatin dolu veya uygun olmadığını " +
            "söyleyemezsin. Aracı ŞİMDİ çağır ve gerçek durumu bildir.";
        }

        if (correction) {
          console.warn(`[AIOrchestrator] ${tag} (round ${round})`);
          if (round < this.MAX_TOOL_ROUNDS - 1) {
            messages.push({ role: "model", parts: [{ text }] });
            messages.push({ role: "user", parts: [{ text: correction }] });
            continue;
          }
          console.error(`[AIOrchestrator] ${tag} — son tur, güvenli yanıt gönderildi`);
          return "Talebinizi aldım ancak şu an işlemi tamamlayamadım. Lütfen mesajınızı bir kez daha gönderir misiniz?";
        }

        return text;
      }

      if (turnResult.type === "tool_calls") {
        const toolResponses = [];
        
        messages.push({
          role: "model",
          parts: turnResult.calls.map(c => ({
            functionCall: { name: c.name, args: c.args }
          }))
        });

        for (const call of turnResult.calls) {
          const result = await this.deps.toolExecutor.executeCall(context, call);
          
          if (["create_pending_appointment", "update_appointment", "cancel_appointment"].includes(call.name)) {
            if (result.status === "SUCCESS") {
              hasSuccessfulBookingAction = true;
            }
          }
          if (call.name === "list_available_slots") {
            hasCheckedAvailability = true;
          }
          
          toolResponses.push({
            functionResponse: {
              name: call.name,
              response: { result: result }
            }
          });
        }

        messages.push({
          role: "user", 
          parts: toolResponses
        });
      }
    }

    console.warn(`[AIOrchestrator] MAX_TOOL_ROUNDS (${this.MAX_TOOL_ROUNDS}) exceeded.`);
    return "Şu an işleminizi gerçekleştiremiyorum. Lütfen daha sonra tekrar deneyin veya doğrudan bizimle iletişime geçin.";
  }
}

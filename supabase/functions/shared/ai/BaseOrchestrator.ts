import { AIContext, ToolCall } from './types.ts';
import { PromptBuilder } from './PromptBuilder.ts';
import { ToolExecutor } from './tools/ToolExecutor.ts';
import { ToolRegistry } from './tools/ToolRegistry.ts';
import { GeminiClient } from '../infrastructure/clients/GeminiClient.ts';

export interface OrchestratorDeps {
  geminiClient: GeminiClient;
  toolExecutor: ToolExecutor;
  toolRegistry: ToolRegistry;
  promptBuilder: PromptBuilder;
}

export type AIHistory = { role: string; parts: { text: string }[] }[];

/** Turda çalıştırılan bir araç çağrısının kaydı (sonuç gövdesi değil, yalnız durum). */
export interface ExecutedAction {
  name: string;
  args: Record<string, unknown>;
  status?: string;
}

/** Jeton sayısı Gemini istemcisinden gelmediği için yalnız tur/araç sayıları. */
export interface TurnUsage {
  rounds: number;
  toolCalls: number;
}

export interface OrchestratorResult {
  text: string;
  actions: ExecutedAction[];
  usage: TurnUsage;
}

export type TextVerdict =
  | { kind: 'accept' }
  // Modele düzeltme verilir, döngü devam eder (son turda lastRoundFallback kullanılır).
  | { kind: 'correct'; tag: string; correction: string }
  // Metin müşteriye/kullanıcıya gönderilmez, bu metin gönderilir (tur biter).
  | { kind: 'replace'; tag: string; text: string };

/**
 * Bir turun (tek mesaj) kanala/ürüne özel kuralları. Her tur için yeni örnek üretilir,
 * durumu (ör. "randevu araçları başarılı oldu mu") turun içinde tutar.
 */
export interface TurnGuard {
  onToolResult(call: ToolCall, result: any): void;
  inspectText(text: string, round: number): TextVerdict;
  /** Son turda hâlâ düzeltme gerekiyorsa verilen güvenli yanıt. */
  readonly lastRoundFallback: string;
  /** MAX_TOOL_ROUNDS aşılırsa verilen yanıt. */
  readonly maxRoundsFallback: string;
}

/**
 * Ortak Gemini araç döngüsü. Ürüne özel davranış `createGuard()` ile eklenir:
 * WhatsApp/sosyal müşteri asistanı için AppointmentTurnGuard (AIOrchestrator),
 * Flow AI için kendi guard'ı olacak.
 */
export abstract class BaseOrchestrator {
  protected readonly MAX_TOOL_ROUNDS = 6;
  protected readonly logPrefix: string = 'Orchestrator';

  constructor(protected readonly deps: OrchestratorDeps) {}

  protected abstract createGuard(context: AIContext): TurnGuard;

  async run(context: AIContext, userMessage: string, history: AIHistory = []): Promise<OrchestratorResult> {
    const systemPrompt = this.deps.promptBuilder.build(context);
    const tools = this.deps.toolRegistry.getAllSchemas();
    const guard = this.createGuard(context);
    const actions: ExecutedAction[] = [];
    const usage: TurnUsage = { rounds: 0, toolCalls: 0 };
    const done = (text: string): OrchestratorResult => ({ text, actions, usage });

    const messages: any[] = [
      ...history,
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    for (let round = 0; round < this.MAX_TOOL_ROUNDS; round++) {
      usage.rounds = round + 1;
      console.log(`[${this.logPrefix}] Round ${round} - Gemini isteği gönderiliyor. Tool sayısı: ${tools.length}`);
      const turnResult = await this.deps.geminiClient.generateResponse(systemPrompt, messages, tools);
      console.log(`[${this.logPrefix}] Round ${round} - Gemini yanıtı alındı. Yanıt tipi: ${turnResult.type}`);

      if (turnResult.type === 'text') {
        const text = turnResult.text;
        const verdict = guard.inspectText(text, round);

        if (verdict.kind === 'accept') return done(text);

        if (verdict.kind === 'replace') {
          console.warn(`[${this.logPrefix}] ${verdict.tag}: ${text.slice(0, 200)}`);
          return done(verdict.text);
        }

        console.warn(`[${this.logPrefix}] ${verdict.tag} (round ${round}): ${text.slice(0, 200)}`);
        if (round < this.MAX_TOOL_ROUNDS - 1) {
          messages.push({ role: 'model', parts: [{ text }] });
          messages.push({ role: 'user', parts: [{ text: verdict.correction }] });
          continue;
        }
        console.error(`[${this.logPrefix}] ${verdict.tag} — son tur, güvenli yanıt gönderildi`);
        return done(guard.lastRoundFallback);
      }

      if (turnResult.type === 'tool_calls') {
        const toolResponses = [];

        messages.push({
          role: 'model',
          parts: turnResult.calls.map(c => ({
            functionCall: { name: c.name, args: c.args },
          })),
        });

        for (const call of turnResult.calls) {
          const result = await this.deps.toolExecutor.executeCall(context, call);
          usage.toolCalls++;
          actions.push({ name: call.name, args: call.args, status: result?.status });
          guard.onToolResult(call, result);

          toolResponses.push({
            functionResponse: {
              name: call.name,
              response: { result: result },
            },
          });
        }

        messages.push({
          role: 'user',
          parts: toolResponses,
        });
      }
    }

    console.warn(`[${this.logPrefix}] MAX_TOOL_ROUNDS (${this.MAX_TOOL_ROUNDS}) exceeded.`);
    return done(guard.maxRoundsFallback);
  }
}

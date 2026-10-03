import type { AIContext, ToolCall } from '../types.ts';
import { BaseOrchestrator, TextVerdict, TurnGuard } from '../BaseOrchestrator.ts';

/** Flow AI için tur kuralları: müşteri asistanının randevu korumaları BURADA YOK; onay kapısı FlowToolExecutor'dadır. */
export class FlowAITurnGuard implements TurnGuard {
  readonly lastRoundFallback = 'Şu an isteğini tamamlayamadım. Biraz sonra tekrar dener misin?';
  readonly maxRoundsFallback = 'İsteğin çok adımlı çıktı ve tamamlayamadım. Daha kısa bir istekle tekrar dener misin?';
  onToolResult(_call: ToolCall, _result: unknown): void {}
  inspectText(_text: string, _round: number): TextVerdict {
    return { kind: 'accept' };
  }
}

export class FlowAIOrchestrator extends BaseOrchestrator {
  protected readonly logPrefix = 'FlowAIOrchestrator';
  protected createGuard(_context: AIContext): TurnGuard {
    return new FlowAITurnGuard();
  }
}

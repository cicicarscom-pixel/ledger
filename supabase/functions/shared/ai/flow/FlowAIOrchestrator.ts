import type { AIContext, ToolCall } from '../types.ts';
import { BaseOrchestrator, TextVerdict, TurnGuard } from '../BaseOrchestrator.ts';

/**
 * Flow AI için tur kuralları. Müşteri asistanının randevu korumaları BURADA YOK; onay kapısı FlowToolExecutor'dadır.
 * Tek koruma: "yalan yapıldı" engeli. Model "rehberi başlattım / ekranı açtım / taslağı hazırladım" diyorsa bu turda
 * ilgili araç GERÇEKTEN SUCCESS dönmüş olmalı; dönmediyse model araca yönlendirilir (cihaz testi 03.10.2026: model
 * start_guide'ı çağırmadan "başlattım" dedi, hiçbir şey olmadı).
 */
const UI_TOOLS = new Set(['start_guide', 'open_screen', 'highlight', 'prepare_post_draft', 'generate_caption']);
const MAX_CLAIM_CORRECTIONS = 2;

// Türkçe geçmiş zaman iddiaları ("başlattım", "açtım", "yönlendirdim", "vurguladım", "hazırladım", "götürdüm").
export const claimsUiAction = (text: string): boolean =>
  /\b(başlattım|başlatıldı|açtım|açıldı|yönlendirdim|yönlendirildi|götürdüm|vurguladım|vurgulandı|hazırladım|hazırlandı|oluşturdum)\b/i.test(text);

export class FlowAITurnGuard implements TurnGuard {
  readonly lastRoundFallback = 'Şu an isteğini tamamlayamadım. Biraz sonra tekrar dener misin?';
  readonly maxRoundsFallback = 'İsteğin çok adımlı çıktı ve tamamlayamadım. Daha kısa bir istekle tekrar dener misin?';
  private uiToolSucceeded = false;
  private corrections = 0;

  onToolResult(call: ToolCall, result: unknown): void {
    if (UI_TOOLS.has(call.name) && (result as { status?: string })?.status === 'SUCCESS') this.uiToolSucceeded = true;
  }

  inspectText(text: string, _round: number): TextVerdict {
    if (!claimsUiAction(text) || this.uiToolSucceeded) return { kind: 'accept' };
    if (this.corrections >= MAX_CLAIM_CORRECTIONS) {
      // Doğrulanmamış iddia kullanıcıya GÖNDERİLMEZ.
      return { kind: 'replace', tag: 'blocked_unverified_ui_claim', text: 'İsteğini tam olarak uygulayamadım. Ne yapmamı istediğini bir kez daha yazar mısın?' };
    }
    this.corrections++;
    return {
      kind: 'correct',
      tag: 'blocked_false_ui_claim',
      correction:
        'SİSTEM: Bu turda ilgili araç SUCCESS dönmedi; "başlattım/açtım/yönlendirdim/hazırladım" DİYEMEZSİN. ' +
        'İsteği şimdi uygun aracı çağırarak yap (start_guide, open_screen, highlight, prepare_post_draft veya generate_caption); ' +
        'araç SUCCESS dönünce kısa bir cümleyle bildir. Araç gerekmiyorsa yaptığını söyleme, sadece bilgi ver.',
    };
  }
}

export class FlowAIOrchestrator extends BaseOrchestrator {
  protected readonly logPrefix = 'FlowAIOrchestrator';
  protected createGuard(_context: AIContext): TurnGuard {
    return new FlowAITurnGuard();
  }
}

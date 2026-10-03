import { AIContext } from './types.ts';
import { AIHistory, BaseOrchestrator, OrchestratorDeps, TurnGuard } from './BaseOrchestrator.ts';
import { AppointmentTurnGuard } from './guards/AppointmentTurnGuard.ts';

export type AIOrchestratorDeps = OrchestratorDeps;

/**
 * Müşteri asistanı (WhatsApp / sosyal medya) orkestratörü. Döngü BaseOrchestrator'da;
 * randevu korumaları AppointmentTurnGuard'da. Dış imza (handleMessage → string) değişmedi.
 */
export class AIOrchestrator extends BaseOrchestrator {
  protected readonly logPrefix = 'AIOrchestrator';

  protected createGuard(_context: AIContext): TurnGuard {
    return new AppointmentTurnGuard();
  }

  async handleMessage(
    context: AIContext,
    userMessage: string,
    history: AIHistory = []
  ): Promise<string> {
    const result = await this.run(context, userMessage, history);
    return result.text;
  }
}

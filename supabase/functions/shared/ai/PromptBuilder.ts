import { AIContext } from './types.ts';
import { PersonaPromptBuilder } from './persona/PersonaPromptBuilder.ts';

export class PromptBuilder {
  // Defaulted so every existing call site (`new PromptBuilder()`) keeps
  // working unchanged — container.ts wires a real instance explicitly, but
  // nothing breaks if it doesn't.
  constructor(private readonly personaPromptBuilder: PersonaPromptBuilder = new PersonaPromptBuilder()) {}

  private readonly SYSTEM_POLICY = `Sen Workigom altyapısını kullanan bir yapay zeka asistanısın.
Görevin işletme adına müşterilerle konuşmak, sorularını yanıtlamak ve randevu almaktır. 
Aşağıdaki kurallara kesinlikle uymalısın:
1. Sadece sana verilen "Araçlar"ı (Tools) kullanarak randevu alabilirsin. Hayali randevu veya saat uyduramazsın.
2. İşletmenin hizmetlerini öğrenmek için servis aracını kullanmalısın.
3. Asla rakip firma önermemeli veya siyasi/dini konulara girmemelisin.`;

  build(context: AIContext): string {
    const businessContext = this.buildBusinessContext(context);
    const botPersonality = this.buildBotPersonality(context);
    const channelContext = this.buildChannelContext(context);

    return `
=== SYSTEM POLICY ===
${this.SYSTEM_POLICY}

=== BUSINESS CONTEXT ===
${businessContext}

=== BOT PERSONALITY ===
${botPersonality}

=== CHANNEL CONTEXT ===
${channelContext}
`.trim();
  }

  private buildBusinessContext(context: AIContext): string {
    return `Tarih/Saat (Senin için "Şu an"): ${context.now.toISOString()}
Zaman Dilimi: ${context.timezone}
İşletme ID: ${context.organizationId}
`;
  }

  // Persona Engine fallback chain (guardrail #6 — locked; never remove a
  // rung, never reorder). context.personaConfig is resolved upstream (see
  // HandleIncomingMessageUseCase, Phase 3) — this method never talks to the
  // database and never decides publish-gate rules itself, it only renders
  // what it was handed:
  //   1) a resolved persona config (already publish-gate-checked by
  //      PersonaService) → render it via PersonaPromptBuilder
  //   2) legacy bot_settings.system_prompt (pre-Persona-Engine merchants,
  //      or any merchant that hasn't picked a persona) → used verbatim,
  //      exactly as before this phase — untouched behavior
  //   3) hardcoded standard-assistant string (brand-new merchant, nothing
  //      set yet) — exactly the old default, unchanged
  private buildBotPersonality(context: AIContext): string {
    if (context.personaConfig) {
      return this.personaPromptBuilder.render(context.personaConfig);
    }
    if (context.botSettings && context.botSettings.system_prompt) {
      return context.botSettings.system_prompt;
    }
    return "Standart, kibar ve profesyonel bir asistan gibi davran.";
  }

  private buildChannelContext(context: AIContext): string {
    let ctx = `Platform: ${context.channel.platform} (${context.channel.source})
Etkileşimli Buton Desteği (Interactive UI): ${context.channel.supportsInteractiveButtons ? 'Evet' : 'Hayır'}`;

    if (!context.channel.supportsInteractiveButtons) {
      ctx += `\nÖNEMLİ: Bu kanalda buton gönderemezsin. Kullanıcıya seçenekleri liste halinde (metin olarak) sunmalı ve metin ile yanıt vermesini istemelisin.`;
    }

    if (context.channel.maxSuggestedResponseLength) {
      ctx += `\nUzunluk: Lütfen yanıtları ${context.channel.maxSuggestedResponseLength} formatında tut.`;
    }

    return ctx;
  }
}

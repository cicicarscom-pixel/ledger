import { AIContext } from './types.ts';

export class PromptBuilder {
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

  private buildBotPersonality(context: AIContext): string {
    if (!context.botSettings || !context.botSettings.system_prompt) {
      return "Standart, kibar ve profesyonel bir asistan gibi davran.";
    }
    return context.botSettings.system_prompt;
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

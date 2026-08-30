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
3. Asla rakip firma önermemeli veya siyasi/dini konulara girmemelisin.
4. Asla iç sistem ID'lerini, veritabanı kimliklerini veya teknik referans numaralarını (UUID vb.) müşteriyle doğrudan paylaşma. Sadece insan dostu bilgileri (hizmet adı, saat, tarih) kullan.
5. Randevu almak istediğini belirten bir müşteriyle KESİNLİKLE şu sırayı izle, adım atlama veya sıra değiştirme:
   a) Önce müşterinin adını sor ("Randevunuzu oluşturabilmem için önce adınızı öğrenebilir miyim?") ve cevabı bekle.
   b) İsim alındıktan sonra hangi hizmeti istediğini (zaten belirtmemişse) ve hangi tarihte randevu istediğini sor.
   c) Müşteri göreceli bir gün adı kullanırsa ("cuma", "yarın" gibi), bunu yukarıdaki "Bugünün tarihi" bilgisine göre hesapla ve MUTLAKA açık tarihle teyit et: "İlk Cuma günü, yani ayın 27'si Cuma'yı mı kastediyorsunuz?" — müşteri onaylamadan devam etme.
   d) Tarih netleşince, müşteriye sormadan doğrudan list_available_slots aracını çağır ve boş saatleri sun: "Bu saatlerden hangisi sizin için uygun?"
   e) Müşteri bir saat seçince create_pending_appointment'i customerName, serviceId ve startsAt ile birlikte çağır.
   Bu sırayı asla değiştirme; isim alınmadan veya tarih teyit edilmeden asla create_pending_appointment çağırma.`;

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
    const localNow = new Intl.DateTimeFormat('tr-TR', {
      timeZone: context.timezone,
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(context.now);

    return `Bugünün tarihi ve saati (${context.timezone} saatine göre): ${localNow}
Not: Yukarıdaki tarih zaten senin saat dilimine göre hesaplanmıştır, ayrıca dönüşüm yapmana gerek yok. Göreceli tarihleri ("cuma", "yarın", "gelecek hafta" gibi) SADECE bu tarihe göre hesapla.
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

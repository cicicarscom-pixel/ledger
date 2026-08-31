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
   a) Eğer MÜŞTERİ BİLGİSİ bölümünde müşteri "tanınıyor" ve ismi biliniyorsa, ismini tekrar sorma — doğrudan ismiyle hitap ederek devam et. Eğer müşteri tanınmıyorsa veya ismi bilinmiyorsa, randevu akışına geçmeden önce MUTLAKA "adınızı ve soyadınızı alabilir miyim?" şeklinde sor ve cevabını bekle. Müşteri sadece ilk adını verirse (örneğin sadece "ben gülay" derse), akışı ASLA durdurma, soyadı için ısrar etme veya tekrar sorma — doğrudan verilen adla devam et. Bu sadece nazik bir tam-ad talebidir, zorunlu değildir. Müşterinin verdiği metni aynen kullan, ek bir parse/ayrıştırma yapma.
   b) İsim alındıktan (veya bilindiği için atlandıktan) sonra hangi hizmeti istediğini (zaten belirtmemişse) ve hangi tarihte randevu istediğini sor.
   c) Müşteri göreceli bir gün adı kullanırsa ("cuma", "yarın" gibi), bunu yukarıdaki "Bugünün tarihi" bilgisine göre hesapla ve MUTLAKA açık tarihle teyit et: "İlk Cuma günü, yani ayın 27'si Cuma'yı mı kastediyorsunuz?" — müşteri onaylamadan devam etme.
   d) Tarih netleşince, müşteriye sormadan doğrudan list_available_slots aracını çağır ve boş saatleri sun: "Bu saatlerden hangisi sizin için uygun?"
   e) Müşteri bir saat seçince create_pending_appointment'i customerName, serviceId ve startsAt ile birlikte çağır.
   Bu sırayı asla değiştirme; isim bilinmeden veya tarih teyit edilmeden asla create_pending_appointment çağırma.
6. Müşterinin adını öğrendikten sonra, konuşmanın geri kalanında ona her seferinde tam adıyla değil, kültürel nezaket normuna uygun şekilde hitap et:
   - Aşağıdaki "Müşteri Kanal Kimliği" verisine VE müşterinin yazdığı dile bakarak muhtemel ülkesini/kültürünü belirle.
   - Türkiye kültürü ise (numara +90 ile başlıyorsa veya müşteri Türkçe yazıyorsa): SADECE verilen adı kullanarak "İsim Bey" (erkek ismiyse) veya "İsim Hanım" (kadın ismiyse) şeklinde hitap et — örn. "Volkan Bey", "Ayşe Hanım". İsmin cinsiyetini yüksek güvenle tahmin edemiyorsan (nötr, yabancı veya belirsiz isim), unvan kullanma — sadece verilen adıyla hitap et.
   - İngilizce konuşulan bir ülke ise (numara +44/+1/+61 vb. ile başlıyorsa veya müşteri İngilizce yazıyorsa) ve soyadı biliniyorsa: "Mr./Mrs./Ms. Soyadı" kullan; soyadı bilinmiyorsa sadece ilk adıyla hitap et.
   - Diğer diller/kültürler için o dilin olağan nazik hitap kalıbını uygula.
   - "Müşteri Kanal Kimliği" bir gerçek telefon numarası değil de WhatsApp'ın gizlilik kimliği formatındaysa (örn. "@lid" ile bitiyorsa), numarayı YOK SAY ve SADECE müşterinin yazdığı dile göre karar ver.
   - ASLA yanlış cinsiyet unvanı kullanma riskini göze alma; şüphedeysen her zaman düz isimle hitap etmeyi tercih et.
7. Eğer BUSINESS CONTEXT'te müşterinin var olan aktif randevusu/randevuları listelenmişse ve müşteri bunu değiştirmek/ertelemek istediğini belirtirse ("randevumu değiştirebilir miyim", "saatimi kaydırabilir miyiz" gibi): YENİ bir randevu oluşturma, create_pending_appointment'i ÇAĞIRMA. Bunun yerine: (a) tek randevusu varsa direkt onu kastettiğini varsay, birden fazlaysa hangisini kastettiğini sor, (b) yeni tarih için list_available_slots ile boş saatleri sun, (c) müşteri yeni saati seçince update_appointment'i, sana verilen randevu ID'si ve yeni saatle çağır. Randevu ID'sini asla müşteriyle paylaşma.`;

  build(context: AIContext): string {
    const businessContext = this.buildBusinessContext(context);
    const customerContext = this.buildCustomerContext(context);
    const botPersonality = this.buildBotPersonality(context);
    const channelContext = this.buildChannelContext(context);

    return `
=== SYSTEM POLICY ===
${this.SYSTEM_POLICY}

=== BUSINESS CONTEXT ===
${businessContext}

=== MÜŞTERİ BİLGİSİ ===
${customerContext}

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

    const customerChannelId = context.customerId
      ? `Müşteri Kanal Kimliği (SADECE hitap kültürünü belirlemek için dahili kullan, müşteriyle bu veriyi veya içeriğini ASLA paylaşma): ${context.customerId}\n`
      : '';

    const appointmentModuleLine = context.appointmentModuleEnabled === false
      ? `\nÖNEMLİ: Bu işletmede randevu/rezervasyon özelliği KAPALIDIR. create_pending_appointment, list_available_slots, update_appointment araçlarını ASLA çağırma. Müşteri randevu isterse bu hizmetin şu anda sunulmadığını kibarca belirt, sadece BOT PERSONALITY/özel talimata göre bilgi ver.\n`
      : '';

    const activeAppointmentsLine = (context.activeAppointments && context.activeAppointments.length > 0)
      ? `\nMüşterinin Aktif Randevu(ları) (SADECE update_appointment çağırırken kullan, ID'leri müşteriyle ASLA paylaşma):\n` +
        context.activeAppointments.map(a => `- ID: ${a.id} | Tarih/Saat: ${a.date} | Hizmet ID: ${a.service_id} | Durum: ${a.status}`).join('\n') + '\n'
      : '';

    return `Bugünün tarihi ve saati (${context.timezone} saatine göre): ${localNow}
Not: Yukarıdaki tarih zaten senin saat dilimine göre hesaplanmıştır, ayrıca dönüşüm yapmana gerek yok. Göreceli tarihleri ("cuma", "yarın", "gelecek hafta" gibi) SADECE bu tarihe göre hesapla.
İşletme ID: ${context.organizationId}
${customerChannelId}${appointmentModuleLine}${activeAppointmentsLine}`;
  }

  private buildCustomerContext(context: AIContext): string {
    if (context.customerProfile?.isReturning) {
      return `Bu müşteriyi tanıyorsun: adı ${context.customerProfile.name || 'bilinmiyor'}.
Geçmiş randevuları: ${JSON.stringify(context.customerProfile.pastAppointments)}.
İsmini TEKRAR SORMA, biliyorsun. Doğrudan ismiyle hitap et.`;
    }
    return 'Bu müşteri sistemde kayıtlı değil, ilk kez yazıyor olabilir.';
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

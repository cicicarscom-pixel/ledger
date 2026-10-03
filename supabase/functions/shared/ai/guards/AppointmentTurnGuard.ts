import { ToolCall } from '../types.ts';
import { TextVerdict, TurnGuard } from '../BaseOrchestrator.ts';
import { claimsAction, claimsDeferredAction, claimsUnavailable } from './ResponseGuards.ts';

const BOOKING_TOOLS = ['create_pending_appointment', 'update_appointment', 'cancel_appointment'];

// Müsaitlik koruması aynı yanıtta en fazla bu kadar düzeltme ister; sonra tarafsız yanıt verir.
// (Araç çağrılacak bir tarih yokken, ör. selamlaşmada, sonsuz döngüye girmesin.)
const MAX_AVAILABILITY_CORRECTIONS = 2;

/**
 * Müşteri asistanına (WhatsApp / sosyal) özel randevu korumaları. Taşınmadan önceki
 * AIOrchestrator davranışının birebir aynısıdır; mantığı değiştirme (bkz. ResponseGuards.test.ts).
 */
export class AppointmentTurnGuard implements TurnGuard {
  readonly lastRoundFallback =
    'Talebinizi aldım ancak şu an işlemi tamamlayamadım. Lütfen mesajınızı bir kez daha gönderir misiniz?';
  // Müşteriyi "daha sonra deneyin" ile bırakma; son isteğini netleştirmesini iste (28.09.2026 olayı).
  readonly maxRoundsFallback =
    'Talebinizi tam olarak tamamlayamadım. Randevu istediğiniz gün ve saati bir kez daha yazar mısınız?';

  private hasSuccessfulBookingAction = false;
  private hasCheckedAvailability = false;
  private availabilityCorrections = 0;

  onToolResult(call: ToolCall, result: any): void {
    if (BOOKING_TOOLS.includes(call.name) && result?.status === 'SUCCESS') {
      this.hasSuccessfulBookingAction = true;
    }
    if (call.name === 'list_available_slots') {
      this.hasCheckedAvailability = true;
    }
  }

  inspectText(text: string, _round: number): TextVerdict {
    if (claimsAction(text) && !this.hasSuccessfulBookingAction) {
      return {
        kind: 'correct',
        tag: 'blocked_false_action_claim',
        correction:
          'SİSTEM: Bu turda randevu aracı SUCCESS dönmedi. Müşteriye randevunun oluşturulduğunu, ' +
          'güncellendiğini veya iptal edildiğini SÖYLEYEMEZSİN. Gerekli bilgiler tamamsa ' +
          'create_pending_appointment aracını ŞİMDİ çağır; eksikse sadece eksik bilgiyi sor.',
      };
    }
    if (claimsDeferredAction(text) && !this.hasCheckedAvailability && !this.hasSuccessfulBookingAction) {
      return {
        kind: 'correct',
        tag: 'blocked_deferred_action',
        correction:
          "SİSTEM: 'Kontrol ediyorum / bekleyin' deyip turu bitiremezsin; müşteri tekrar yazana kadar " +
          'arka planda hiçbir şey çalışmaz. Söylediğin kontrolü ŞİMDİ yap: list_available_slots aracını ' +
          'bu turda çağır ve sonucunu müşteriye ilet.',
      };
    }
    if (claimsUnavailable(text) && !this.hasCheckedAvailability) {
      if (this.availabilityCorrections >= MAX_AVAILABILITY_CORRECTIONS) {
        // Doğrulanmamış "dolu/müsait değil" iddiası müşteriye GÖNDERİLMEZ (Faz D, 01.10.2026).
        return {
          kind: 'replace',
          tag: `availability guard ${this.availabilityCorrections} kez düzeltti; doğrulanmamış iddia GÖNDERİLMEDİ, tarafsız yanıt verildi`,
          text: 'Müsaitlik durumunu şu an doğrulayamadım. İstediğiniz gün ve saati bir kez daha yazar mısınız? Hemen kontrol edeyim.',
        };
      }
      this.availabilityCorrections++;
      return {
        kind: 'correct',
        tag: 'blocked_false_availability_claim',
        correction:
          'SİSTEM: list_available_slots aracını çağırmadan bir saatin dolu veya uygun olmadığını ' +
          'söyleyemezsin. Aracı ŞİMDİ çağır ve gerçek durumu bildir.',
      };
    }
    return { kind: 'accept' };
  }
}

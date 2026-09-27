// Saf fonksiyonlar: Gemini'nin metin yanıtını müşteriye gitmeden önce denetler.
// Hiçbir dış bağımlılığı yoktur; birim testlerle doğrulanır.

const L = "\\p{L}"; // her dildeki harf (Türkçe ş, ı, ğ dahil)
const w = (body: string) => new RegExp(`(?<![${L}])(?:${body})(?![${L}])`, "u");

export function normalize(text: string): string {
  return text.toLocaleLowerCase("tr");
}

// Randevu oluşturma/güncelleme/iptal İDDİASI (tamamlanmış, süren veya kesin gelecek).
// Soru ve teklif kalıpları ("oluşturayım mı", "oluşturabilmem için") KASITLI olarak eşleşmez.
const ACTION_CLAIM = [
  w("oluşturdum|oluşturuldu|oluşturulmuştur|oluşturuyorum|oluşturacağım|oluşturmuş bulunuyorum"),
  w("güncelledim|güncellendi|güncellenmiştir|güncelliyorum|güncelleyeceğim"),
  w("ayarladım|ayarlandı|ayarlanmıştır|ayarlıyorum|ayarlayacağım"),
  w("kaydettim|kaydedildi|kaydedilmiştir|kaydediyorum|kaydedeceğim|kaydınızı aldım|kaydınız alındı"),
  w("rezerve ettim|rezerve edildi|rezervasyonunuz yapıldı|rezervasyonunuz alındı"),
  w("iptal ettim|iptal edildi|iptal edilmiştir|iptal ediyorum"),
  /randevunuz(?:\s+[\p{L}\d:.]+){0,6}\s+(?:hazır|alındı|tamam|onaylandı|oluşturuldu|kesinleşti)(?![\p{L}])/u,
  w("booked|has been scheduled|is scheduled|is confirmed|has been confirmed|has been created|rescheduled|has been cancelled|has been canceled|you're all set|you are all set"),
  w("gebucht|eingetragen|bestätigt|storniert|verschoben"),
];

// "Kontrol ediyorum / bekleyin" gibi ERTELENMİŞ eylem ifadeleri.
const DEFERRED_ACTION = [
  w("kontrol ediyorum|kontrol edeceğim|kontrol etmekteyim|kontrol edip dönüyorum|kontrol edip döneceğim"),
  w("bakıyorum|bakacağım|bakmaktayım|bakıp dönüyorum|bakıp döneceğim"),
  w("bir saniye|bir dakika|bekleyin|beklemede kalın|lütfen bekleyiniz|hemen dönüyorum"),
  w("let me check|i'll check|i will check|checking now|one moment|just a moment|please wait"),
  w("einen moment|ich prüfe|ich schaue nach"),
];

// Müsait DEĞİL iddiası.
const UNAVAILABLE_CLAIM = [
  w("dolu|doludur|dolmuş|uygun değil|müsait değil|boş değil|yer yok"),
  w("not available|unavailable|fully booked|already taken|is taken"),
  w("nicht verfügbar|ausgebucht|belegt"),
];

const any = (patterns: RegExp[], text: string) => patterns.some((p) => p.test(normalize(text)));

export const claimsAction = (text: string) => any(ACTION_CLAIM, text);
export const claimsDeferredAction = (text: string) => any(DEFERRED_ACTION, text);
export const claimsUnavailable = (text: string) => any(UNAVAILABLE_CLAIM, text);

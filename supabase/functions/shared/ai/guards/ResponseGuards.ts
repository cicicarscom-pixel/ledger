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
  w("kontrol yapıyorum|kontrol yapacağım|kontrol sağlıyorum|kontrol sağlayacağım|yeniden kontrol ediyorum|tekrar kontrol ediyorum"),
  w("süre verin|süre tanıyın|anlık süre|bir anlık|bir an için|bir saniyenizi|biraz bekleyin|kısa bir süre bekleyin"),
  w("araştırıyorum|araştıracağım|inceliyorum|inceleyeceğim|ilgileniyorum|hallediyorum"),
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

// customerRequestRaw GELME NEDENİ olmalı. Yalnız saat / tarih / onay / tercih kelimelerinden
// oluşan metinler ("sabah 9 olsun", "onaylıyorum", "farketmez herhangi biri") neden değildir.
const SCHEDULING_ONLY_WORDS = new Set([
  "saat", "sabah", "öğle", "öğlen", "öğleden", "sonra", "akşam", "gece", "erken", "geç", "buçuk", "yarım",
  "olsun", "olur", "uygun", "uyar", "iyi", "tamam", "evet", "peki", "onay", "onaylıyorum", "onaylarım", "kabul",
  "fark", "farketmez", "etmez", "herhangi", "biri", "birisi", "kim", "olabilir", "hepsi", "müsait", "olan",
  "gün", "günü", "hafta", "haftaya", "bugün", "yarın", "öbür", "ayın", "ay", "için", "de", "da", "ile", "lütfen", "ve",
  "pazartesi", "salı", "çarşamba", "perşembe", "cuma", "cumartesi", "pazar",
  "ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık",
  "ok", "okay", "yes", "fine", "sure", "confirm", "confirmed", "any", "anyone", "at", "on", "am", "pm", "morning", "afternoon", "evening",
  "ja", "gut", "passt", "bestätigt", "egal", "uhr", "morgen", "um",
  // "30'u", "9'da" gibi ek parçaları (kesme işareti ayrıştırmada düşer)
  "u", "ü", "ı", "i", "te", "ta", "ye", "ya", "e", "a", "sı", "si", "su", "sü",
]);

export function isSchedulingOnlyText(text: string): boolean {
  const tokens = normalize(text ?? "").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => /^\p{N}+$/u.test(t) || /^\p{N}+(?:u|te|ta|de|da|ye|ya|e|a|i|ı|ü|u)?$/u.test(t) || SCHEDULING_ONLY_WORDS.has(t));
}

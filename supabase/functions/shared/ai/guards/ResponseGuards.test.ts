// Çalıştırma: deno test supabase/functions/shared/ai/guards/ResponseGuards.test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { claimsAction, claimsDeferredAction, claimsUnavailable, isSchedulingOnlyText } from "./ResponseGuards.ts";
 
const cases: Array<[string, (t: string) => boolean, string, boolean]> = [
  ["action", claimsAction, "Randevunuzu Dr. Salih Güney için 29 Eylül 2026 Salı günü saat 11:00 olarak güncelliyorum.", true],
  ["action", claimsAction, "Yine de endişelenmeyin, randevunuzu diş çekimi talebinizle birlikte oluşturacağım.", true],
  ["action", claimsAction, "Randevunuz başarıyla oluşturulmuştur.", true],
  ["action", claimsAction, "Randevunuz 11:00 olarak güncellenmiştir.", true],
  ["action", claimsAction, "Harika, randevunuz hazır! 29 Eylül 11:00 sizi bekliyoruz.", true],
  ["action", claimsAction, "RANDEVUNUZ İPTAL EDİLDİ.", true],
  ["action", claimsAction, "Kaydınızı aldım, görüşmek üzere.", true],
  ["action", claimsAction, "Your appointment has been booked for 11:00.", true],
  ["action", claimsAction, "Ihr Termin ist bestätigt.", true],
  ["action", claimsAction, "Randevu oluşturabilmem için adınızı alabilir miyim?", false],
  ["action", claimsAction, "Sizin için 30 Eylül 10:00'a randevu oluşturayım mı?", false],
  ["action", claimsAction, "Hangi saat sizin için uygun olur?", false],
  ["action", claimsAction, "Randevunuzu iptal edebilir miyim?", false],
  ["action", claimsAction, "Would you like me to book 10:00 for you?", false],
  ["deferred", claimsDeferredAction, "Bir saniye bekleyin lütfen, müsaitlik durumunu kontrol ediyorum.", true],
  ["deferred", claimsDeferredAction, "Dr. Mehmet Yalçın'ın müsaitlik durumunu kontrol etmekteyim.", true],
  ["deferred", claimsDeferredAction, "Hemen bakıyorum.", true],
  // 28.09.2026 WhatsApp olayından gerçek cümleler
  ["deferred", claimsDeferredAction, "Hemen yeniden bir kontrol yapıyorum ve size en uygun uzmanı buluyorum. Lütfen bana bir anlık süre verin.", true],
  ["deferred", claimsDeferredAction, "Sistemdeki akışı kontrol sağlıyorum, kısa bir süre bekleyin.", true],
  ["deferred", claimsDeferredAction, "Talebinizi inceliyorum.", true],
  ["deferred", claimsDeferredAction, "Let me check the schedule for you.", true],
  ["deferred", claimsDeferredAction, "Dr. Mehmet'in 15:00'i dolu, şu saatler müsait: 09:00, 09:30.", false],
  ["deferred", claimsDeferredAction, "Size bakım konusunda yardımcı olabilirim.", false],
  ["unavailable", claimsUnavailable, "29 Eylül saat 15:00 itibarıyla Dr. Mehmet Yalçın'ın takvimi doludur.", true],
  ["unavailable", claimsUnavailable, "Dr. Salih 10:00'da müsait değil.", true],
  ["unavailable", claimsUnavailable, "That slot is already taken.", true],
  ["unavailable", claimsUnavailable, "Doluluk oranımız bu hafta yüksek.", false],
  ["unavailable", claimsUnavailable, "30 Eylül 10:00 müsait, oluşturayım mı?", false],
];
 
for (const [kind, fn, text, expected] of cases) {
  Deno.test(`[${kind}] ${expected ? "ENGELLE" : "GEÇİR"}: ${text}`, () => {
    assertEquals(fn(text), expected);
  });
}

// customerRequestRaw doğrulaması: yalnız saat/tarih/onay → neden DEĞİL.
const requestRawCases: Array<[string, boolean]> = [
  ["sabah 9 olsun", true],
  ["saat sabah 9 olsun", true],
  ["onaylıyorum", true],
  ["evet  herhangi biri olabilir", true],
  ["farketmez herhangi biri olabilir", true],
  ["ayın 30 u olsun", true],
  ["30 Eylül Çarşamba 09:00", true],
  ["yarın öğleden sonra 14.30", true],
  ["dolgum düştü", false],
  ["implantlarımı kontrol ettirmek istiyorum", false],
  ["diş eti kanaması", false],
  ["sabah 9 olsun, dolgum düştü", false],
  ["Mein Zahn tut weh", false],
];

for (const [text, expected] of requestRawCases) {
  Deno.test(`[requestRaw] ${expected ? "REDDET" : "KABUL"}: ${text}`, () => {
    assertEquals(isSchedulingOnlyText(text), expected);
  });
}

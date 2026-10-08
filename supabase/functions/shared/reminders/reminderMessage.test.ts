// Çalıştırma: deno test --no-check --allow-all supabase/functions/shared/reminders/reminderMessage.test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { chatIdFromDigits, localeTag, maskChatId, renderReminderTemplate } from "./reminderMessage.ts";

const TR_DEFAULT = "Merhaba {first_name},\n{business} olarak {date} saat {time} randevunuzu hatırlatmak isteriz.\nUzman: {doctor}\nİşlem: {service}\nRandevunuzla ilgili bir değişiklik için bu mesaja yazabilirsiniz. Sizi bekliyoruz!";
// 2026-10-09 07:30 UTC = İstanbul 10:30 (Cuma)
const base = { startsAt: "2026-10-09T07:30:00Z", timezone: "Europe/Istanbul", locale: "tr", orgName: "Atlas Diş Kliniği", customerName: "ahmet yavuz", doctor: "Dr.Salih GÜNEY", service: "Kontrol" };

Deno.test("chatIdFromDigits: Türkiye biçimleri 90 ile tamamlanır, geçersizler null", () => {
  assertEquals(chatIdFromDigits("905051478877"), "905051478877@c.us");
  assertEquals(chatIdFromDigits("5051478877"), "905051478877@c.us");
  assertEquals(chatIdFromDigits("05051478877"), "905051478877@c.us");
  assertEquals(chatIdFromDigits("+90 505 147 88 77"), "905051478877@c.us");
  assertEquals(chatIdFromDigits("4915112345678"), "4915112345678@c.us");
  assertEquals(chatIdFromDigits("12345"), null);
  assertEquals(chatIdFromDigits("90505147"), null);
  assertEquals(chatIdFromDigits(null), null);
});

Deno.test("varsayılan Türkçe metin: işletme saat diliminde gün/saat, doktor ve işlem satırları", () => {
  const lines = renderReminderTemplate(TR_DEFAULT, base).split("\n");
  assertEquals(lines[0], "Merhaba Ahmet,");
  assertEquals(lines[1], "Atlas Diş Kliniği olarak 9 Ekim Cuma saat 10:30 randevunuzu hatırlatmak isteriz.");
  assertEquals(lines[2], "Uzman: Dr.Salih GÜNEY");
  assertEquals(lines[3], "İşlem: Kontrol");
});

Deno.test("işletmenin kendi metni AYNEN korunur; unvan (Mr./Mrs./Sayın) koda gömülü değil, yazdığı gibi gider", () => {
  const t = renderReminderTemplate("Dear Mr./Mrs. {name}, see you at {business} on {date}, {time}.", { ...base, locale: "en" });
  assertEquals(t, "Dear Mr./Mrs. ahmet yavuz, see you at Atlas Diş Kliniği on Friday 9 October, 10:30.");
  assertEquals(renderReminderTemplate("Sayın {name}, {time}", base), "Sayın ahmet yavuz, 10:30");
});

Deno.test("doktor/işlem boşsa o satır çıkar; boş ad 'Merhaba ,' bırakmaz", () => {
  const t = renderReminderTemplate(TR_DEFAULT, { ...base, doctor: null, service: "", customerName: "" });
  const lines = t.split("\n");
  assertEquals(lines[0], "Merhaba,");
  assertEquals(t.includes("Uzman:"), false);
  assertEquals(t.includes("İşlem:"), false);
  assertEquals(t.includes("undefined") || t.includes("null"), false);
});

Deno.test("dil ve saat biçimi: Almanca 24 saat, ABD'de 12 saat, İngilizce diğer yerlerde 24 saat", () => {
  assertEquals(localeTag("de", "Europe/Berlin"), "de-DE");
  assertEquals(localeTag("en", "America/New_York"), "en-US");
  assertEquals(localeTag("en", "Europe/London"), "en-GB");
  const de = renderReminderTemplate("{date} um {time}", { ...base, locale: "de", timezone: "Europe/Berlin" });
  assertEquals(de, "Freitag, 9. Oktober um 09:30");
  const us = renderReminderTemplate("{time}", { ...base, locale: "en", timezone: "America/New_York" });
  assertEquals(us.includes("AM") || us.includes("am"), true); // 03:30 AM
});

Deno.test("Türkçe büyük/küçük harf (İ/ı) doğru; çok kelimeli ad tam gelir", () => {
  assertEquals(renderReminderTemplate("{first_name}|{name}", { ...base, customerName: "İBRAHİM kaya" }), "İbrahim|İBRAHİM kaya");
});

Deno.test("enjeksiyon: adın içindeki {…} ve kontrol karakterleri temizlenir; bilinmeyen yer tutucu olduğu gibi kalır", () => {
  assertEquals(renderReminderTemplate("{name}", { ...base, customerName: "{service}\u0007 X" }), "service X");
  assertEquals(renderReminderTemplate("a {bilinmeyen} b", base), "a {bilinmeyen} b");
});

Deno.test("maskChatId: telefon yalnız son 4 hane görünür", () => {
  assertEquals(maskChatId("905051478877@c.us"), "********8877");
});

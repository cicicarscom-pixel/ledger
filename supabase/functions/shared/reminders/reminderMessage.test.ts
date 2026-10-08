// Çalıştırma: deno test --no-check --allow-all supabase/functions/shared/reminders/reminderMessage.test.ts
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { buildReminderText, chatIdFromDigits, maskChatId } from "./reminderMessage.ts";

Deno.test("chatIdFromDigits: Türkiye biçimleri 90 ile tamamlanır, geçersizler null", () => {
  assertEquals(chatIdFromDigits("905051478877"), "905051478877@c.us");
  assertEquals(chatIdFromDigits("5051478877"), "905051478877@c.us");
  assertEquals(chatIdFromDigits("05051478877"), "905051478877@c.us");
  assertEquals(chatIdFromDigits("+90 505 147 88 77"), "905051478877@c.us");
  assertEquals(chatIdFromDigits("4915112345678"), "4915112345678@c.us"); // yabancı numara
  assertEquals(chatIdFromDigits("12345"), null);
  assertEquals(chatIdFromDigits("90505147"), null); // eksik TR numarası
  assertEquals(chatIdFromDigits(null), null);
  assertEquals(chatIdFromDigits(""), null);
});

Deno.test("hatırlatma metni: işletme saat diliminde gün/saat, doktor ve işlem satırları", () => {
  // 2026-10-09 07:30 UTC = İstanbul 10:30 (Cuma)
  const t = buildReminderText({ orgName: "Demo Klinik", customerName: "ahmet yavuz", startsAt: "2026-10-09T07:30:00Z", timezone: "Europe/Istanbul", doctor: "Dr.Salih GÜNEY", service: "Kontrol" });
  const lines = t.split("\n");
  assertEquals(lines[0], "Merhaba Ahmet,");
  assertEquals(lines[1], "Demo Klinik olarak 9 Ekim Cuma saat 10:30 randevunuzu hatırlatmak isteriz.");
  assertEquals(lines[2], "Doktor: Dr.Salih GÜNEY");
  assertEquals(lines[3], "İşlem: Kontrol");
  assertEquals(lines[4].startsWith("Randevunuzla ilgili"), true);
});

Deno.test("hatırlatma metni: eksik alanlarda satır atlanır, uydurma yok", () => {
  const t = buildReminderText({ startsAt: "2026-10-09T07:30:00Z", timezone: "Europe/Istanbul" });
  assertEquals(t.split("\n")[0], "Merhaba,");
  assertEquals(t.includes("Doktor:"), false);
  assertEquals(t.includes("İşlem:"), false);
  assertEquals(t.includes("undefined") || t.includes("null"), false);
});

Deno.test("hatırlatma metni: Türkçe büyük/küçük harf (İ/ı) doğru", () => {
  assertEquals(buildReminderText({ customerName: "İBRAHİM kaya", startsAt: "2026-10-09T07:30:00Z", timezone: "Europe/Istanbul" }).split("\n")[0], "Merhaba İbrahim,");
});

Deno.test("maskChatId: telefon yalnız son 4 hane görünür", () => {
  assertEquals(maskChatId("905051478877@c.us"), "********8877");
});

import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { canUseWhatsapp, isAccountBlocked, normalizePhoneNumber } from "./wahaSession.ts";

Deno.test("telefon normalize: boşluk/+/tire temizlenir, harf ve kısa/uzun reddedilir", () => {
  assertEquals(normalizePhoneNumber("+90 551 531 84 58"), "905515318458");
  assertEquals(normalizePhoneNumber("0551-531"), "0551531");
  assertEquals(normalizePhoneNumber("abc"), null);
  assertEquals(normalizePhoneNumber("123"), null);
  assertEquals(normalizePhoneNumber("1".repeat(16)), null);
  assertEquals(normalizePhoneNumber(undefined), null);
});

Deno.test("yalnız active hesap WhatsApp kullanabilir (fail-closed)", () => {
  assertEquals(canUseWhatsapp("active"), true);
  assertEquals(canUseWhatsapp("suspended"), false);
  assertEquals(canUseWhatsapp("banned"), false);
  assertEquals(canUseWhatsapp(null), false);
  assertEquals(canUseWhatsapp(undefined), false);
});

Deno.test("bot susturma: yalnız suspended/banned; eksik veri susturmaz", () => {
  assertEquals(isAccountBlocked("suspended"), true);
  assertEquals(isAccountBlocked("banned"), true);
  assertEquals(isAccountBlocked("active"), false);
  assertEquals(isAccountBlocked(null), false);
  assertEquals(isAccountBlocked(undefined), false);
});

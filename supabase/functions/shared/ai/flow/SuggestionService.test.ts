import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { buildSuggestions, type SuggestionInput } from "./SuggestionService.ts";

const base: SuggestionInput = { days: [], connectedAccounts: 1, bestTimes: [], growth: [], growthDays: 30 };
const day = (date: string, free: number, booked = 0) => ({ date, calendars: [{ free, booked, blocked: 0 }] });

Deno.test("veri yoksa kart yok (uydurma öneri yok)", () => {
  assertEquals(buildSuggestions(base), []);
});

Deno.test("hesap bağlı değilse bağlama kartı (navigate)", () => {
  const c = buildSuggestions({ ...base, connectedAccounts: 0 });
  assertEquals(c.length, 1);
  assertEquals(c[0].kind, "connect_account");
  assertEquals(c[0].cta, { type: "navigate", screen: "sosyal_medya" });
});

Deno.test("en boş gün seçilir; eşiğin altındaysa kart yok", () => {
  const c = buildSuggestions({ ...base, days: [day("2026-10-05", 2, 6), day("2026-10-06", 7, 1), day("2026-10-07", 3, 5)] });
  assertEquals(c[0].kind, "free_slots");
  assertEquals(c[0].params.date, "2026-10-06");
  assertEquals(buildSuggestions({ ...base, days: [day("2026-10-05", 3, 5)] }), []);
  assertEquals(buildSuggestions({ ...base, days: [day("2026-10-05", 0, 0)] }), []); // takvim yok → öneri yok
});

Deno.test("en iyi saat: örnek az (1 gönderi) ise kart yok; yeterliyse var", () => {
  assertEquals(buildSuggestions({ ...base, bestTimes: [{ day: "Çarşamba", hour: "20:00", avgEngagement: 9, postCount: 1 }] }), []);
  const c = buildSuggestions({ ...base, bestTimes: [{ day: "Çarşamba", hour: "20:00", avgEngagement: 9, postCount: 2 }] });
  assertEquals(c[0].kind, "best_time");
  assertEquals(c[0].params.hour, "20:00");
});

Deno.test("büyüme: sıfır/ölçümsüz yok sayılır, en büyük mutlak değişim seçilir", () => {
  const c = buildSuggestions({ ...base, growth: [
    { platform: "facebook", hasData: true, followerChange: 0 },
    { platform: "instagram", hasData: false, followerChange: null },
    { platform: "youtube", hasData: true, followerChange: -7 },
    { platform: "tiktok", hasData: true, followerChange: 3 },
  ] });
  assertEquals(c.length, 1);
  assertEquals(c[0].params.platform, "youtube");
});

Deno.test("en fazla 3 kart, öncelik sırası: bağla → boş saat → en iyi saat → büyüme", () => {
  const c = buildSuggestions({
    days: [day("2026-10-06", 8)], connectedAccounts: 0,
    bestTimes: [{ day: "Pazar", hour: "12:00", avgEngagement: 5, postCount: 3 }],
    growth: [{ platform: "facebook", hasData: true, followerChange: 5 }], growthDays: 30,
  });
  assertEquals(c.map((x) => x.kind), ["connect_account", "free_slots", "growth"]); // best_time bağlı hesap olmadığı için yok
});

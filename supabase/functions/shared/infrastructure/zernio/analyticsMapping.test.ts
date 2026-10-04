import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { mapFollowerStats, mapInsights, ymdInTimezone } from "./analyticsMapping.ts";

Deno.test("instagram içgörü eşlemesi", () => {
  const r = mapInsights("Instagram", { metrics: { views: { total: 100 }, reach: { total: 40 }, total_interactions: { total: 7 } } });
  assertEquals(r, { impressions: 100, reach: 40, engagements: 7 });
});

Deno.test("facebook içgörü eşlemesi; ölçülemeyen metrik null (0 değil)", () => {
  const r = mapInsights("facebook", { metrics: { page_media_view: { total: 9 } } });
  assertEquals(r, { impressions: 9, reach: null, engagements: null });
});

Deno.test("bilinmeyen platform ve boş yanıt", () => {
  assertEquals(mapInsights("tiktok", {}), { impressions: null, reach: null, engagements: null });
  assertEquals(mapInsights("youtube", undefined), { impressions: null, reach: null, engagements: null });
});

Deno.test("takipçi eşlemesi: hesap id'siyle, yoksa ilk hesap", () => {
  const res = { accounts: [
    { _id: "a1", currentFollowers: 10, accountStats: { mediaCount: 3 } },
    { _id: "a2", currentFollowers: 3426, accountStats: { videoCount: 11 } },
  ] };
  assertEquals(mapFollowerStats(res, "a2"), { followers: 3426, posts_count: 11 });
  assertEquals(mapFollowerStats({ accounts: [] }, "x"), { followers: null, posts_count: null });
});

Deno.test("işletme günü İstanbul'a göre (UTC 22:30 → ertesi gün)", () => {
  assertEquals(ymdInTimezone(new Date("2026-10-03T22:30:00Z")), "2026-10-04");
});

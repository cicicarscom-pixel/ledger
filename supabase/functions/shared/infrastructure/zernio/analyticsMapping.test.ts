import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { mapFollowerStats, mapInboxPerformance, mapInboxVolume, mapInsights, ymdInTimezone } from "./analyticsMapping.ts";

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

Deno.test("yerel gün kuruluşun saat dilimine göre; eksik/geçersiz → UTC", () => {
  const d = new Date("2026-10-03T22:30:00Z");
  assertEquals(ymdInTimezone(d, "Europe/Istanbul"), "2026-10-04");
  assertEquals(ymdInTimezone(d, "America/Los_Angeles"), "2026-10-03");
  assertEquals(ymdInTimezone(d, "Pacific/Auckland"), "2026-10-04");
  assertEquals(ymdInTimezone(d, null), "2026-10-03");
  assertEquals(ymdInTimezone(d, "Gecersiz/Zaman"), "2026-10-03");
});

Deno.test("gelen kutusu hacmi: dört SDK yanıtı arayüz şekline çevrilir", () => {
  const vol = {
    summary: { received: 12, sent: 7, read: 5, failed: 1, uniqueConversations: 4 },
    timeseries: [{ date: "2026-10-01", received: 2, sent: 1, read: 1, failed: 0 }],
    byPlatform: [{ platform: "instagram", received: 12, sent: 7, read: 5, failed: 1 }],
  };
  const top = { accounts: [
    { platform: "instagram", displayName: "Atlas", username: "atlas", received: 12, sent: 7, conversations: 4, medianResponseSeconds: 125.4, repliedCount: 3 },
    { platform: "facebook", username: "klinik", received: 1, sent: 0, conversations: 1, medianResponseSeconds: 0, repliedCount: 0 },
  ] };
  const sources = { sources: [{ source: "api", sent: 3 }, { source: "platform", sent: 4 }, { source: "workflow", sent: 0 }, { source: "yeni_kaynak", sent: 2 }] };
  const heat = { buckets: [{ dow: 1, hour: 9, received: 2, sent: 1 }, { dow: 7, hour: 23, received: 0, sent: 0 }, { dow: 9, hour: 1, received: 5, sent: 0 }] };
  const r = mapInboxVolume(vol, top, sources, heat);
  assertEquals(r.summary, { received: 12, sent: 7, read: 5, failed: 1, uniqueConversations: 4 });
  assertEquals(r.timeseries[0], { date: "2026-10-01", received: 2, sent: 1, read: 1, failed: 0 });
  assertEquals(r.byPlatform[0].platform, "instagram");
  assertEquals(r.byAccount[0], { platform: "instagram", name: "Atlas", received: 12, sent: 7, conversations: 4, medianResponseSeconds: 125 });
  // yanıt yok (repliedCount=0) → 0 sn değil null; ad yoksa kullanıcı adı
  assertEquals(r.byAccount[1].name, "klinik");
  assertEquals(r.byAccount[1].medianResponseSeconds, null);
  // gönderimi 0 olan kaynak listelenmez; bilinmeyen kaynak adıyla görünür
  assertEquals(r.outboundBySource.map((x) => `${x.name}=${x.value}`), ["API=3", "Native app=4", "yeni_kaynak=2"]);
  // dow 1=Pazartesi; boş (0) ve geçersiz (9) kovalar atılır
  assertEquals(r.heatmap, [{ hour: 9, day: "Mon", dow: 1, value: 3 }]);
});

Deno.test("gelen kutusu hacmi: boş/hatalı yanıtlar çökmez, sıfırlarla döner", () => {
  const r = mapInboxVolume(undefined, undefined, { error: "x" }, null);
  assertEquals(r.summary, { received: 0, sent: 0, read: 0, failed: 0, uniqueConversations: 0 });
  assertEquals([r.timeseries, r.byPlatform, r.byAccount, r.outboundBySource, r.heatmap], [[], [], [], [], []]);
});

Deno.test("yanıt süresi: medyan, yüzde dilimleri ve dağılım histogramdan hesaplanır", () => {
  const res = {
    summary: { sampleSize: 10, medianSeconds: 90.6, p90Seconds: 2000 },
    histogram: [
      { bucket: "0-1m", lowerSeconds: 0, upperSeconds: 60, count: 2 },
      { bucket: "1-5m", lowerSeconds: 60, upperSeconds: 300, count: 3 },
      { bucket: "5-15m", lowerSeconds: 300, upperSeconds: 900, count: 1 },
      { bucket: "15-60m", lowerSeconds: 900, upperSeconds: 3600, count: 2 },
      { bucket: "1d+", lowerSeconds: 86400, upperSeconds: null, count: 2 },
    ],
  };
  const r = mapInboxPerformance(res);
  assertEquals(r.medianResponseSeconds, 91);
  assertEquals(r.repliedCount, 10);
  assertEquals([r.percentUnder5m, r.percentUnder15m, r.percentUnder1h], [50, 60, 80]);
  assertEquals(r.distribution.map((d) => `${d.name}=${d.value}`), ["0-1m=2", "1-5m=3", "5-15m=1", "15-60m=2", "1d+=2"]);
});

Deno.test("yanıt süresi: veri yokken sıfır, bölme hatası yok", () => {
  const r = mapInboxPerformance(undefined);
  assertEquals([r.medianResponseSeconds, r.repliedCount, r.percentUnder5m, r.percentUnder15m, r.percentUnder1h], [0, 0, 0, 0, 0]);
  assertEquals(r.distribution, []);
});

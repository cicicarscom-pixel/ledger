import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { compactBestTimes, compactPostPerformance, GetAccountGrowthTool, GetBestPostingTimesTool, GetContentPerformanceTool, GetSocialOverviewTool, summarizeAccounts } from "./SocialAnalyticsTools.ts";

const ctx: any = { organizationId: "org-1", timezone: "Europe/Istanbul" };
const rpcAdmin = (data: any, error: any = null) => {
  const calls: any[] = [];
  return { calls, rpc: (n: string, a: any) => { calls.push([n, a]); return Promise.resolve({ data, error }); } };
};

Deno.test("özet: kiracı yalnız context'ten, gün 1-90'a kırpılır", async () => {
  const a = rpcAdmin({ accounts: [], posts: { total: 0 } });
  const r = await new GetSocialOverviewTool(a).execute({ ...ctx }, { days: 999, organizationId: "EVIL" });
  assertEquals(a.calls[0], ["get_social_analytics_for_ai", { p_org: "org-1", p_days: 90 }]);
  assertEquals(r.status, "SUCCESS");
  assertEquals((r as any).data.hasData, false);
});

Deno.test("özet: ölçüm yoksa hasData=false ve sayı yok", () => {
  const s = summarizeAccounts([{ platform: "instagram", followers_now: null, followers_start: null, impressions: 0, reach: 0, engagements: 0, days_with_data: 0, last_metric_date: null }]);
  assertEquals(s[0].followers, null);
  assertEquals(s[0].followerChange, null);
});

Deno.test("büyüme: değişim ve platform filtresi", async () => {
  const a = rpcAdmin({ accounts: [
    { platform: "instagram", followers_now: 120, followers_start: 100, impressions: 5, reach: 4, engagements: 3, days_with_data: 7, last_metric_date: "2026-10-03" },
    { platform: "facebook", followers_now: 10, followers_start: 10, impressions: 0, reach: 0, engagements: 0, days_with_data: 2, last_metric_date: "2026-10-03" },
  ], posts: {} });
  const r: any = await new GetAccountGrowthTool(a).execute(ctx, { platform: "Instagram" });
  assertEquals(r.data.accounts.length, 1);
  assertEquals(r.data.accounts[0].followerChange, 20);
});

Deno.test("RPC hatası ERROR döner, ham hata sızmaz", async () => {
  const r: any = await new GetSocialOverviewTool(rpcAdmin(null, { message: "secret" })).execute(ctx, {});
  assertEquals(r.status, "ERROR");
  assertEquals(String(r.message).includes("secret"), false);
});

Deno.test("en iyi saat: boş veri → hasData=false; çağrıya org context'ten gider", async () => {
  const seen: any[] = [];
  const tool = new GetBestPostingTimesTool(async (a, o, q) => { seen.push([a, o, q]); return {}; });
  const r: any = await tool.execute(ctx, { platform: "instagram" });
  assertEquals(r.data.hasData, false);
  assertEquals(seen[0], ["get-best-times", "org-1", { platform: "instagram" }]);
});

Deno.test("performans: veri var → hasData=true; çağrı hatası → ERROR", async () => {
  const ok: any = await new GetContentPerformanceTool(async () => [{ likes: 3 }]).execute(ctx, { days: 7 });
  assertEquals(ok.data.hasData, true);
  const bad: any = await new GetContentPerformanceTool(async () => { throw new Error("boom"); }).execute(ctx, {});
  assertEquals(bad.status, "ERROR");
});

Deno.test("compactBestTimes: en yüksek 5, gün adı ve örnek sayısı", () => {
  const r = compactBestTimes({ slots: [
    { hour: 12, post_count: 3, day_of_week: 0, avg_engagement: 920.33 },
    { hour: 20, post_count: 2, day_of_week: 3, avg_engagement: 3338 },
  ] });
  assertEquals(r[0], { day: "Çarşamba", dayIndex: 3, hour: "20:00", avgEngagement: 3338, postCount: 2 });
  assertEquals(r[1].day, "Pazar");
  assertEquals(compactBestTimes({}), []);
});

Deno.test("compactPostPerformance: toplam ve görüntülenmeye göre sıralama", () => {
  const r = compactPostPerformance({ posts: [
    { platform: "youtube", content: "a", analytics: { views: 5, likes: 1 } },
    { platform: "youtube", content: "b", analytics: { views: 61, likes: 2, comments: 2 } },
  ] });
  assertEquals(r.postCount, 2);
  assertEquals(r.totals.views, 66);
  assertEquals(r.topByViews[0].text, "b");
});

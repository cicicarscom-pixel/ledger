import { assertEquals, assertThrows } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { buildScopedPayload, cacheKeyFor, cacheMetricFor, sanitizeAnalyticsQuery, scopeIsEmpty } from "./analyticsScope.ts";

const scope = { orgId: "org-1", profileIds: ["prof-1"], accountIds: ["acc-1"] };

Deno.test("istemci profileId/accountId taşıyamaz", () => {
  const q = sanitizeAnalyticsQuery({ query: { fromDate: "2026-01-01", profileId: "EVIL", accountId: "EVIL2" }, profileId: "EVIL3" });
  assertEquals(q, { fromDate: "2026-01-01" });
});

Deno.test("hesap yoksa org profiliyle sınırlanır, istemci profili yok sayılır", () => {
  const p = buildScopedPayload({ query: { profileId: "EVIL", fromDate: "a" } }, scope);
  assertEquals(p.query.profileId, "prof-1");
  assertEquals(p.profileId, "prof-1");
  assertEquals(p.query.fromDate, "a");
});

Deno.test("sahipliği olmayan hesap reddedilir", () => {
  assertThrows(() => buildScopedPayload({}, scope, "acc-X"));
  assertEquals(buildScopedPayload({}, scope, "acc-1").query.accountId, "acc-1");
});

Deno.test("boş kapsam", () => {
  assertEquals(scopeIsEmpty({ orgId: "o", profileIds: [], accountIds: [] }), true);
  assertEquals(scopeIsEmpty(scope), false);
  assertThrows(() => buildScopedPayload({}, { orgId: "o", profileIds: [], accountIds: [] }));
});

Deno.test("önbellek anahtarı org ile başlar, global asla", () => {
  assertEquals(cacheKeyFor("org-1"), "org:org-1");
  assertEquals(cacheKeyFor("org-1", "acc-1"), "org:org-1:acc:acc-1");
  assertThrows(() => cacheKeyFor(""));
});

Deno.test("farklı sorgu farklı metric anahtarı", () => {
  const a = cacheMetricFor("daily_metrics", { fromDate: "1" });
  const b = cacheMetricFor("daily_metrics", { fromDate: "2" });
  assertEquals(a === b, false);
  assertEquals(cacheMetricFor("x", {}), "x");
});

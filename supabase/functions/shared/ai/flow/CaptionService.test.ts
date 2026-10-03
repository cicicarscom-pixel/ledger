// Çalıştırma: deno test --no-check --allow-all supabase/functions/shared/ai/flow/CaptionService.test.ts
// FA3-2: tek metin servisi — persona tonu, platform kuralları, sınır, ölçüm; aynı istek aynı sonuç.
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { CaptionService, buildCaptionPrompt, fitToLimit, strictestRule } from "./CaptionService.ts";
import { startOfLocalDayIso } from "./FlowAIGate.ts";
import { GenerateCaptionTool } from "./tools/FlowTools.ts";

const persona: any = {
  personaId: "p1", slug: "x", name: "Neşeli Usta", identityPrompt: "Sıcak ve esprili bir usta gibi yaz.", worldview: [], preferredMetaphors: [], vocabulary: [], favoriteExpressions: [],
  greetingStyle: null, farewellStyle: null, speakingStyle: { formal: 20, warm: 80, humorous: 60, metaphorical: 10 }, humorStyle: "Warm", emojiLevel: "Medium",
  forbiddenBehaviors: ["siyaset"], boundaries: ["tıbbi iddia"], businessRole: null, tone: "samimi", personaIntensity: 50, humorLevel: 50, modernAdaptation: 50, customInstruction: "Hep 'Hoş geldiniz' ile bitir.",
};

function make(opts: { count?: number; turn?: any; persona?: any } = {}) {
  const inserted: any[] = []; const calls: any[] = [];
  const admin: any = {
    from: () => ({
      select: () => { const b: any = { eq: () => b, gte: () => b, then: (r: any) => r({ count: opts.count ?? 0, error: null }) }; return b; },
      insert: (row: any) => { inserted.push(row); return Promise.resolve({ error: null }); },
    }),
  };
  const gemini = { generateResponse: (s: string, m: any[], t: any[]) => { calls.push({ s, m, t }); return Promise.resolve(opts.turn ?? { type: "text", text: "Yaz geldi! ☀️ #yaz" }); } };
  const svc = new CaptionService({ gemini, admin, dailyLimit: 3, startOfDayIso: startOfLocalDayIso, resolvePersona: () => Promise.resolve(opts.persona === undefined ? persona : opts.persona) });
  return { svc, inserted, calls };
}
const base = { orgId: "ORG-A", userId: "U1", brief: "Yaz kampanyası", platforms: ["instagram"] };

Deno.test("başarılı üretim: persona tonu + platform kuralı isteme girer, kullanım kaydı yazılır", async () => {
  const { svc, inserted, calls } = make();
  const r = await svc.generate(base);
  assertEquals(r.status, "SUCCESS");
  const sys: string = calls[0].s;
  for (const needle of ["Neşeli Usta", "Sıcak ve esprili", "emoji düzeyi: Medium", "siyaset", "tıbbi iddia", "Hep 'Hoş geldiniz'", "instagram:", "2200"]) assertEquals(sys.includes(needle), true, needle);
  assertEquals(calls[0].t, []); // araç yok: yalnız metin
  assertEquals(inserted, [{ org_id: "ORG-A", user_id: "U1", source: "flow_caption", event_type: "caption", model: "gemini-2.5-flash" }]);
});

Deno.test("görsel inlineData olarak iletilir", async () => {
  const { svc, calls } = make();
  await svc.generate({ ...base, image: { data: "AAAA", mimeType: "image/png" } });
  assertEquals(calls[0].m[0].parts[1], { inlineData: { mimeType: "image/png", data: "AAAA" } });
});

Deno.test("günlük sınır dolunca Gemini çağrılmaz, kayıt yazılmaz", async () => {
  const { svc, inserted, calls } = make({ count: 3 });
  assertEquals(await svc.generate(base), { status: "DAILY_LIMIT", limit: 3 });
  assertEquals(calls.length, 0);
  assertEquals(inserted.length, 0);
});

Deno.test("geçersiz konu reddedilir", async () => {
  const { svc, calls } = make();
  assertEquals((await svc.generate({ ...base, brief: "  " })).status, "INVALID_BRIEF");
  assertEquals((await svc.generate({ ...base, brief: "x".repeat(1001) })).status, "INVALID_BRIEF");
  assertEquals(calls.length, 0);
});

Deno.test("Gemini hatası/boş yanıt ERROR döner ve ölçüm yazılmaz", async () => {
  const a = make({ turn: { type: "text", text: "   " } });
  assertEquals((await a.svc.generate(base)).status, "ERROR");
  assertEquals(a.inserted.length, 0);
  const b = make({ turn: { type: "tool_calls", calls: [] } });
  assertEquals((await b.svc.generate(base)).status, "ERROR");
});

Deno.test("persona yoksa da çalışır; çoklu platformda en kısıtlayıcı sınır; metin sınıra kırpılır", async () => {
  const { svc, calls } = make({ persona: null, turn: { type: "text", text: "kelime ".repeat(100) } });
  const r = await svc.generate({ ...base, platforms: ["instagram", "twitter"] });
  assertEquals(r.status, "SUCCESS");
  assertEquals((r as any).maxChars, 280);
  assertEquals((r as any).text.length <= 280, true);
  assertEquals(calls[0].s.includes("Marka sesi"), false);
  assertEquals(calls[0].s.includes("en kısıtlayıcı sınıra (280"), true);
  assertEquals(strictestRule(["bilinmeyen"]).maxChars, 2000);
  assertEquals(fitToLimit("kısa", 100), "kısa");
  assertEquals(buildCaptionPrompt(null, { maxChars: 10, notes: [] }).includes("10 karakteri"), true);
});

Deno.test("generate_caption aracı: kimlik bağlamdan, model org seçemez; sonuçlar araç durumuna çevrilir", async () => {
  const seen: any[] = [];
  const svcFake: any = { generate: (r: any) => { seen.push(r); return Promise.resolve({ status: "SUCCESS", text: "Merhaba", maxChars: 2200 }); } };
  const t = new GenerateCaptionTool(svcFake);
  const ctx: any = { organizationId: "ORG-A", customerId: "U1", now: new Date(), timezone: "Europe/Istanbul" };
  const r = await t.execute(ctx, { brief: "yaz", platforms: ["instagram", 5], orgId: "ORG-B", org_id: "ORG-B" });
  assertEquals(r.status, "SUCCESS");
  assertEquals(seen[0], { orgId: "ORG-A", userId: "U1", brief: "yaz", platforms: ["instagram"] });
  for (const [status, expected] of [["DAILY_LIMIT", "DAILY_LIMIT"], ["INVALID_BRIEF", "INVALID_BRIEF"], ["ERROR", "ERROR"]]) {
    const tt = new GenerateCaptionTool({ generate: () => Promise.resolve({ status } as any) });
    assertEquals((await tt.execute(ctx, { brief: "x" })).status, expected);
  }
  assertEquals(t.riskLevel, "PREPARE");
});

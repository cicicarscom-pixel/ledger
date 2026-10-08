// Çalıştırma: deno test --no-check --allow-all supabase/functions/shared/ai/flow/tools/FlowTools.test.ts
// FA1-3: Flow AI ilk araçları yalnız bağlamdaki işletmenin verisini görür; hepsi READ/PREPARE'dir.
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  GetAppointmentsOverviewTool, GetConnectedSocialAccountsTool, GetHelpTopicTool, HighlightTool, OpenScreenTool,
  addDaysYmd, createFlowTools, todayInTimezone,
} from "./FlowTools.ts";
import { FlowToolExecutor, type PendingActionStore } from "../FlowAIGate.ts";
import { FLOW_SCREENS } from "../flowUiCatalog.ts";

const ctx: any = { organizationId: "ORG-A", customerId: "u1", now: new Date("2026-10-03T21:30:00Z"), timezone: "Europe/Istanbul", channel: { source: "flow_ai", platform: "flow_ai", supportsInteractiveButtons: false } };

/** Zincirlenebilir sahte sorgu; filtreleri kaydeder ve verilen satırları döndürür. */
function fakeAdmin(rows: { rpc?: any[]; appts?: any[]; social?: any[] }) {
  const log: { rpc: any[]; eq: [string, unknown][]; schema: string[] } = { rpc: [], eq: [], schema: [] };
  const q = (data: any[]) => {
    const b: any = {
      select: () => b, in: () => b, gte: () => b, lte: () => b, order: () => b, limit: () => b,
      eq: (c: string, v: unknown) => { log.eq.push([c, v]); return b; },
      then: (res: any) => res({ data, error: null }),
    };
    return b;
  };
  const admin: any = {
    rpc: (fn: string, args: any) => { log.rpc.push({ fn, args }); return Promise.resolve({ data: rows.rpc ?? [], error: null }); },
    from: (t: string) => q(t === "appointments" ? rows.appts ?? [] : rows.social ?? []),
    schema: (s: string) => { log.schema.push(s); return admin; },
  };
  return { admin, log };
}

Deno.test("randevu özeti: işletme yalnız bağlamdan gelir, model argümanı yok sayılır; sayımlar doğru", async () => {
  const { admin, log } = fakeAdmin({
    rpc: [
      { calendar_name: "Dr. A", status: "free" }, { calendar_name: "Dr. A", status: "free" },
      { calendar_name: "Dr. A", status: "booked" }, { calendar_name: "Dr. A", status: "blocked" }, { calendar_name: "Dr. A", status: "past" },
    ],
    appts: [{ date: "2026-10-04T13:00:00", customer_name: "Ali", status: "Pending" }],
  });
  const r = await new GetAppointmentsOverviewTool(admin).execute(ctx, { date: "2026-10-04", days: 1, orgId: "ORG-B", organizationId: "ORG-B" });
  assertEquals(r.status, "SUCCESS");
  const day = (r.data as any).days[0];
  assertEquals(day.date, "2026-10-04");
  assertEquals(day.calendars, [{ name: "Dr. A", free: 2, booked: 1, blocked: 1 }]);
  assertEquals(day.appointments, [{ time: "13:00", customer: "Ali", calendar: null, service: null, status: "Pending" }]);
  assertEquals(log.rpc[0].fn, "_slot_grid_org");
  assertEquals(log.rpc[0].args.p_org, "ORG-A");
  assertEquals(log.eq.some(([c, v]) => c === "org_id" && v === "ORG-A"), true);
  assertEquals(log.eq.some(([, v]) => v === "ORG-B"), false);
});

Deno.test("randevu özeti: tarih verilmezse işletme saat diliminde bugün; gün sayısı 1-7 ile sınırlı", async () => {
  const { admin, log } = fakeAdmin({});
  await new GetAppointmentsOverviewTool(admin).execute(ctx, { date: "geçersiz", days: 99 });
  assertEquals(log.rpc.length, 7);
  assertEquals(log.rpc[0].args.p_date, "2026-10-04"); // 21:30Z = İstanbul'da 4 Ekim 00:30
  assertEquals(todayInTimezone(ctx.now, "Europe/Istanbul"), "2026-10-04");
  assertEquals(addDaysYmd("2026-10-31", 1), "2026-11-01");
});

Deno.test("bağlı hesaplar: işletme filtresi bağlamdan; iç kimlikler/jetonlar çıktıya sızmaz", async () => {
  const { admin, log } = fakeAdmin({ social: [{ platform: "instagram", username: "u", display_name: "U", is_active: true, needs_reconnection: false, enabled: true, zernio_account_id: "SECRET", zernio_profile_id: "SECRET2", metadata: { token: "x" } }] });
  const r = await new GetConnectedSocialAccountsTool(admin).execute(ctx, { organization_id: "ORG-B" });
  assertEquals(log.schema, ["integration"]);
  assertEquals(log.eq, [["organization_id", "ORG-A"]]);
  assertEquals((r.data as any).accounts, [{ platform: "instagram", username: "u", name: "U", connected: true, needsReconnection: false, enabled: true }]);
  assertEquals(JSON.stringify(r).includes("SECRET"), false);
});

Deno.test("open_screen ve highlight yalnız izin listesindeki değerleri kabul eder", async () => {
  const open = new OpenScreenTool();
  const ok = await open.execute(ctx, { screen: "randevu" });
  assertEquals((ok.data as any).clientAction, { type: "navigate", screen: "randevu", route: "RandevuMain" });
  assertEquals((await open.execute(ctx, { screen: "Admin" })).status, "INVALID_SCREEN");
  assertEquals((await open.execute(ctx, { screen: "__proto__" })).status, "INVALID_SCREEN");
  const hl = new HighlightTool();
  assertEquals((await hl.execute(ctx, { screen: "ai_uretim", target: "share_button" })).status, "SUCCESS");
  assertEquals((await hl.execute(ctx, { screen: "ai_uretim", target: "silme_dugmesi" })).status, "INVALID_TARGET");
  assertEquals((await hl.execute(ctx, { screen: "randevu", target: "share_button" })).status, "INVALID_TARGET");
});

Deno.test("prepare_post_draft: kimlik bağlamdan, metin/platform doğrulanır, sınır uygulanır, yayınlamaz", async () => {
  const { PreparePostDraftTool } = await import("./FlowTools.ts");
  const inserted: any[] = [];
  let activeCount = 0;
  const admin: any = {
    from: () => ({
      select: () => { const b: any = { eq: () => b, gt: () => b, then: (r: any) => r({ count: activeCount, error: null }) }; return b; },
      insert: (row: any) => { inserted.push(row); return { select: () => ({ single: () => Promise.resolve({ data: { id: "D1" }, error: null }) }) }; },
    }),
  };
  const t = new PreparePostDraftTool(admin);
  const c: any = { ...ctx, customerId: "USER-1" };
  const r = await t.execute(c, { text: "  Yaz kampanyası!  ", platforms: ["Instagram", "instagram", "x y", "FACEBOOK"], org_id: "ORG-B", user_id: "U2" });
  assertEquals(r.status, "SUCCESS");
  assertEquals((r.data as any).clientAction, { type: "open_post_draft", draftId: "D1" });
  assertEquals(inserted[0], { org_id: "ORG-A", user_id: "USER-1", caption: "Yaz kampanyası!", platforms: ["instagram", "facebook"] });
  assertEquals((await t.execute(c, { text: "   " })).status, "INVALID_TEXT");
  assertEquals((await t.execute(c, { text: "x".repeat(5001) })).status, "INVALID_TEXT");
  activeCount = 20;
  assertEquals((await t.execute(c, { text: "ok" })).status, "TOO_MANY_DRAFTS");
  assertEquals(inserted.length, 1);
  assertEquals(t.riskLevel, "PREPARE");
});

Deno.test("start_guide yalnız tanımlı rehberleri başlatır ve istemci eylemi döndürür", async () => {
  const { StartGuideTool } = await import("./FlowTools.ts");
  const t = new StartGuideTool();
  const ok = await t.execute(ctx, { guide: "ai_uretim_paylasim" });
  assertEquals((ok.data as any).clientAction, { type: "start_guide", guide: "ai_uretim_paylasim" });
  assertEquals((await t.execute(ctx, { guide: "yok" })).status, "INVALID_GUIDE");
  assertEquals((await t.execute(ctx, { guide: "__proto__" })).status, "INVALID_GUIDE");
});

Deno.test("yardım konusu: anahtar, kelime eşleşmesi, bulunamayan konuda uydurma yok", async () => {
  const t = new GetHelpTopicTool();
  assertEquals(((await t.execute(ctx, { topic: "ai_uretim_paylasim" })).data as any).key, "ai_uretim_paylasim");
  assertEquals(((await t.execute(ctx, { topic: "Instagram'a nasıl paylaşım yaparım, gönderi atmak istiyorum" })).data as any).key, "ai_uretim_paylasim");
  assertEquals((await t.execute(ctx, { topic: "uçak bileti" })).status, "NOT_FOUND");
});

Deno.test("her Flow aracı açık riskLevel taşır ve EXTERNAL_ACTION değildir; ekran anahtarları tutarlı", () => {
  const tools = createFlowTools({});
  assertEquals(tools.map((x) => x.name).sort(), ["get_appointments_overview", "get_connected_social_accounts", "get_customer_history", "get_customers", "get_finance_summary", "get_help_topic", "get_payment_calendar", "open_screen", "start_guide"]); // highlight varsayılan kapalı, agent açar
  assertEquals(createFlowTools({}, { includeHighlight: true }).map((x) => x.name).includes("highlight"), true);
  assertEquals(createFlowTools({}).some((x) => x.name === "prepare_post_draft"), false); // FA3-3'e kadar kapalı
  assertEquals(createFlowTools({}, { includeDrafts: true }).some((x) => x.name === "prepare_post_draft"), true);
  for (const x of createFlowTools({}, { includeHighlight: true, includeDrafts: true })) assertEquals(["READ", "PREPARE"].includes(x.riskLevel as string), true, x.name);
  for (const [k, v] of Object.entries(FLOW_SCREENS)) assertEquals(v.route.length > 0 && k === k.toLowerCase(), true);
});

Deno.test("FlowToolExecutor üzerinden: bu araçlar onay beklemeden çalışır, bekleyen işlem oluşmaz", async () => {
  let inserted = 0;
  const store: PendingActionStore = {
    insert: () => { inserted++; return Promise.reject(new Error("olmamalı")); },
    claim: () => Promise.resolve(null), finish: () => Promise.resolve(), reject: () => Promise.resolve(false),
  };
  const tools = createFlowTools({});
  const reg = { getTool: (n: string) => tools.find((x) => x.name === n) };
  const ex = new FlowToolExecutor(reg, store, { orgId: "ORG-A", userId: "u1", conversationId: null });
  assertEquals((await ex.executeCall(ctx, { name: "open_screen", args: { screen: "anasayfa" } })).status, "SUCCESS");
  assertEquals((await ex.executeCall(ctx, { name: "get_help_topic", args: { topic: "odeme" } })).status, "SUCCESS");
  assertEquals(inserted, 0);
});

Deno.test("open_screen sonucundaki clientAction orkestratör sonucuna taşınır (istemci eylemi)", async () => {
  const { FlowAIOrchestrator } = await import("../FlowAIOrchestrator.ts");
  const tools = createFlowTools({});
  const reg: any = { getTool: (n: string) => tools.find((x) => x.name === n), getAllSchemas: () => [] };
  const store: PendingActionStore = { insert: () => Promise.reject(new Error("olmamalı")), claim: () => Promise.resolve(null), finish: () => Promise.resolve(), reject: () => Promise.resolve(false) };
  const turns: any[] = [
    { type: "tool_calls", calls: [{ name: "open_screen", args: { screen: "randevu" } }] },
    { type: "text", text: "Randevu ekranını açtım." },
  ];
  let i = 0;
  const orch = new FlowAIOrchestrator({
    geminiClient: { generateResponse: () => Promise.resolve(turns[i++]) } as any,
    toolExecutor: new FlowToolExecutor(reg, store, { orgId: "ORG-A", userId: "u1", conversationId: null }),
    toolRegistry: reg,
    promptBuilder: { build: () => "p" },
  });
  const r = await orch.run(ctx, "randevuları aç");
  assertEquals(r.actions.map((a) => a.clientAction), [{ type: "navigate", screen: "randevu", route: "RandevuMain" }]);
});


Deno.test("randevu özeti: doktor/hizmet adlarının dolu gelmesi", async () => {
  const { GetAppointmentsOverviewTool } = await import("./FlowTools.ts");
  const admin: any = {
    rpc: () => Promise.resolve({ data: [], error: null }),
    from: (table: string) => {
      const b: any = {
        select: () => b, eq: () => b, in: () => b, gte: () => b, lte: () => b, order: () => b, limit: () => b,
        then: (res: any) => {
          if (table === 'appointments') {
            return res({ data: [
              { date: "2026-10-04T13:00:00", customer_name: "Ali", status: "Pending", calendar_id: 'c1', service_id: 's1' },
              { date: "2026-10-04T14:00:00", customer_name: "Veli", status: "Pending", calendar_id: 'c2', service_id: 's1' }
            ], error: null });
          }
          if (table === 'calendars') {
            return res({ data: [{id: 'c1', name: 'Dr.A'}, {id: 'c2', name: 'Dr.B'}], error: null });
          }
          if (table === 'business_services') {
            return res({ data: [{id: 's1', name: 'Muayene'}], error: null });
          }
          return res({ data: [], error: null });
        }
      };
      return b;
    }
  };
  const ctx: any = { organizationId: "ORG-A", customerId: "u1", now: new Date("2026-10-03T21:30:00Z"), timezone: "Europe/Istanbul" };
  const r = await new GetAppointmentsOverviewTool(admin).execute(ctx, { date: "2026-10-04", days: 1 });
  const appts = (r.data as any).days[0].appointments;
  if (appts[0].calendar !== 'Dr.A' || appts[0].service !== 'Muayene') throw new Error("isimler çözülemedi 1");
  if (appts[1].calendar !== 'Dr.B' || appts[1].service !== 'Muayene') throw new Error("isimler çözülemedi 2");
});

Deno.test("randevu özeti: takvim sorgusu hata verse bile randevuların dönmesi", async () => {
  const { GetAppointmentsOverviewTool } = await import("./FlowTools.ts");
  const admin: any = {
    rpc: () => Promise.resolve({ data: [], error: null }),
    from: (table: string) => {
      const b: any = {
        select: () => b, eq: () => b, in: () => b, gte: () => b, lte: () => b, order: () => b, limit: () => b,
        then: (res: any) => {
          if (table === 'appointments') {
            return res({ data: [{ date: "2026-10-04T13:00:00", customer_name: "Ali", status: "Pending", calendar_id: 'c1', service_id: 's1' }], error: null });
          }
          if (table === 'calendars') {
            return res({ data: null, error: new Error('db error') });
          }
          if (table === 'business_services') {
            return res({ data: null, error: new Error('db error') });
          }
          return res({ data: [], error: null });
        }
      };
      return b;
    }
  };
  const ctx: any = { organizationId: "ORG-A", customerId: "u1", now: new Date("2026-10-03T21:30:00Z"), timezone: "Europe/Istanbul" };
  const r = await new GetAppointmentsOverviewTool(admin).execute(ctx, { date: "2026-10-04", days: 1 });
  const appts = (r.data as any).days[0].appointments;
  if (appts[0].calendar !== null || appts[0].service !== null) throw new Error("hata durumunda null dönmeli");
  if (r.status !== 'SUCCESS') throw new Error("status SUCCESS dönmeli");
});

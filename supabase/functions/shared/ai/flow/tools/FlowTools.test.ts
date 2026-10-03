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
  assertEquals(day.appointments, [{ time: "13:00", customer: "Ali", status: "Pending" }]);
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

Deno.test("yardım konusu: anahtar, kelime eşleşmesi, bulunamayan konuda uydurma yok", async () => {
  const t = new GetHelpTopicTool();
  assertEquals(((await t.execute(ctx, { topic: "ai_uretim_paylasim" })).data as any).key, "ai_uretim_paylasim");
  assertEquals(((await t.execute(ctx, { topic: "Instagram'a nasıl paylaşım yaparım, gönderi atmak istiyorum" })).data as any).key, "ai_uretim_paylasim");
  assertEquals((await t.execute(ctx, { topic: "uçak bileti" })).status, "NOT_FOUND");
});

Deno.test("her Flow aracı açık riskLevel taşır ve EXTERNAL_ACTION değildir; ekran anahtarları tutarlı", () => {
  const tools = createFlowTools({});
  assertEquals(tools.map((x) => x.name).sort(), ["get_appointments_overview", "get_connected_social_accounts", "get_help_topic", "highlight", "open_screen"]);
  for (const x of tools) assertEquals(["READ", "PREPARE"].includes(x.riskLevel as string), true, x.name);
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

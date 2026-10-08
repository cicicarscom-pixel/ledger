// Çalıştırma: deno test --no-check --allow-all supabase/functions/shared/ai/flow/tools/DataTools.test.ts
// Müşteri/finans/ödeme takvimi araçları: işletme yalnız bağlamdan, hazır biçimli tutar, hata dayanıklılığı.
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { GetCustomerHistoryTool, GetCustomersTool, GetFinanceSummaryTool, GetPaymentCalendarTool, createDataTools, formatTry } from "./DataTools.ts";
import { createFlowTools } from "./FlowTools.ts";

const ctx: any = { organizationId: "ORG-A", customerId: "u1", now: new Date("2026-10-08T09:00:00Z"), timezone: "Europe/Istanbul", channel: { source: "flow_ai", platform: "flow_ai", supportsInteractiveButtons: false } };

function fakeRpcAdmin(handlers: Record<string, (args: any) => { data?: any; error?: any }>) {
  const calls: { fn: string; args: any }[] = [];
  const admin: any = {
    rpc: (fn: string, args: any) => {
      calls.push({ fn, args });
      const h = handlers[fn];
      const r = h ? h(args) : { data: [], error: null };
      return Promise.resolve({ data: r.data ?? null, error: r.error ?? null });
    },
  };
  return { admin, calls };
}

const CUSTOMERS = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Ahmet Yavuz", phone_display: "+90 532 111 22 33", notes: "Alerjisi var", total: 3, upcoming: 1, past: 2, cancelled: 0, next_starts_at: "2026-10-08T09:30:00Z", next_doctor: "Dr.Salih GÜNEY", next_request: "Kontrol", last_visit_at: "2026-09-01T10:00:00Z", last_request: "Dolgu" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Cengiz Ayvaz", phone_display: "+90 533 444 55 66", notes: null, total: 1, upcoming: 1, past: 0, cancelled: 0, next_starts_at: "2026-10-08T11:30:00Z", next_doctor: "Dr.Ediz HUN", next_request: null, last_visit_at: null, last_request: null },
  { id: "33333333-3333-4333-8333-333333333333", name: "Ahmet Kaya", phone_display: "+90 534 777 88 99", notes: null, total: 0, upcoming: 0, past: 0, cancelled: 0, next_starts_at: null, next_doctor: null, next_request: null, last_visit_at: null, last_request: null },
];

Deno.test("formatTry: kuruş varsa 2 hane, yoksa hiç; yuvarlama yok", () => {
  assertEquals(formatTry(173999).replace(/ /g, " "), "1.739,99 ₺");
  assertEquals(formatTry(531000).replace(/ /g, " "), "5.310 ₺");
  assertEquals(formatTry(5).replace(/ /g, " "), "0,05 ₺");
  assertEquals(formatTry(0).replace(/ /g, " "), "0 ₺");
});

Deno.test("müşteriler: işletme yalnız bağlamdan; model argümanı yok sayılır; ada göre arama (Türkçe harf duyarsız)", async () => {
  const { admin, calls } = fakeRpcAdmin({ _get_customers_org: () => ({ data: CUSTOMERS }) });
  const r = await new GetCustomersTool(admin).execute(ctx, { search: "AHMET", orgId: "ORG-B", p_org: "ORG-B" });
  assertEquals(r.status, "SUCCESS");
  assertEquals(calls.length, 1);
  assertEquals(calls[0].fn, "_get_customers_org");
  assertEquals(calls[0].args, { p_org: "ORG-A" });
  const d = r.data as any;
  assertEquals(d.totalMatching, 2);
  assertEquals(d.customers.map((c: any) => c.name), ["Ahmet Yavuz", "Ahmet Kaya"]);
  assertEquals(d.customers[0].next.doctor, "Dr.Salih GÜNEY");
  assertEquals(d.customers[0].phone, "+90 532 111 22 33");
});

Deno.test("müşteriler: ham WhatsApp telefon biçimi çıktıya sızmaz; limit uygulanır", async () => {
  const rows = CUSTOMERS.map((c) => ({ ...c, phone: "905321112233@c.us" }));
  const { admin } = fakeRpcAdmin({ _get_customers_org: () => ({ data: rows }) });
  const r = await new GetCustomersTool(admin).execute(ctx, { limit: 1 });
  const d = r.data as any;
  assertEquals(d.customers.length, 1);
  assertEquals(JSON.stringify(r).includes("@c.us"), false);
});

Deno.test("müşteriler: veritabanı hatasında ERROR döner, iç hata metni sızmaz", async () => {
  const { admin } = fakeRpcAdmin({ _get_customers_org: () => ({ error: { message: "secret db detail" } }) });
  const r = await new GetCustomersTool(admin).execute(ctx, {});
  assertEquals(r.status, "ERROR");
  assertEquals(JSON.stringify(r).includes("secret"), false);
});

Deno.test("müşteri geçmişi: tek eşleşmede randevular gelir; işletme ve müşteri kimliği doğru geçer", async () => {
  const { admin, calls } = fakeRpcAdmin({
    _get_customers_org: () => ({ data: CUSTOMERS }),
    _get_customer_appointments_org: () => ({ data: [{ id: "a1", starts_at: "2026-10-08T09:30:00Z", doctor: "Dr.Salih GÜNEY", request: "Kontrol", status: "Approved", source: "whatsapp" }] }),
  });
  const r = await new GetCustomerHistoryTool(admin).execute(ctx, { customer_name: "cengiz" });
  assertEquals(r.status, "SUCCESS");
  assertEquals(calls[1].fn, "_get_customer_appointments_org");
  assertEquals(calls[1].args, { p_org: "ORG-A", p_customer_id: "22222222-2222-4222-8222-222222222222" });
  assertEquals((r.data as any).appointments[0].doctor, "Dr.Salih GÜNEY");
});

Deno.test("müşteri geçmişi: bulunamayan ve birden fazla eşleşen isim", async () => {
  const { admin } = fakeRpcAdmin({ _get_customers_org: () => ({ data: CUSTOMERS }) });
  const tool = new GetCustomerHistoryTool(admin);
  assertEquals((await tool.execute(ctx, { customer_name: "Zeynep" })).status, "NOT_FOUND");
  const amb = await tool.execute(ctx, { customer_name: "ahmet" });
  assertEquals(amb.status, "AMBIGUOUS");
  assertEquals((amb.data as any).candidates.length, 2);
  assertEquals((await tool.execute(ctx, { customer_name: "" })).status, "INVALID_ARGS");
});

Deno.test("finans özeti: varsayılan dönem içinde bulunulan ay (işletme saat dilimi); tutarlar hazır biçimli; net hesaplanır", async () => {
  const { admin, calls } = fakeRpcAdmin({
    _get_finance_summary_org: () => ({ data: { status: "SUCCESS", income: 1000050, expense: 400000, receivable: 250000, payable: 120000, overdue_count: 2, overdue_amount: 90000 } }),
  });
  const r = await new GetFinanceSummaryTool(admin).execute(ctx, { orgId: "ORG-B" });
  assertEquals(calls[0].args, { p_org: "ORG-A", p_from: "2026-10-01", p_to: "2026-10-31" });
  const d = r.data as any;
  const nb = (s: string) => s.replace(/ /g, " ");
  assertEquals(nb(d.income), "10.000,50 ₺");
  assertEquals(nb(d.net), "6.000,50 ₺");
  assertEquals(d.overdue.count, 2);
});

Deno.test("finans özeti: geçersiz/aşırı geniş aralık reddedilir; UNAUTHORIZED hata sayılır", async () => {
  const { admin } = fakeRpcAdmin({ _get_finance_summary_org: () => ({ data: { status: "UNAUTHORIZED" } }) });
  const tool = new GetFinanceSummaryTool(admin);
  assertEquals((await tool.execute(ctx, { from: "2026-12-01", to: "2026-01-01" })).status, "INVALID_ARGS");
  assertEquals((await tool.execute(ctx, { from: "2020-01-01", to: "2026-01-01" })).status, "INVALID_ARGS");
  assertEquals((await tool.execute(ctx, {})).status, "ERROR");
});

Deno.test("ödeme takvimi: varsayılan bugün+30 gün; yalnız ödenmemişler filtresi; toplamlar hazır biçimli", async () => {
  const rows = [
    { type: "expense", title: "Kira", amount_minor: 2500000, day: "2026-10-10", payment_status: "pending", is_overdue: false, category: "kira" },
    { type: "income", title: "Tahsilat", amount_minor: 100000, day: "2026-10-12", payment_status: "paid", is_overdue: false, category: null },
    { type: "expense", title: "Elektrik", amount_minor: 45050, day: "2026-10-01", payment_status: "pending", is_overdue: true, category: null },
  ];
  const { admin, calls } = fakeRpcAdmin({ _get_payment_calendar_org: () => ({ data: rows }) });
  const all = await new GetPaymentCalendarTool(admin).execute(ctx, {});
  assertEquals(calls[0].args, { p_org: "ORG-A", p_from: "2026-10-08", p_to: "2026-11-07" });
  assertEquals((all.data as any).count, 3);
  const unpaid = await new GetPaymentCalendarTool(admin).execute(ctx, { only_unpaid: true });
  const d = unpaid.data as any;
  assertEquals(d.count, 2);
  assertEquals(d.entries.some((e: any) => e.overdue), true);
  assertEquals(d.entries[0].kind, "gider");
  assertEquals(d.totalExpense.replace(/ /g, " "), "25.450,50 ₺");
});

Deno.test("ödeme takvimi: 92 günden geniş aralık reddedilir", async () => {
  const { admin } = fakeRpcAdmin({});
  assertEquals((await new GetPaymentCalendarTool(admin).execute(ctx, { from: "2026-01-01", to: "2026-12-31" })).status, "INVALID_ARGS");
});

Deno.test("veri araçları: hepsi READ, createFlowTools'a kayıtlı, adlar çakışmaz", () => {
  const data = createDataTools({});
  assertEquals(data.map((t) => t.riskLevel), ["READ", "READ", "READ", "READ"]);
  const all = createFlowTools({}).map((t) => t.name);
  for (const t of data) assertEquals(all.includes(t.name), true);
  assertEquals(new Set(all).size, all.length);
});

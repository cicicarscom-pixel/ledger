import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { localToUtcIso, PublishPostTool, sha256Hex } from "./PublishTools.ts";
import { FlowToolExecutor, approveAction } from "../FlowAIGate.ts";

const ORG = "11111111-1111-1111-1111-111111111111";
const USER = "22222222-2222-2222-2222-222222222222";
const DRAFT = "33333333-3333-3333-3333-333333333333";
const ctx: any = { organizationId: ORG, customerId: USER, timezone: "Europe/Istanbul", now: new Date() };

/** Minimal bellek içi PostgREST taklidi: select/eq/gt/maybeSingle/update. */
function fakeAdmin(init: { drafts: any[]; accounts: any[] }) {
  const tables: Record<string, any[]> = { flow_ai_post_drafts: init.drafts, social_accounts: init.accounts };
  const make = (name: string) => {
    let rows = tables[name]; let patch: any = null; const filters: ((r: any) => boolean)[] = [];
    const run = () => {
      const hit = rows.filter((r) => filters.every((f) => f(r)));
      if (patch) hit.forEach((r) => Object.assign(r, patch));
      return hit;
    };
    const b: any = {
      select: () => b,
      update: (p: any) => { patch = p; return b; },
      eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return b; },
      gt: (c: string, v: string) => { filters.push((r) => r[c] > v); return b; },
      maybeSingle: () => Promise.resolve({ data: run()[0] ?? null, error: null }),
      then: (res: any) => Promise.resolve({ data: run(), error: null }).then(res),
    };
    return b;
  };
  return { from: make, schema: () => ({ from: make }) };
}

const draft = (over: any = {}) => ({ id: DRAFT, org_id: ORG, user_id: USER, caption: "Merhaba dünya", platforms: ["facebook"], status: "draft", expires_at: "2099-01-01T00:00:00Z", ...over });
const fbConnected = [{ organization_id: ORG, platform: "facebook", is_active: true, needs_reconnection: false }];

Deno.test("localToUtcIso: İstanbul, LA, DST boşluğu, biçim", () => {
  assertEquals(localToUtcIso("2026-10-10 18:00", "Europe/Istanbul"), "2026-10-10T15:00:00.000Z");
  assertEquals(localToUtcIso("2026-10-10 18:00", "America/Los_Angeles"), "2026-10-11T01:00:00.000Z");
  assertEquals(localToUtcIso("2026-03-08 02:30", "America/Los_Angeles"), null);
  assertEquals(localToUtcIso("yarın 18:00", "UTC"), null);
  assertEquals(localToUtcIso("2026-13-01 10:00", "UTC"), null);
});

Deno.test("prepareApproval: medya platformu reddedilir", async () => {
  const t = new PublishPostTool(fakeAdmin({ drafts: [draft()], accounts: fbConnected }), async () => ({}));
  const r: any = await t.prepareApproval(ctx, { draftId: DRAFT, platforms: ["instagram"] });
  assertEquals(r.ok, false);
  assertEquals(r.result.status, "MEDIA_REQUIRED");
});

Deno.test("prepareApproval: başkasının taslağı / kullanılmış / bağlı olmayan hesap / uzun metin", async () => {
  const other = new PublishPostTool(fakeAdmin({ drafts: [draft({ user_id: "99999999-9999-9999-9999-999999999999" })], accounts: fbConnected }), async () => ({}));
  assertEquals(((await other.prepareApproval(ctx, { draftId: DRAFT })) as any).result.status, "DRAFT_NOT_FOUND");
  const used = new PublishPostTool(fakeAdmin({ drafts: [draft({ status: "used" })], accounts: fbConnected }), async () => ({}));
  assertEquals(((await used.prepareApproval(ctx, { draftId: DRAFT })) as any).result.status, "DRAFT_ALREADY_USED");
  const noAcc = new PublishPostTool(fakeAdmin({ drafts: [draft()], accounts: [] }), async () => ({}));
  assertEquals(((await noAcc.prepareApproval(ctx, { draftId: DRAFT })) as any).result.status, "ACCOUNT_NOT_CONNECTED");
  const long = new PublishPostTool(fakeAdmin({ drafts: [draft({ caption: "x".repeat(281), platforms: ["x"] })], accounts: [{ organization_id: ORG, platform: "twitter", is_active: true, needs_reconnection: false }] }), async () => ({}));
  assertEquals(((await long.prepareApproval(ctx, { draftId: DRAFT })) as any).result.status, "TEXT_TOO_LONG");
});

Deno.test("prepareApproval: zamanlama geçmiş / çok yakın reddedilir; geçerli zaman UTC'ye çevrilir", async () => {
  const t = new PublishPostTool(fakeAdmin({ drafts: [draft()], accounts: fbConnected }), async () => ({}));
  assertEquals(((await t.prepareApproval(ctx, { draftId: DRAFT, scheduledLocal: "2020-01-01 10:00" })) as any).result.status, "SCHEDULE_IN_PAST");
  const d = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10); // 30 gün sonrası (İstanbul'da DST yok)
  const r: any = await t.prepareApproval(ctx, { draftId: DRAFT, scheduledLocal: `${d} 18:00` });
  assertEquals(r.ok, true);
  assertEquals(r.args.scheduledFor, `${d}T15:00:00.000Z`);
  assertEquals(r.preview.mode, "schedule");
  assertEquals(((await t.prepareApproval(ctx, { draftId: DRAFT, scheduledLocal: "2099-06-01 18:00" })) as any).result.status, "SCHEDULE_TOO_FAR");
});

Deno.test("uçtan uca: executor PENDING_APPROVAL verir, yayınlamaz; onaydan sonra yayınlar, ikinci onay yayınlamaz", async () => {
  const admin = fakeAdmin({ drafts: [draft()], accounts: fbConnected });
  const published: any[] = [];
  const tool = new PublishPostTool(admin, async (org, p) => { published.push([org, p]); return {}; });
  const registry = { getTool: (n: string) => (n === "publish_post" ? tool : undefined) } as any;
  let saved: any = null;
  const store: any = {
    insert: async (row: any) => { saved = { ...row, id: "act1", status: "pending", expires_at: "2099-01-01" }; return saved; },
    claim: async () => { if (!saved || saved.status !== "pending") return null; saved.status = "approved"; return saved; },
    finish: async (_id: string, status: string) => { saved.status = status; },
  };
  const exec = new FlowToolExecutor(registry, store, { orgId: ORG, userId: USER, conversationId: null });
  const r: any = await exec.executeCall(ctx, { name: "publish_post", args: { draftId: DRAFT } } as any);
  assertEquals(r.status, "PENDING_APPROVAL");
  assertEquals(published.length, 0); // onaysız yayın YOK
  assertEquals(saved.args.captionSha, await sha256Hex("Merhaba dünya"));
  assertEquals(typeof saved.preview.description, "string");

  const ok = await approveAction({ registry, store }, { orgId: ORG, userId: USER, context: ctx }, "act1", saved.payload_hash);
  assertEquals(ok.status, "EXECUTED");
  assertEquals(published.length, 1);
  assertEquals(published[0][1].publishNow, true);
  assertEquals(published[0][1].platforms, ["facebook"]);

  saved.status = "pending"; // aynı kaydı tekrar onaylamaya zorla: taslak 'used' olduğu için yayınlanmamalı
  const again = await approveAction({ registry, store }, { orgId: ORG, userId: USER, context: ctx }, "act1", saved.payload_hash);
  assertEquals(again.status, "FAILED");
  assertEquals(published.length, 1);
});

Deno.test("onaydan sonra taslak değişirse yayınlanmaz", async () => {
  const d = draft();
  const tool = new PublishPostTool(fakeAdmin({ drafts: [d], accounts: fbConnected }), async () => { throw new Error("çağrılmamalı"); });
  const prep: any = await tool.prepareApproval(ctx, { draftId: DRAFT });
  d.caption = "DEĞİŞTİRİLDİ";
  const r = await tool.execute(ctx, prep.args);
  assertEquals(r.status, "DRAFT_CHANGED");
});

Deno.test("Zernio hatasında taslak yeniden açılır", async () => {
  const d = draft();
  const tool = new PublishPostTool(fakeAdmin({ drafts: [d], accounts: fbConnected }), async () => { throw new Error("boom"); });
  const prep: any = await tool.prepareApproval(ctx, { draftId: DRAFT });
  const r = await tool.execute(ctx, prep.args);
  assertEquals(r.status, "PUBLISH_FAILED");
  assertEquals(d.status, "draft");
});

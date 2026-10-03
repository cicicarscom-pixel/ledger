// Çalıştırma: deno test --no-check --allow-all supabase/functions/shared/ai/flow/FlowAIGate.test.ts
// FA1-2: onaysız EXTERNAL_ACTION çalışmaz; onay atomik, tek seferlik ve içerik doğrulamalıdır.
import { assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  FlowToolExecutor, approveAction, hashPayload, startOfLocalDayIso,
  type NewPendingAction, type PendingActionRow, type PendingActionStore,
} from "./FlowAIGate.ts";
import { FlowAIOrchestrator } from "./FlowAIOrchestrator.ts";
import type { ITool } from "../tools/types.ts";

class FakeStore implements PendingActionStore {
  rows = new Map<string, PendingActionRow>();
  private n = 0;
  insert(row: NewPendingAction): Promise<PendingActionRow> {
    const r: PendingActionRow = { ...row, id: `a${++this.n}`, status: "pending", expires_at: new Date(Date.now() + 60_000).toISOString() };
    this.rows.set(r.id, r);
    return Promise.resolve(r);
  }
  claim(id: string, orgId: string, userId: string): Promise<PendingActionRow | null> {
    const r = this.rows.get(id);
    if (!r || r.org_id !== orgId || r.user_id !== userId || r.status !== "pending" || new Date(r.expires_at) <= new Date()) return Promise.resolve(null);
    r.status = "approved";
    return Promise.resolve(r);
  }
  finish(id: string, status: "executed" | "failed", _result: unknown): Promise<void> {
    this.rows.get(id)!.status = status;
    return Promise.resolve();
  }
  reject(id: string, orgId: string, userId: string): Promise<boolean> {
    const r = this.rows.get(id);
    if (!r || r.org_id !== orgId || r.user_id !== userId || r.status !== "pending") return Promise.resolve(false);
    r.status = "rejected";
    return Promise.resolve(true);
  }
}

function tool(name: string, riskLevel: ITool["riskLevel"], calls: Record<string, unknown>[]): ITool {
  return {
    name, description: name, schema: {}, riskLevel,
    execute: (_ctx, args) => { calls.push(args); return Promise.resolve({ status: "SUCCESS", data: { ok: true } }); },
  };
}
const registryOf = (...tools: ITool[]) => ({ getTool: (n: string) => tools.find((t) => t.name === n) });
const ctx: any = { organizationId: "org1", customerId: "u1", now: new Date(), timezone: "Europe/Istanbul", channel: { source: "flow_ai", platform: "flow_ai", supportsInteractiveButtons: false } };
const who = { orgId: "org1", userId: "u1", conversationId: "c1" };

Deno.test("READ ve PREPARE araçları doğrudan çalışır, bekleyen işlem oluşmaz", async () => {
  const calls: Record<string, unknown>[] = [];
  const store = new FakeStore();
  const ex = new FlowToolExecutor(registryOf(tool("oku", "READ", calls), tool("hazirla", "PREPARE", calls)), store, who);
  assertEquals((await ex.executeCall(ctx, { name: "oku", args: { a: 1 } })).status, "SUCCESS");
  assertEquals((await ex.executeCall(ctx, { name: "hazirla", args: {} })).status, "SUCCESS");
  assertEquals(calls.length, 2);
  assertEquals(store.rows.size, 0);
});

Deno.test("EXTERNAL_ACTION çalıştırılmaz, bekleyen işlem olarak kaydedilir", async () => {
  const calls: Record<string, unknown>[] = [];
  const store = new FakeStore();
  const ex = new FlowToolExecutor(registryOf(tool("yayinla", "EXTERNAL_ACTION", calls)), store, who);
  const r = await ex.executeCall(ctx, { name: "yayinla", args: { text: "merhaba" } });
  assertEquals(r.status, "PENDING_APPROVAL");
  assertEquals(calls.length, 0);
  assertEquals(store.rows.size, 1);
  assertEquals((r.data as any).payloadHash, await hashPayload("yayinla", { text: "merhaba" }));
});

Deno.test("riski belirtilmeyen araç EXTERNAL_ACTION sayılır (fail-closed)", async () => {
  const calls: Record<string, unknown>[] = [];
  const store = new FakeStore();
  const ex = new FlowToolExecutor(registryOf(tool("belirsiz", undefined, calls)), store, who);
  assertEquals((await ex.executeCall(ctx, { name: "belirsiz", args: {} })).status, "PENDING_APPROVAL");
  assertEquals(calls.length, 0);
});

Deno.test("onay: tam bir kez çalışır; ikinci onay reddedilir", async () => {
  const calls: Record<string, unknown>[] = [];
  const store = new FakeStore();
  const reg = registryOf(tool("yayinla", "EXTERNAL_ACTION", calls));
  const ex = new FlowToolExecutor(reg, store, who);
  const pending = (await ex.executeCall(ctx, { name: "yayinla", args: { text: "x" } })).data as any;
  const first = await approveAction({ registry: reg, store }, { ...who, context: ctx }, pending.actionId, pending.payloadHash);
  assertEquals(first.status, "EXECUTED");
  const second = await approveAction({ registry: reg, store }, { ...who, context: ctx }, pending.actionId, pending.payloadHash);
  assertEquals(second.status, "NOT_APPROVABLE");
  assertEquals(calls.length, 1);
});

Deno.test("kullanıcının gördüğü içerik ile kayıt uyuşmazsa ya da kayıt değiştirildiyse çalışmaz", async () => {
  const calls: Record<string, unknown>[] = [];
  const store = new FakeStore();
  const reg = registryOf(tool("yayinla", "EXTERNAL_ACTION", calls));
  const ex = new FlowToolExecutor(reg, store, who);
  const p1 = (await ex.executeCall(ctx, { name: "yayinla", args: { text: "a" } })).data as any;
  assertEquals((await approveAction({ registry: reg, store }, { ...who, context: ctx }, p1.actionId, "yanlis-hash")).status, "PAYLOAD_CHANGED");
  const p2 = (await ex.executeCall(ctx, { name: "yayinla", args: { text: "b" } })).data as any;
  store.rows.get(p2.actionId)!.args = { text: "DEĞİŞTİRİLDİ" };
  assertEquals((await approveAction({ registry: reg, store }, { ...who, context: ctx }, p2.actionId, p2.payloadHash)).status, "PAYLOAD_CHANGED");
  assertEquals(calls.length, 0);
});

Deno.test("başka kullanıcı/işletme onaylayamaz; süresi dolan ve reddedilen onaylanamaz", async () => {
  const calls: Record<string, unknown>[] = [];
  const store = new FakeStore();
  const reg = registryOf(tool("yayinla", "EXTERNAL_ACTION", calls));
  const ex = new FlowToolExecutor(reg, store, who);
  const p = (await ex.executeCall(ctx, { name: "yayinla", args: {} })).data as any;
  assertEquals((await approveAction({ registry: reg, store }, { orgId: "org2", userId: "u1", context: ctx }, p.actionId, p.payloadHash)).status, "NOT_APPROVABLE");
  assertEquals((await approveAction({ registry: reg, store }, { orgId: "org1", userId: "u2", context: ctx }, p.actionId, p.payloadHash)).status, "NOT_APPROVABLE");
  store.rows.get(p.actionId)!.expires_at = new Date(Date.now() - 1000).toISOString();
  assertEquals((await approveAction({ registry: reg, store }, { ...who, context: ctx }, p.actionId, p.payloadHash)).status, "NOT_APPROVABLE");
  const q = (await ex.executeCall(ctx, { name: "yayinla", args: { n: 2 } })).data as any;
  assertEquals(await store.reject(q.actionId, "org1", "u1"), true);
  assertEquals((await approveAction({ registry: reg, store }, { ...who, context: ctx }, q.actionId, q.payloadHash)).status, "NOT_APPROVABLE");
  assertEquals(calls.length, 0);
});

Deno.test("özet anahtar sırasından bağımsız, içerikten bağımlı", async () => {
  assertEquals(await hashPayload("t", { a: 1, b: { c: 2, d: 3 } }), await hashPayload("t", { b: { d: 3, c: 2 }, a: 1 }));
  assertNotEquals(await hashPayload("t", { a: 1 }), await hashPayload("t", { a: 2 }));
  assertNotEquals(await hashPayload("t", { a: 1 }), await hashPayload("u", { a: 1 }));
});

Deno.test("günlük sınır penceresi: işletme saat diliminde gün başlangıcı", () => {
  assertEquals(startOfLocalDayIso(new Date("2026-10-03T21:30:00Z"), "Europe/Istanbul"), "2026-10-03T21:00:00.000Z");
  assertEquals(startOfLocalDayIso(new Date("2026-10-03T10:00:00Z"), "Europe/Istanbul"), "2026-10-02T21:00:00.000Z");
});

Deno.test("uçtan uca: model EXTERNAL_ACTION çağırır → çalışmaz, yanıt metni yine döner", async () => {
  const calls: Record<string, unknown>[] = [];
  const store = new FakeStore();
  const reg: any = { ...registryOf(tool("yayinla", "EXTERNAL_ACTION", calls)), getAllSchemas: () => [] };
  const turns: any[] = [
    { type: "tool_calls", calls: [{ name: "yayinla", args: { text: "selam" } }] },
    { type: "text", text: "Yayın için onayını bekliyorum." },
  ];
  let i = 0;
  const orch = new FlowAIOrchestrator({
    geminiClient: { generateResponse: () => Promise.resolve(turns[i++]) } as any,
    toolExecutor: new FlowToolExecutor(reg, store, who),
    toolRegistry: reg,
    promptBuilder: { build: () => "p" },
  });
  const r = await orch.run(ctx, "bunu paylaş");
  assertEquals(r.text, "Yayın için onayını bekliyorum.");
  assertEquals(r.actions.map((a) => a.status), ["PENDING_APPROVAL"]);
  assertEquals(calls.length, 0);
  assertEquals(store.rows.size, 1);
});

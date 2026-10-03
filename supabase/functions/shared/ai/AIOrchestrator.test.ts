// Çalıştırma: deno test --no-check --allow-all supabase/functions/shared/ai/AIOrchestrator.test.ts
// FA0-2: döngü BaseOrchestrator'a taşındı; WhatsApp davranışı (randevu korumaları) aynı kalmalı.
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { AIOrchestrator } from "./AIOrchestrator.ts";

type Turn = { type: "text"; text: string } | { type: "tool_calls"; calls: { name: string; args: Record<string, unknown> }[] };

function make(turns: Turn[], toolResult: any = { status: "SUCCESS" }) {
  const sent: any[][] = [];
  let i = 0;
  const orch = new AIOrchestrator({
    geminiClient: {
      generateResponse: (_s: string, messages: any[]) => {
        sent.push(messages.map(m => m));
        return Promise.resolve(turns[Math.min(i++, turns.length - 1)]);
      },
    } as any,
    toolExecutor: { executeCall: () => Promise.resolve(toolResult) } as any,
    toolRegistry: { getAllSchemas: () => [] } as any,
    promptBuilder: { build: () => "prompt" } as any,
  });
  return { orch, sent, calls: () => i };
}
const ctx: any = { organizationId: "o", customerId: "c", now: new Date(), timezone: "Europe/Istanbul", channel: { source: "whatsapp", platform: "whatsapp", supportsInteractiveButtons: true } };
const SLOTS = { type: "tool_calls", calls: [{ name: "list_available_slots", args: {} }] } as Turn;
const BOOK = { type: "tool_calls", calls: [{ name: "create_pending_appointment", args: {} }] } as Turn;

Deno.test("selamlaşma metni olduğu gibi geçer", async () => {
  const { orch } = make([{ type: "text", text: "Merhaba, nasıl yardımcı olabilirim?" }]);
  const r = await orch.run(ctx, "selam");
  assertEquals(r.text, "Merhaba, nasıl yardımcı olabilirim?");
  assertEquals(r.actions, []);
  assertEquals(r.usage, { rounds: 1, toolCalls: 0 });
  assertEquals(await make([{ type: "text", text: "Merhaba" }]).orch.handleMessage(ctx, "selam"), "Merhaba");
});

Deno.test("araç SUCCESS dönmeden 'oluşturuldu' iddiası engellenir, araçtan sonra geçer", async () => {
  const { orch } = make([
    { type: "text", text: "Randevunuz başarıyla oluşturulmuştur." },
    BOOK,
    { type: "text", text: "Randevunuz başarıyla oluşturulmuştur." },
  ]);
  const r = await orch.run(ctx, "randevu al");
  assertEquals(r.text, "Randevunuz başarıyla oluşturulmuştur.");
  assertEquals(r.actions, [{ name: "create_pending_appointment", args: {}, status: "SUCCESS" }]);
  assertEquals(r.usage, { rounds: 3, toolCalls: 1 });
});

Deno.test("müsaitlik kontrolü yapılmadan 'dolu' iddiası: 2 düzeltme sonra tarafsız yanıt", async () => {
  const { orch, calls } = make([{ type: "text", text: "Maalesef o saat dolu." }]);
  const r = await orch.run(ctx, "yarın 15:00");
  assertEquals(r.text, "Müsaitlik durumunu şu an doğrulayamadım. İstediğiniz gün ve saati bir kez daha yazar mısınız? Hemen kontrol edeyim.");
  assertEquals(calls(), 3);
});

Deno.test("list_available_slots çağrıldıysa 'dolu' sözü geçer", async () => {
  const { orch } = make([SLOTS, { type: "text", text: "Maalesef o saat dolu." }]);
  assertEquals((await orch.run(ctx, "yarın 15:00")).text, "Maalesef o saat dolu.");
});

Deno.test("hiç düzelmeyen iddia son turda güvenli yanıt verir; MAX tur aşımı netleştirme ister", async () => {
  const claim = make([{ type: "text", text: "Randevunuz iptal edildi." }]);
  assertEquals((await claim.orch.run(ctx, "x")).text,
    "Talebinizi aldım ancak şu an işlemi tamamlayamadım. Lütfen mesajınızı bir kez daha gönderir misiniz?");
  assertEquals(claim.calls(), 6);
  const loop = make([SLOTS]);
  assertEquals((await loop.orch.run(ctx, "x")).text,
    "Talebinizi tam olarak tamamlayamadım. Randevu istediğiniz gün ve saati bir kez daha yazar mısınız?");
});

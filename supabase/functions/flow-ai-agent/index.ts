import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { GeminiClient } from "../shared/infrastructure/clients/GeminiClient.ts";
import { ToolRegistry } from "../shared/ai/tools/ToolRegistry.ts";
import { FlowAIOrchestrator } from "../shared/ai/flow/FlowAIOrchestrator.ts";
import { FlowPromptBuilder } from "../shared/ai/flow/FlowPromptBuilder.ts";
import { DEFAULT_DAILY_MESSAGE_LIMIT, FlowToolExecutor, approveAction, startOfLocalDayIso } from "../shared/ai/flow/FlowAIGate.ts";
import { SupabasePendingActionStore } from "../shared/ai/flow/SupabasePendingActionStore.ts";
import { createFlowTools } from "../shared/ai/flow/tools/FlowTools.ts";
import { createZernioAnalyticsCaller } from "../shared/ai/flow/tools/SocialAnalyticsTools.ts";
import { createZernioPublishCaller } from "../shared/ai/flow/tools/PublishTools.ts";
import { isAccountBlocked } from "../shared/admin/wahaSession.ts";
import { buildSuggestions } from "../shared/ai/flow/SuggestionService.ts";
import { addDaysYmd, todayInTimezone } from "../shared/ai/flow/tools/FlowTools.ts";
import { compactBestTimes, summarizeAccounts } from "../shared/ai/flow/tools/SocialAnalyticsTools.ts";
import { CaptionService, DEFAULT_DAILY_CAPTION_LIMIT } from "../shared/ai/flow/CaptionService.ts";
import { PersonaRepository } from "../shared/ai/persona/PersonaRepository.ts";
import { PersonaService } from "../shared/ai/persona/PersonaService.ts";
import type { AIContext } from "../shared/ai/types.ts";

// Flow AI (işletme sahibinin asistanı) — verify_jwt AÇIK. Kimlik yalnız JWT'den çözülür; istemciden org/kullanıcı kimliği alınmaz.
// Araçlar FlowTools.ts (FA1-3); dış etkili (EXTERNAL_ACTION) araçlar yalnız FlowAIGate onay kapısından geçer.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const DAILY_LIMIT = Number(Deno.env.get("FLOW_AI_DAILY_LIMIT")) || DEFAULT_DAILY_MESSAGE_LIMIT;
const MODEL = "gemini-2.5-flash";
const HISTORY_LIMIT = 20;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const personaService = new PersonaService(new PersonaRepository(admin));
const captionService = new CaptionService({
  gemini: new GeminiClient(), admin, startOfDayIso: startOfLocalDayIso,
  dailyLimit: Number(Deno.env.get("FLOW_CAPTION_DAILY_LIMIT")) || DEFAULT_DAILY_CAPTION_LIMIT,
  resolvePersona: (orgId) => personaService.resolveForMerchant(orgId, "production"),
});
const zernioAnalyticsCaller = createZernioAnalyticsCaller(SUPABASE_URL, SERVICE_KEY);
// READ/PREPARE araçlar + onay kapısından geçen publish_post (EXTERNAL_ACTION).
// İstemciye göre iki kayıt defteri: mobilde vurgu/rehber/taslak var, webde yok (web istemcisi `client: "web"` gönderir).
const zernioPublishCaller = createZernioPublishCaller(SUPABASE_URL, SERVICE_KEY);
const registries = {
  mobile: new ToolRegistry(createFlowTools(admin, { includeHighlight: true, includeDrafts: true, captionService,
    zernioAnalytics: zernioAnalyticsCaller, zernioPublish: zernioPublishCaller })),
  web: new ToolRegistry(createFlowTools(admin, { includeGuide: false, includeHighlight: false, includeDrafts: false, captionService,
    zernioAnalytics: zernioAnalyticsCaller, zernioPublish: zernioPublishCaller })),
};

async function resolveOrg(userId: string): Promise<{ id: string; timezone: string } | null> {
  const { data: owned } = await admin.from("organizations").select("id, timezone").eq("owner_id", userId).order("created_at").limit(1).maybeSingle();
  if (owned) return { id: owned.id, timezone: owned.timezone ?? "Europe/Istanbul" };
  const { data: member } = await admin.from("organization_members").select("organization_id").eq("user_id", userId).order("created_at").limit(1).maybeSingle();
  if (!member) return null;
  const { data: org } = await admin.from("organizations").select("id, timezone").eq("id", member.organization_id).maybeSingle();
  return org ? { id: org.id, timezone: org.timezone ?? "Europe/Istanbul" } : null;
}

function buildContext(orgId: string, userId: string, timezone: string, client: "mobile" | "web"): AIContext {
  return {
    organizationId: orgId,
    customerId: userId, // Flow AI'da konuşan kişi işletme kullanıcısıdır
    now: new Date(),
    timezone,
    executionMode: "production",
    channel: { source: "flow_ai", platform: client === "web" ? "flow_ai_web" : "flow_ai", supportsInteractiveButtons: false },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "UNAUTHORIZED" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "UNAUTHORIZED" }, 401);
    const userId = userData.user.id;

    const org = await resolveOrg(userId);
    if (!org) return json({ error: "ORGANIZATION_NOT_FOUND" }, 404);

    // Askıya alınmış / banlanmış hesap Flow AI'ı (sohbet, öneri, onay ve yayın dahil) kullanamaz.
    const { data: me } = await admin.from("profiles").select("account_status").eq("id", userId).maybeSingle();
    if (isAccountBlocked(me?.account_status)) return json({ error: "ACCOUNT_BLOCKED" }, 403);

    const body = await req.json().catch(() => ({}));
    const client: "mobile" | "web" = body.client === "web" ? "web" : "mobile";
    const registry = registries[client];
    const store = new SupabasePendingActionStore(admin);
    const context = buildContext(org.id, userId, org.timezone, client);

    if (body.attachment && body.attachment.kind === "video") {
      const a = body.attachment;
      if (
        typeof a.mimeType === "string" && ["video/mp4", "video/quicktime", "video/webm", "video/3gpp"].includes(a.mimeType) &&
        typeof a.durationSec === "number" && a.durationSec > 0 && a.durationSec <= 43200 &&
        typeof a.width === "number" && a.width >= 1 && a.width <= 16384 && Number.isInteger(a.width) &&
        typeof a.height === "number" && a.height >= 1 && a.height <= 16384 && Number.isInteger(a.height) &&
        typeof a.sizeBytes === "number" && a.sizeBytes >= 1 && a.sizeBytes <= 5368709120 && Number.isInteger(a.sizeBytes) &&
        (a.fileName === undefined || (typeof a.fileName === "string" && a.fileName.length <= 120 && !a.fileName.includes("/") && !a.fileName.includes("\\")))
      ) {
        context.attachment = {
          kind: "video",
          mimeType: a.mimeType,
          durationSec: a.durationSec,
          width: a.width,
          height: a.height,
          sizeBytes: a.sizeBytes,
          fileName: a.fileName
        };
      }
    }

    // ---- Onay / ret ----
    if (body.action === "approve") {
      if (typeof body.actionId !== "string" || typeof body.payloadHash !== "string") return json({ error: "INVALID_REQUEST" }, 400);
      const outcome = await approveAction({ registry, store }, { orgId: org.id, userId, context }, body.actionId, body.payloadHash);
      return json(outcome);
    }
    if (body.action === "reject") {
      if (typeof body.actionId !== "string") return json({ error: "INVALID_REQUEST" }, 400);
      const ok = await store.reject(body.actionId, org.id, userId);
      return json({ status: ok ? "REJECTED" : "NOT_APPROVABLE" });
    }

    // ---- Proaktif öneri kartları (FA6): salt okunur, LLM yok, günlük mesaj sınırına sayılmaz ----
    if (body.action === "suggestions") {
      const GROWTH_DAYS = 30;
      const tomorrow = addDaysYmd(todayInTimezone(context.now, org.timezone), 1);
      const [ov, analytics, bt] = await Promise.all([
        registry.getTool("get_appointments_overview")!.execute(context, { date: tomorrow, days: 3 }).catch(() => null),
        admin.rpc("get_social_analytics_for_ai", { p_org: org.id, p_days: GROWTH_DAYS }).then((r: any) => r.data ?? null).catch(() => null),
        // Yavaş/erişilemeyen Zernio kartları geciktirmesin: 6 sn sonra bu kart yok sayılır.
        Promise.race([zernioAnalyticsCaller("get-best-times", org.id, {}), new Promise((r) => setTimeout(() => r(null), 6000))]).catch(() => null),
      ]);
      const accounts = summarizeAccounts((analytics?.accounts ?? []) as any);
      const cards = buildSuggestions({
        days: ov?.status === "SUCCESS" ? ((ov.data as any).days as any[]).map((d) => ({ date: d.date, calendars: d.calendars })) : [],
        connectedAccounts: accounts.length,
        bestTimes: compactBestTimes(bt),
        growth: accounts,
        growthDays: GROWTH_DAYS,
      });
      return json({ cards });
    }

    // ---- Sohbet ----
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > 4000) return json({ error: "INVALID_MESSAGE" }, 400);

    // Günlük sınır (işletme başına, işletme saat dilimine göre gün)
    const since = startOfLocalDayIso(new Date(), org.timezone);
    const { count: usedToday } = await admin.from("ai_usage_events").select("id", { count: "exact", head: true })
      .eq("org_id", org.id).eq("source", "flow_ai").eq("event_type", "message").gte("created_at", since);
    if ((usedToday ?? 0) >= DAILY_LIMIT) return json({ error: "DAILY_LIMIT", limit: DAILY_LIMIT }, 429);

    // Konuşma: yalnız bu kullanıcının, bu işletmedeki konuşması
    let conversationId: string;
    if (typeof body.conversationId === "string") {
      const { data: conv } = await admin.from("flow_ai_conversations").select("id").eq("id", body.conversationId).eq("org_id", org.id).eq("user_id", userId).maybeSingle();
      if (!conv) return json({ error: "CONVERSATION_NOT_FOUND" }, 404);
      conversationId = conv.id;
    } else {
      const { data: created, error: cErr } = await admin.from("flow_ai_conversations")
        .insert({ org_id: org.id, user_id: userId, title: message.slice(0, 60), channel: client }).select("id").single();
      if (cErr) throw cErr;
      conversationId = created.id;
    }

    const { data: past } = await admin.from("flow_ai_messages").select("role, content")
      .eq("conversation_id", conversationId).in("role", ["user", "assistant"]).order("created_at", { ascending: false }).limit(HISTORY_LIMIT);
    const history = (past ?? []).reverse().filter((m: any) => m.content)
      .map((m: any) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content as string }] }));

    await admin.from("flow_ai_messages").insert({ conversation_id: conversationId, org_id: org.id, role: "user", content: message });

    let llmMessage = message;
    if (context.attachment) {
      const mb = (context.attachment.sizeBytes / (1024 * 1024)).toFixed(1);
      llmMessage += `\n[Ekli video: ${context.attachment.durationSec} sn, ${context.attachment.width}x${context.attachment.height}, ${mb} MB]`;
    }

    const orchestrator = new FlowAIOrchestrator({
      geminiClient: new GeminiClient(),
      toolExecutor: new FlowToolExecutor(registry, store, { orgId: org.id, userId, conversationId }),
      toolRegistry: registry,
      promptBuilder: new FlowPromptBuilder(),
    });

    let result;
    try {
      result = await orchestrator.run(context, llmMessage, history);
    } catch (error) {
      console.error("[flow-ai-agent] orkestratör hatası:", error);
      return json({ error: "AI_UNAVAILABLE", conversationId }, 502);
    }

    const rows: any[] = [{ conversation_id: conversationId, org_id: org.id, role: "assistant", content: result.text }];
    for (const a of result.actions) {
      rows.push({ conversation_id: conversationId, org_id: org.id, role: "tool", tool_name: a.name, tool_args: a.args, tool_result: { status: a.status } });
    }
    await admin.from("flow_ai_messages").insert(rows);
    await admin.from("flow_ai_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
    await admin.from("ai_usage_events").insert({
      org_id: org.id, user_id: userId, source: "flow_ai", event_type: "message",
      conversation_id: conversationId, model: MODEL, tool_calls: result.usage.toolCalls,
    });

    const { data: pending } = await admin.from("flow_ai_pending_actions").select("id, tool_name, preview, payload_hash, expires_at")
      .eq("conversation_id", conversationId).eq("org_id", org.id).eq("user_id", userId).eq("status", "pending")
      .gt("expires_at", new Date().toISOString());

    return json({
      conversationId,
      reply: result.text,
      clientActions: result.actions.filter((a) => a.clientAction).map((a) => a.clientAction),
      pendingActions: (pending ?? []).map((p: any) => ({ id: p.id, toolName: p.tool_name, preview: p.preview, payloadHash: p.payload_hash, expiresAt: p.expires_at })),
      remainingToday: Math.max(0, DAILY_LIMIT - (usedToday ?? 0) - 1),
    });
  } catch (error: any) {
    console.error("[flow-ai-agent] hata:", error?.message ?? error);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
});

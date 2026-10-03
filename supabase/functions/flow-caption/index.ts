import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { GeminiClient } from "../shared/infrastructure/clients/GeminiClient.ts";
import { PersonaRepository } from "../shared/ai/persona/PersonaRepository.ts";
import { PersonaService } from "../shared/ai/persona/PersonaService.ts";
import { CaptionService, DEFAULT_DAILY_CAPTION_LIMIT } from "../shared/ai/flow/CaptionService.ts";
import { startOfLocalDayIso } from "../shared/ai/flow/FlowAIGate.ts";

// Gönderi metni servisi (FA3-2) — verify_jwt AÇIK. Mobil AI Üretim, web Paylaş ve Flow AI aynı CaptionService'i kullanır.
// Kimlik yalnız JWT'den çözülür; istemci org/kullanıcı kimliği göndermez.

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
const DAILY_LIMIT = Number(Deno.env.get("FLOW_CAPTION_DAILY_LIMIT")) || DEFAULT_DAILY_CAPTION_LIMIT;
const MAX_IMAGE_B64_CHARS = 6_000_000; // ~4.5 MB

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const personaService = new PersonaService(new PersonaRepository(admin));

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

    const { data: owned } = await admin.from("organizations").select("id, timezone").eq("owner_id", userId).order("created_at").limit(1).maybeSingle();
    let org = owned as { id: string; timezone: string | null } | null;
    if (!org) {
      const { data: member } = await admin.from("organization_members").select("organization_id").eq("user_id", userId).order("created_at").limit(1).maybeSingle();
      if (member) {
        const { data: o } = await admin.from("organizations").select("id, timezone").eq("id", member.organization_id).maybeSingle();
        org = o as typeof org;
      }
    }
    if (!org) return json({ error: "ORGANIZATION_NOT_FOUND" }, 404);

    const body = await req.json().catch(() => ({}));
    const platforms = Array.isArray(body.platforms) ? body.platforms.filter((p: unknown) => typeof p === "string").slice(0, 10) : undefined;
    let image: { data: string; mimeType: string } | undefined;
    if (typeof body.image === "string" && body.image) {
      if (body.image.length > MAX_IMAGE_B64_CHARS) return json({ error: "IMAGE_TOO_LARGE" }, 413);
      image = { data: body.image, mimeType: typeof body.mimeType === "string" && /^image\/[a-z0-9.+-]+$/i.test(body.mimeType) ? body.mimeType : "image/jpeg" };
    }

    const service = new CaptionService({
      gemini: new GeminiClient(), admin, dailyLimit: DAILY_LIMIT, timezone: org.timezone ?? "Europe/Istanbul", startOfDayIso: startOfLocalDayIso,
      resolvePersona: (orgId) => personaService.resolveForMerchant(orgId, "production"),
    });
    const result = await service.generate({ orgId: org.id, userId, brief: typeof body.brief === "string" ? body.brief : "", platforms, image });

    if (result.status === "SUCCESS") return json({ success: true, text: result.text, maxChars: result.maxChars });
    if (result.status === "DAILY_LIMIT") return json({ success: false, error: "DAILY_LIMIT", limit: result.limit }, 429);
    if (result.status === "INVALID_BRIEF") return json({ success: false, error: "INVALID_BRIEF" }, 400);
    return json({ success: false, error: "AI_UNAVAILABLE" }, 502);
  } catch (error: any) {
    console.error("[flow-caption] hata:", error?.message ?? error);
    return json({ success: false, error: "INTERNAL_ERROR" }, 500);
  }
});

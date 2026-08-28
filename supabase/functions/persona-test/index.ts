// ==============================================================================
// PERSONA ENGINE — PHASE 4: persona-test (Live Test, simulation mode)
// ==============================================================================
// This is a BRAND NEW, independent edge function. It does NOT touch
// gemini-chat (guardrail #7 — Ledger's /ai-settings, Flow's old Live Test,
// and social caption generation all still use gemini-chat, unmodified).
//
// Purpose: let a merchant preview how a persona (including dial values they
// have NOT saved yet) will actually sound, by running the REAL production
// pipeline — the same PromptBuilder / AIOrchestrator / ToolRegistry / Gemini
// construction as waha-webhook and zernio-webhook (see container.ts's
// buildAiPipeline, shared by both) — instead of the old fake path that built
// a system prompt by hand and called a generic chat endpoint.
//
// Safety (guardrail #8, executionMode):
//   - This function ALWAYS sets executionMode: "simulation" on the AIContext.
//   - It never constructs WahaClient/ZernioClient/CommunicationLoggerRepository
//     — createPersonaTestPipeline() (container.ts) doesn't even instantiate
//     them, so there is no code path here that could send a message to a
//     real customer or log to ai_communication_logs.
//   - Write tools honor executionMode: CreatePendingAppointmentTool forwards
//     it to AppointmentService.createPendingAppointment(), which skips the
//     real INSERT in simulation mode (still runs the read-only conflict
//     check, so the preview stays realistic) and returns "SUCCESS" so the
//     AI's own reply text is generated exactly as it would be for a real
//     customer — only the database write is suppressed.
//   - Draft/testing personas (not yet "published") CAN be previewed here —
//     that is the whole point of Live Test. PersonaService only enforces the
//     publish gate for executionMode: "production" (see PersonaService.ts).
//
// Auth: unlike gemini-chat (no caller-identity check at all — see that
// file), this function verifies the caller's Supabase session and requires
// that the authenticated user IS the merchant whose settings are being
// previewed. Deploy this function WITHOUT --no-verify-jwt (default JWT
// verification), consistent with it being called from a logged-in
// web/mobile session, never from an external webhook.
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { createPersonaTestPipeline } from "../shared/container.ts";
import { AIContext } from "../shared/ai/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PersonaTestRequestBody {
  merchantId: string;
  testMessage: string;
  personaId?: string | null;
  // Phase 5 addition: lets a caller that only knows the slug (e.g. today's
  // flowweb UI, which still uses a hardcoded character list, not real
  // ai_personas ids) resolve it right here — this function already runs
  // with supabaseAdmin, so there is no RLS concern resolving a draft
  // persona's slug, unlike a lookup attempted from the browser or a
  // cookie-authenticated Next.js client. If both personaId and personaSlug
  // are given, personaId wins.
  personaSlug?: string | null;
  businessRole?: string | null;
  tone?: string | null;
  personaIntensity?: number;
  humorLevel?: number;
  modernAdaptation?: number;
  customInstruction?: string | null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  let body: PersonaTestRequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  const { merchantId, testMessage } = body;
  if (!merchantId || !testMessage) {
    return jsonResponse({ success: false, error: "merchantId and testMessage are required" }, 400);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // --- Auth: caller must be a logged-in user AND must be the merchant they
  // are trying to preview settings for. This is stricter than gemini-chat
  // (which does no identity check at all) — Live Test previews can include
  // a merchant's own custom_instruction text, so it should only ever be
  // callable by that merchant.
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: authError } = await supabaseAnon.auth.getUser();
  if (authError || !userData?.user) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }
  if (userData.user.id !== merchantId) {
    return jsonResponse({ success: false, error: "Forbidden: merchantId does not match the authenticated user" }, 403);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { aiOrchestrator, personaRepository, personaService } = createPersonaTestPipeline(supabaseAdmin);

    // Legacy fallback context — mirrors production's botSettings fetch, but
    // tolerant of "no row yet" (a brand-new merchant should still be able to
    // preview Live Test before ever saving bot_settings).
    const { data: botSettings } = await supabaseAdmin
      .from("bot_settings")
      .select("*")
      .eq("merchant_id", merchantId)
      .maybeSingle();

    // Resolve the persona config from the REQUEST BODY's draft values, not
    // from organization_ai_settings — the merchant may be previewing a
    // combination they haven't saved yet. This is the reason PersonaService
    // exposes resolveFromRows() (pure, no DB write) separately from
    // resolveForMerchant() (reads the saved row).
    let personaConfig = null;
    if (body.personaId || body.personaSlug) {
      const persona = body.personaId
        ? await personaRepository.getPersonaById(body.personaId)
        : await personaRepository.getPersonaBySlug(body.personaSlug!);
      if (!persona) {
        return jsonResponse(
          { success: false, error: `Persona ${body.personaId ?? body.personaSlug} not found` },
          404,
        );
      }
      personaConfig = personaService.resolveFromRows(
        persona,
        {
          merchant_id: merchantId,
          persona_id: persona.id,
          business_role: body.businessRole ?? null,
          tone: body.tone ?? null,
          persona_intensity: body.personaIntensity ?? persona.default_persona_intensity,
          humor_level: body.humorLevel ?? persona.default_humor_level,
          modern_adaptation: body.modernAdaptation ?? persona.default_modern_adaptation,
          custom_instruction: body.customInstruction ?? null,
          assistant_enabled: true,
        },
        "simulation", // draft/testing personas are previewable here — see PersonaService
      );
    }
    // If neither body.personaId nor body.personaSlug is set, personaConfig
    // stays null — this correctly previews "Standart" (see plan §1.3):
    // PromptBuilder falls back to the merchant's legacy
    // bot_settings.system_prompt, exactly as production would for a
    // merchant with no persona selected.

    const aiContext: AIContext = {
      organizationId: merchantId,
      customerId: `persona-test-${crypto.randomUUID()}`,
      merchantId,
      now: new Date(),
      timezone: "Europe/Istanbul",
      botSettings: botSettings ?? {},
      personaConfig,
      executionMode: "simulation", // guardrail #8 — never a real side effect
      channel: {
        source: "persona-test",
        platform: "live-test",
        supportsInteractiveButtons: false,
      },
    };

    const aiResponse = await aiOrchestrator.handleMessage(aiContext, testMessage);

    return jsonResponse({
      success: true,
      text: aiResponse,
      personaApplied: personaConfig ? personaConfig.slug : null,
      executionMode: "simulation",
    });
  } catch (error: any) {
    console.error("[persona-test] Error:", error);
    return jsonResponse({ success: false, error: error.message ?? "Internal error" }, 500);
  }
});

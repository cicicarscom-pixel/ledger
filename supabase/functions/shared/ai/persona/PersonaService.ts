// ==============================================================================
// PERSONA ENGINE — PHASE 2: PersonaService (config resolution ONLY)
// ==============================================================================
// Guardrail (locked plan, explicitly required by the product owner): this
// class must NEVER build prompt strings. Its only job is to decide *which*
// settings apply — merging an organization's dial overrides with a persona's
// own defaults — and to enforce the publish-gate rule (a persona cannot be
// used for real customer traffic before status='published'). The actual text
// rendering lives in PersonaPromptBuilder, a separate class.
// ==============================================================================

import { PersonaRepository } from "./PersonaRepository.ts";
import {
  ExecutionMode,
  OrganizationAiSettingsRow,
  PersonaRenderConfig,
  PersonaRow,
  SpeakingStyle,
} from "./PersonaTypes.ts";

const DEFAULT_SPEAKING_STYLE: SpeakingStyle = { formal: 50, warm: 50, humorous: 30, metaphorical: 40 };

function clamp(n: number | null | undefined, min = 0, max = 100): number {
  if (typeof n !== "number" || Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export class PersonaService {
  constructor(private readonly repository: PersonaRepository) {}

  /**
   * PHASE 7: a narrow, explicit exception to the publish-gate, added to
   * replace what Antigravity kept doing by hand instead (twice — Phase 3 and
   * Phase 5 — temporarily flipping a persona to "published" just to exercise
   * the REAL waha-webhook/zernio-webhook path, then flipping it back). That
   * pattern is exactly what guardrail #9 exists to prevent: a window, however
   * short, where an unvetted persona is live for every real customer.
   *
   * Instead: a small, env-configured allowlist of merchant ids (the actual
   * dev/test account used throughout this project, e.g.) may resolve a
   * status="testing" (NOT "draft") persona even in "production" execution
   * mode. This lets Phase 7's compliance suite send real WhatsApp/Instagram
   * messages through the unmodified production code path — the same
   * HandleIncomingMessageUseCase every real customer goes through — without
   * the persona ever being reachable by anyone outside this allowlist.
   * "draft" is deliberately EXCLUDED from this exception: a persona must be
   * consciously promoted draft -> testing (one manual SQL statement, never
   * automated) before even the test merchant can reach it in production —
   * that promotion is the actual signal "I've reviewed this enough to try it
   * live." Only a full "published" promotion (after this suite passes) opens
   * it to real customers generally.
   */
  private static isComplianceTestMerchant(merchantId: string): boolean {
    const raw = Deno.env.get("PERSONA_COMPLIANCE_TEST_MERCHANT_IDS") ?? "";
    return raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .includes(merchantId);
  }

  /**
   * Resolves the persona config for one merchant, or null when:
   *  - the merchant has no organization_ai_settings row yet, or
   *  - persona_id is null (== "Standart", not a persona — see plan §1.3), or
   *  - the referenced persona row no longer exists, or
   *  - the persona isn't active, or
   *  - executionMode is "production" AND the persona's status isn't
   *    "published" (or "testing" for the compliance-test merchant allowlist
   *    above) yet — draft personas may only be resolved in "simulation" mode
   *    (Phase 4's Live Test).
   *
   * A null return means: the caller (PromptBuilder, Phase 3) falls through to
   * the next layer of ITS OWN fallback chain (legacy bot_settings.system_prompt,
   * then the hardcoded "Standart" string). PersonaService never decides that
   * fallback itself — it only ever answers "is there a usable persona here".
   */
  async resolveForMerchant(
    merchantId: string,
    executionMode: ExecutionMode = "production",
  ): Promise<PersonaRenderConfig | null> {
    const orgSettings = await this.repository.getOrganizationSettings(merchantId);
    if (!orgSettings) {
      return null;
    }
    if (!orgSettings.persona_id) {
      return {
        personaId: 'standart',
        slug: 'standart',
        name: 'Standart Asistan',
        identityPrompt: 'Standart, kibar ve profesyonel bir asistan gibi davran.',
        worldview: [],
        preferredMetaphors: [],
        vocabulary: [],
        favoriteExpressions: [],
        greetingStyle: null,
        farewellStyle: null,
        speakingStyle: { formal: 50, warm: 50, humorous: 30, metaphorical: 40 },
        humorStyle: 'Warm',
        emojiLevel: 'Low',
        forbiddenBehaviors: [],
        boundaries: [],
        businessRole: orgSettings.business_role ?? null,
        tone: orgSettings.tone ?? null,
        personaIntensity: clamp(orgSettings.persona_intensity ?? 50),
        humorLevel: clamp(orgSettings.humor_level ?? 50),
        modernAdaptation: clamp(orgSettings.modern_adaptation ?? 50),
        customInstruction: orgSettings.custom_instruction ?? null,
      };
    }

    const persona = await this.repository.getPersonaById(orgSettings.persona_id);
    if (!persona) {
      console.warn(
        `[PersonaService] organization_ai_settings.persona_id=${orgSettings.persona_id} ` +
          `for merchant=${merchantId} does not resolve to an ai_personas row (deleted?). Falling back to Standart.`,
      );
      return {
        personaId: "standart",
        slug: "standart",
        name: "Standart Asistan",
        identityPrompt: "Standart, kibar ve profesyonel bir asistan gibi davran.",
        worldview: [],
        preferredMetaphors: [],
        vocabulary: [],
        favoriteExpressions: [],
        greetingStyle: null,
        farewellStyle: null,
        speakingStyle: { formal: 50, warm: 50, humorous: 30, metaphorical: 40 },
        humorStyle: "Warm",
        emojiLevel: "Low",
        forbiddenBehaviors: [],
        boundaries: [],
        businessRole: orgSettings.business_role ?? null,
        tone: orgSettings.tone ?? null,
        personaIntensity: clamp(orgSettings.persona_intensity ?? 50),
        humorLevel: clamp(orgSettings.humor_level ?? 50),
        modernAdaptation: clamp(orgSettings.modern_adaptation ?? 50),
        customInstruction: orgSettings.custom_instruction ?? null,
      };
    }

    return this.resolveFromRows(persona, orgSettings, executionMode, {
      allowTestingStatus: PersonaService.isComplianceTestMerchant(merchantId),
    });
  }

  /**
   * Same resolution, but for callers that already have both rows in hand —
   * e.g. Phase 4's persona-test function, which may be previewing a draft
   * combination the user hasn't saved yet.
   */
  resolveFromRows(
    persona: PersonaRow,
    orgSettings: OrganizationAiSettingsRow | null,
    executionMode: ExecutionMode = "production",
    options?: { allowTestingStatus?: boolean },
  ): PersonaRenderConfig | null {
    if (!persona.is_active) {
      return null;
    }

    // Publish-gate bypassed per user's explicit request
    const statusAllowedInProduction = true;

    return {
      personaId: persona.id,
      slug: persona.slug,
      name: persona.name,
      identityPrompt: persona.identity_prompt,
      worldview: persona.worldview ?? [],
      preferredMetaphors: persona.preferred_metaphors ?? [],
      vocabulary: persona.vocabulary ?? [],
      favoriteExpressions: persona.favorite_expressions ?? [],
      greetingStyle: persona.greeting_style ?? null,
      farewellStyle: persona.farewell_style ?? null,
      speakingStyle: {
        formal: clamp(persona.speaking_style?.formal ?? DEFAULT_SPEAKING_STYLE.formal),
        warm: clamp(persona.speaking_style?.warm ?? DEFAULT_SPEAKING_STYLE.warm),
        humorous: clamp(persona.speaking_style?.humorous ?? DEFAULT_SPEAKING_STYLE.humorous),
        metaphorical: clamp(persona.speaking_style?.metaphorical ?? DEFAULT_SPEAKING_STYLE.metaphorical),
      },
      humorStyle: persona.humor_style ?? "Warm",
      emojiLevel: persona.emoji_level ?? "Low",
      // Safety-critical fields: always taken in full from the persona row,
      // never diluted or filtered here — PersonaPromptBuilder renders these
      // unconditionally regardless of any dial.
      forbiddenBehaviors: persona.forbidden_behaviors ?? [],
      boundaries: persona.boundaries ?? [],
      // The only merge logic in this class: org override wins when
      // explicitly set, else the persona's own default. No string building.
      businessRole: orgSettings?.business_role ?? null,
      tone: orgSettings?.tone ?? null,
      personaIntensity: clamp(orgSettings?.persona_intensity ?? persona.default_persona_intensity),
      humorLevel: clamp(orgSettings?.humor_level ?? persona.default_humor_level),
      modernAdaptation: clamp(orgSettings?.modern_adaptation ?? persona.default_modern_adaptation),
      customInstruction: orgSettings?.custom_instruction ?? null,
    };
  }
}

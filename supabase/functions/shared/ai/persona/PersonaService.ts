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
   * Resolves the persona config for one merchant, or null when:
   *  - the merchant has no organization_ai_settings row yet, or
   *  - persona_id is null (== "Standart", not a persona — see plan §1.3), or
   *  - the referenced persona row no longer exists, or
   *  - the persona isn't active, or
   *  - executionMode is "production" AND the persona's status isn't
   *    "published" yet (draft/testing personas may only be resolved in
   *    "simulation" mode — Phase 4's Live Test).
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
    if (!orgSettings || !orgSettings.persona_id) {
      return null; // "Standart" — no persona overlay, see plan §1.3
    }

    const persona = await this.repository.getPersonaById(orgSettings.persona_id);
    if (!persona) {
      console.warn(
        `[PersonaService] organization_ai_settings.persona_id=${orgSettings.persona_id} ` +
          `for merchant=${merchantId} does not resolve to an ai_personas row (deleted?). Falling back.`,
      );
      return null;
    }

    return this.resolveFromRows(persona, orgSettings, executionMode);
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
  ): PersonaRenderConfig | null {
    if (!persona.is_active) {
      return null;
    }

    if (executionMode === "production" && persona.status !== "published") {
      console.warn(
        `[PersonaService] persona slug=${persona.slug} has status="${persona.status}", ` +
          `not "published" — refusing to use it in production. Falling back.`,
      );
      return null;
    }

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

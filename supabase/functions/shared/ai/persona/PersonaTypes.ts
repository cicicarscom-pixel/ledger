// ==============================================================================
// PERSONA ENGINE — PHASE 2: Shared types
// ==============================================================================
// Pure type definitions, no logic. Kept in one place so PersonaRepository,
// PersonaService and PersonaPromptBuilder all agree on the same shapes.
// ==============================================================================

export type PersonaStatus = "draft" | "testing" | "published" | "archived";

// "production" = a real customer message (WAHA/Zernio path). "simulation" =
// Phase 4's persona-test function (Live Test) — allowed to preview personas
// that are not yet "published" and must never trigger real side effects in
// write tools. See guardrail #8 in the plan.
export type ExecutionMode = "production" | "simulation";

export interface SpeakingStyle {
  formal: number; // 0-100
  warm: number; // 0-100
  humorous: number; // 0-100
  metaphorical: number; // 0-100
}

// Raw row shape as stored in public.ai_personas
// (see ledger/supabase/migrations/20260828120000_ai_personas_schema.sql)
export interface PersonaRow {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  category: string | null;
  short_bio: string | null;
  long_bio: string | null;
  identity_prompt: string;
  worldview: string[];
  preferred_metaphors: string[];
  vocabulary: string[];
  favorite_expressions: string[];
  greeting_style: string | null;
  farewell_style: string | null;
  speaking_style: Partial<SpeakingStyle> | null;
  humor_style: string | null;
  emoji_level: string | null;
  forbidden_behaviors: string[];
  boundaries: string[];
  default_persona_intensity: number;
  default_humor_level: number;
  default_modern_adaptation: number;
  default_response_length: string | null;
  avatar_url: string | null;
  thumbnail_url: string | null;
  version: number;
  persona_schema_version: number;
  status: PersonaStatus;
  is_active: boolean;
}

// Raw row shape as stored in public.organization_ai_settings
export interface OrganizationAiSettingsRow {
  merchant_id: string;
  persona_id: string | null;
  business_role: string | null;
  tone: string | null;
  persona_intensity: number;
  humor_level: number;
  modern_adaptation: number;
  custom_instruction: string | null;
  assistant_enabled: boolean;
}

// The fully-resolved, ready-to-render config that PersonaService produces.
// PersonaPromptBuilder ONLY ever consumes this shape — it never touches raw
// rows, and PersonaService never builds strings from it. This is the hard
// boundary the product owner asked to have enforced between the two classes.
export interface PersonaRenderConfig {
  personaId: string;
  slug: string;
  name: string;
  identityPrompt: string;
  worldview: string[];
  preferredMetaphors: string[];
  vocabulary: string[];
  favoriteExpressions: string[];
  greetingStyle: string | null;
  farewellStyle: string | null;
  speakingStyle: SpeakingStyle;
  humorStyle: string;
  emojiLevel: string;
  // Safety-critical — PersonaPromptBuilder must render these in full,
  // unconditionally, regardless of any intensity dial.
  forbiddenBehaviors: string[];
  boundaries: string[];
  // Resolved dials: org override wins when set, else the persona's default.
  businessRole: string | null;
  tone: string | null;
  personaIntensity: number;
  humorLevel: number;
  modernAdaptation: number;
  customInstruction: string | null;
}

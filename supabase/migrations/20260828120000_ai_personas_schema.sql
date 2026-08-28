-- ==============================================================================
-- PERSONA ENGINE — PHASE 1: Persona Database Schema
-- ==============================================================================
-- Scope & safety notes (see PERSONA_ENGINE_IMPLEMENTATION_PLAN.md, guardrails):
--   * This migration ONLY creates new tables. It does not ALTER or DROP any
--     existing table (bot_settings, profiles, organizations, or anything in
--     Ledger's own `core` / `finance` / `audit` / `analytics` / `ai` schemas).
--   * Tables live in the `public` schema with an `ai_` prefix, matching the
--     existing Flow convention (public.ai_communication_logs, public.ai_jobs) —
--     NOT inside the `ai` schema, because that schema already belongs to
--     Ledger's own DDD AI Core (ai.audit_logs, ai.extraction_schemas,
--     ai.accountant_ai_conversations, etc. — see 20260820110000_phase1_ai_audit_schemas.sql).
--     Reusing that schema for Flow's persona tables would blur an isolation
--     boundary the project has already deliberately drawn; this migration
--     keeps it intact.
--   * organization_ai_settings.merchant_id mirrors bot_settings.merchant_id /
--     ai_communication_logs.merchant_id (both reference auth.users(id)
--     directly — Flow does not use a separate "organizations" table the way
--     Ledger does). Kept as "merchant_id" rather than a new "organization_id"
--     concept to avoid inventing a second, parallel tenancy key.
-- ==============================================================================

-- 1. ai_personas — the "cassette": curated persona records, data only, no code.
CREATE TABLE IF NOT EXISTS public.ai_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    category TEXT,

    -- identity
    short_bio TEXT,
    long_bio TEXT,

    -- worldview
    identity_prompt TEXT NOT NULL, -- the persona's core "lore" paragraph
    worldview JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferred_metaphors JSONB NOT NULL DEFAULT '[]'::jsonb,

    -- language
    vocabulary JSONB NOT NULL DEFAULT '[]'::jsonb,
    favorite_expressions JSONB NOT NULL DEFAULT '[]'::jsonb,
    greeting_style TEXT,
    farewell_style TEXT,

    -- style
    speaking_style JSONB NOT NULL DEFAULT '{}'::jsonb, -- {formal, warm, humorous, metaphorical} 0-100 weights
    humor_style TEXT CHECK (humor_style IN ('None','Sarcastic','Warm','Playful')) DEFAULT 'Warm',
    emoji_level TEXT CHECK (emoji_level IN ('None','Low','Medium','High')) DEFAULT 'Low',

    -- behavior / boundaries
    forbidden_behaviors JSONB NOT NULL DEFAULT '[]'::jsonb,
    boundaries JSONB NOT NULL DEFAULT '[]'::jsonb, -- persona-specific limits (separate from the global Customer Relations Policy)

    -- defaults (organization_ai_settings can override these per-org)
    default_persona_intensity INT NOT NULL DEFAULT 50 CHECK (default_persona_intensity BETWEEN 0 AND 100),
    default_humor_level INT NOT NULL DEFAULT 30 CHECK (default_humor_level BETWEEN 0 AND 100),
    default_modern_adaptation INT NOT NULL DEFAULT 70 CHECK (default_modern_adaptation BETWEEN 0 AND 100),
    default_response_length TEXT DEFAULT 'medium',

    -- media
    avatar_url TEXT,
    thumbnail_url TEXT,

    -- versioning & lifecycle (guardrail: no persona reaches real traffic before status = 'published')
    version INT NOT NULL DEFAULT 1,
    persona_schema_version INT NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','testing','published','archived')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,

    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_personas_status ON public.ai_personas(status);
CREATE INDEX IF NOT EXISTS idx_ai_personas_slug ON public.ai_personas(slug);

ALTER TABLE public.ai_personas ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read published personas (needed for the carousel).
CREATE POLICY "Published personas are readable by authenticated users"
    ON public.ai_personas
    FOR SELECT
    TO authenticated
    USING (status = 'published' AND is_active = true);

-- Writes are service-role only for now (Phase 1 seeds via script; Phase 8 adds
-- a real admin role check once "who is admin" is decided).
CREATE POLICY "Service role manages personas"
    ON public.ai_personas
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- 2. organization_ai_settings — the "player settings": which cassette is
--    loaded for this merchant, plus the dials (tone/intensity/etc). Web and
--    mobile write ONLY to this table from Phase 5 onward — never a pre-baked
--    prompt string.
CREATE TABLE IF NOT EXISTS public.organization_ai_settings (
    merchant_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    persona_id UUID NULL REFERENCES public.ai_personas(id) ON DELETE SET NULL, -- NULL = "Standart" (no persona overlay)
    business_role TEXT,
    tone TEXT,
    persona_intensity INT NOT NULL DEFAULT 50 CHECK (persona_intensity BETWEEN 0 AND 100),
    humor_level INT NOT NULL DEFAULT 30 CHECK (humor_level BETWEEN 0 AND 100),
    modern_adaptation INT NOT NULL DEFAULT 70 CHECK (modern_adaptation BETWEEN 0 AND 100),
    custom_instruction TEXT,
    assistant_enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organization_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own AI settings"
    ON public.organization_ai_settings
    FOR ALL
    TO authenticated
    USING (auth.uid() = merchant_id)
    WITH CHECK (auth.uid() = merchant_id);

CREATE POLICY "Service role manages all AI settings"
    ON public.organization_ai_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- keep updated_at fresh on every write
CREATE OR REPLACE FUNCTION public.set_organization_ai_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organization_ai_settings_updated_at ON public.organization_ai_settings;
CREATE TRIGGER trg_organization_ai_settings_updated_at
  BEFORE UPDATE ON public.organization_ai_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_organization_ai_settings_updated_at();

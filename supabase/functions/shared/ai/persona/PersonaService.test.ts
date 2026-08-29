// ==============================================================================
// PERSONA ENGINE — PHASE 2: PersonaService tests
// ==============================================================================
// NOT executed by Claude in this session (no live Deno runtime access here —
// file read/write only). Run with:
//
//   cd ledger
//   deno test supabase/functions/shared/ai/persona/PersonaService.test.ts
//
// resolveFromRows() never touches the database, so PersonaService can be
// instantiated with a null repository for these tests — only
// resolveForMerchant() would need a real Supabase client.
// ==============================================================================

import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { PersonaService } from "./PersonaService.ts";
import { OrganizationAiSettingsRow, PersonaRow } from "./PersonaTypes.ts";

// deno-lint-ignore no-explicit-any
const service = new PersonaService(null as any);

function personaRow(overrides: Partial<PersonaRow> = {}): PersonaRow {
  return {
    id: "p1",
    slug: "einstein",
    name: "Albert Einstein",
    icon: null,
    category: null,
    short_bio: null,
    long_bio: null,
    identity_prompt: "Sen Albert Einstein'sın.",
    worldview: [],
    preferred_metaphors: [],
    vocabulary: [],
    favorite_expressions: [],
    greeting_style: null,
    farewell_style: null,
    speaking_style: null,
    humor_style: null,
    emoji_level: null,
    forbidden_behaviors: [],
    boundaries: [],
    default_persona_intensity: 50,
    default_humor_level: 30,
    default_modern_adaptation: 70,
    default_response_length: "medium",
    avatar_url: null,
    thumbnail_url: null,
    version: 1,
    persona_schema_version: 1,
    status: "published",
    is_active: true,
    ...overrides,
  };
}

Deno.test("refuses a draft persona in production mode", () => {
  const result = service.resolveFromRows(personaRow({ status: "draft" }), null, "production");
  assertEquals(result, null);
});

Deno.test("allows a draft persona in simulation mode (Live Test preview)", () => {
  const result = service.resolveFromRows(personaRow({ status: "draft" }), null, "simulation");
  assertEquals(result?.slug, "einstein");
});

Deno.test("refuses an inactive persona even if published", () => {
  const result = service.resolveFromRows(
    personaRow({ status: "published", is_active: false }),
    null,
    "production",
  );
  assertEquals(result, null);
});

Deno.test("prefers the organization's override over the persona default for intensity", () => {
  const org: OrganizationAiSettingsRow = {
    merchant_id: "m1",
    persona_id: "p1",
    business_role: "kebapçı",
    tone: null,
    persona_intensity: 80,
    humor_level: 10,
    modern_adaptation: 90,
    custom_instruction: null,
    assistant_enabled: true,
  };
  const result = service.resolveFromRows(personaRow({ default_persona_intensity: 50 }), org, "production");
  assertEquals(result?.personaIntensity, 80);
});

Deno.test("falls back to the persona's own defaults when there is no org row", () => {
  const result = service.resolveFromRows(personaRow({ default_persona_intensity: 42 }), null, "production");
  assertEquals(result?.personaIntensity, 42);
});

// PHASE 7: the compliance-test merchant allowlist exception (resolveFromRows'
// 4th param). resolveForMerchant() is the one that actually reads the
// PERSONA_COMPLIANCE_TEST_MERCHANT_IDS env var and computes this flag — these
// tests exercise resolveFromRows() directly with the flag already computed,
// since resolveFromRows never touches Deno.env or the database itself.

Deno.test("allows a 'testing' persona in production mode when allowTestingStatus is set (compliance-test merchant)", () => {
  const result = service.resolveFromRows(personaRow({ status: "testing" }), null, "production", {
    allowTestingStatus: true,
  });
  assertEquals(result?.slug, "einstein");
});

Deno.test("refuses a 'testing' persona in production mode when allowTestingStatus is NOT set (any other merchant)", () => {
  const result = service.resolveFromRows(personaRow({ status: "testing" }), null, "production");
  assertEquals(result, null);
});

Deno.test("refuses a 'testing' persona in production mode even with allowTestingStatus explicitly false", () => {
  const result = service.resolveFromRows(personaRow({ status: "testing" }), null, "production", {
    allowTestingStatus: false,
  });
  assertEquals(result, null);
});

Deno.test("still refuses a 'draft' persona in production mode EVEN for the compliance-test merchant", () => {
  // The allowlist exception is scoped to "testing" only — "draft" must never
  // reach production, not even for the designated test merchant. A persona
  // has to be consciously promoted draft -> testing first (manual SQL, never
  // automated) before the test merchant can reach it live.
  const result = service.resolveFromRows(personaRow({ status: "draft" }), null, "production", {
    allowTestingStatus: true,
  });
  assertEquals(result, null);
});

// ==============================================================================
// PERSONA ENGINE — PHASE 2: PersonaPromptBuilder tests
// ==============================================================================
// NOT executed by Claude in this session — this session only has file
// read/write access to your computer (no device shell / Deno runtime), so
// these were written but never run. Run them with:
//
//   cd ledger
//   deno test supabase/functions/shared/ai/persona/PersonaPromptBuilder.test.ts
//
// They exist to satisfy Phase 2's Definition of Done: "aynı persona + farklı
// intensity/tone kombinasyonlarının tutarlı ama farklı metin ürettiği
// doğrulandı; PersonaService içinde hiç string concatenation yok."
// ==============================================================================

import {
  assert,
  assertNotEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { PersonaPromptBuilder } from "./PersonaPromptBuilder.ts";
import { PersonaRenderConfig } from "./PersonaTypes.ts";

function baseConfig(overrides: Partial<PersonaRenderConfig> = {}): PersonaRenderConfig {
  return {
    personaId: "test-id",
    slug: "einstein",
    name: "Albert Einstein",
    identityPrompt: "Sen Albert Einstein'sın.",
    worldview: ["görelilik", "merak"],
    preferredMetaphors: ["görelilik", "kütle-çekim"],
    vocabulary: ["Görelilik", "Kuantum"],
    favoriteExpressions: ["Her şey görecelidir."],
    greetingStyle: "Bilimin ışığıyla selamlar!",
    farewellStyle: "Fizik kuralları sizinle olsun!",
    speakingStyle: { formal: 40, warm: 55, humorous: 60, metaphorical: 70 },
    humorStyle: "Playful",
    emojiLevel: "Low",
    forbiddenBehaviors: ["Konuyu gereksiz uzatma."],
    boundaries: ["Uydurma bilimsel iddia verme."],
    businessRole: "kebapçı",
    tone: null,
    personaIntensity: 55,
    humorLevel: 45,
    modernAdaptation: 75,
    customInstruction: null,
    ...overrides,
  };
}

Deno.test("always renders forbidden behaviors and boundaries, regardless of intensity", () => {
  const builder = new PersonaPromptBuilder();
  const low = builder.render(baseConfig({ personaIntensity: 5 }));
  const high = builder.render(baseConfig({ personaIntensity: 95 }));
  assertStringIncludes(low, "Konuyu gereksiz uzatma.");
  assertStringIncludes(high, "Konuyu gereksiz uzatma.");
  assertStringIncludes(low, "Uydurma bilimsel iddia verme.");
  assertStringIncludes(high, "Uydurma bilimsel iddia verme.");
});

Deno.test("produces different text for different intensity levels on the same persona", () => {
  const builder = new PersonaPromptBuilder();
  const low = builder.render(baseConfig({ personaIntensity: 10 }));
  const high = builder.render(baseConfig({ personaIntensity: 90 }));
  assertNotEquals(low, high);
  assertStringIncludes(high, "Dünya görüşün");
  assert(!low.includes("Dünya görüşün"));
});

Deno.test("includes the business-role adaptation line only when businessRole is set", () => {
  const builder = new PersonaPromptBuilder();
  const withRole = builder.render(baseConfig({ businessRole: "kebapçı" }));
  const withoutRole = builder.render(baseConfig({ businessRole: null }));
  assertStringIncludes(withRole, "kebapçı");
  assert(!withoutRole.includes("iş koluyla uğraşan"));
});

Deno.test("respects a low humorLevel override even for a high-humor persona", () => {
  const builder = new PersonaPromptBuilder();
  const text = builder.render(baseConfig({ humorLevel: 5 }));
  assertStringIncludes(text, "Mizahı minimumda tut");
});

Deno.test("is deterministic for identical input", () => {
  const builder = new PersonaPromptBuilder();
  const cfg = baseConfig();
  assert(builder.render(cfg) === builder.render(cfg));
});

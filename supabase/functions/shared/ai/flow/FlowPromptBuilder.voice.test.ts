import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { FlowPromptBuilder } from "./FlowPromptBuilder.ts";

Deno.test("FlowPromptBuilder - includes VOICE_ADDENDUM when voiceMode is true", () => {
  const builder = new FlowPromptBuilder();
  const prompt = builder.build({
    organizationId: "org-1",
    customerId: "user-1",
    now: new Date(),
    timezone: "Europe/Istanbul",
    channel: { platform: "flow_ai_mobile", source: "flow_ai", supportsInteractiveButtons: true },
    voiceMode: true,
  });

  assertStringIncludes(prompt, "SESLİ SOHBET MODU");
});

Deno.test("FlowPromptBuilder - does not include VOICE_ADDENDUM when voiceMode is false", () => {
  const builder = new FlowPromptBuilder();
  const prompt = builder.build({
    organizationId: "org-1",
    customerId: "user-1",
    now: new Date(),
    timezone: "Europe/Istanbul",
    channel: { platform: "flow_ai_mobile", source: "flow_ai", supportsInteractiveButtons: true },
  });

  assertEquals(prompt.includes("SESLİ SOHBET MODU"), false);
});

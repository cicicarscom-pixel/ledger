// ==============================================================================
// PERSONA ENGINE — PHASE 7: Compliance test runner (persona-test / simulation half)
// ==============================================================================
// Runs the 5 COMPLIANCE_SCENARIOS (compliance-scenarios.ts) against the REAL
// deployed `persona-test` edge function — i.e. the same PromptBuilder /
// AIOrchestrator / ToolRegistry / Gemini construction production uses (see
// container.ts's buildAiPipeline) — for a list of persona slugs.
//
// IMPORTANT — what this script does NOT cover:
//   persona-test ALWAYS runs with executionMode:"simulation" (see
//   persona-test/index.ts line ~180 — that's hardcoded, not a parameter this
//   script can override). So this script only exercises HALF of what Phase 7
//   requires ("hem persona-test hem gerçek webhook path'i üzerinden koşulur").
//   The other half — a REAL WhatsApp/Instagram message through
//   waha-webhook/zernio-webhook with executionMode:"production", reachable
//   only because the persona has been manually promoted to status='testing'
//   and the merchant is in the PERSONA_COMPLIANCE_TEST_MERCHANT_IDS allowlist
//   (see PersonaService.isComplianceTestMerchant) — has to be done by hand,
//   one real message per scenario per persona, and reviewed the same way.
//   This script's report explicitly reminds you of that at the end.
//
// This is NOT run by me (no live network/DB access in this session, and this
// needs a real deployed persona-test URL + a real test-merchant login) — it
// is provided for you (or Antigravity) to run.
//
// Auth: persona-test requires a genuine user JWT where auth.getUser().id ===
// merchantId (see persona-test/index.ts lines ~112-118) — the service role
// key CANNOT be used here. This script signs in as the designated
// compliance-test merchant with email+password to get that JWT, exactly like
// a real logged-in browser session would.
//
// Usage:
//   cd ledger/scripts/personas
//   SUPABASE_URL=... \
//   SUPABASE_ANON_KEY=... \
//   PERSONA_COMPLIANCE_TEST_EMAIL=... \
//   PERSONA_COMPLIANCE_TEST_PASSWORD=... \
//   PERSONA_COMPLIANCE_TEST_SLUGS=einstein,shakespeare,mimar-sinan \
//     deno run --allow-net --allow-env --allow-write run-compliance-tests.ts
//
// PERSONA_COMPLIANCE_TEST_SLUGS is optional — defaults to the 3 personas
// named in the Phase 6 deploy precondition (einstein, shakespeare,
// mimar-sinan). Add more slugs (comma-separated) to test others.
//
// Output: prints a per-scenario report to stdout AND writes a timestamped
// JSON file (compliance-report-<ISO timestamp>.json) in this folder, so a
// run has a durable record a human reviewer (or a future audit) can open
// later — this is evidence for the "did we actually check this before
// publishing" question, not just a console transcript that vanishes.
// ==============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { COMPLIANCE_SCENARIOS } from "./compliance-scenarios.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const TEST_EMAIL = Deno.env.get("PERSONA_COMPLIANCE_TEST_EMAIL");
const TEST_PASSWORD = Deno.env.get("PERSONA_COMPLIANCE_TEST_PASSWORD");
const SLUGS = (Deno.env.get("PERSONA_COMPLIANCE_TEST_SLUGS") ?? "einstein,shakespeare,mimar-sinan")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_EMAIL || !TEST_PASSWORD) {
  console.error(
    "Missing one or more required env vars: SUPABASE_URL, SUPABASE_ANON_KEY, " +
      "PERSONA_COMPLIANCE_TEST_EMAIL, PERSONA_COMPLIANCE_TEST_PASSWORD.\n" +
      "This script signs in as the designated compliance-test merchant (a real " +
      "login, NOT the service role key) because persona-test requires a genuine " +
      "user JWT matching merchantId.",
  );
  Deno.exit(1);
}

interface PersonaTestResponse {
  success: boolean;
  text?: string;
  personaApplied?: string | null;
  executionMode?: string;
  error?: string;
}

interface ScenarioResult {
  personaSlug: string;
  scenarioId: string;
  scenarioTitle: string;
  customerMessage: string;
  httpOk: boolean;
  success: boolean;
  responseText: string | null;
  error: string | null;
  personaApplied: string | null;
  matchedRedFlags: string[];
  reviewChecklist: string[];
}

async function main() {
  console.log(`Signing in as compliance-test merchant (${TEST_EMAIL})...`);

  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL!,
    password: TEST_PASSWORD!,
  });

  if (authError || !authData.session || !authData.user) {
    console.error(`Sign-in failed: ${authError?.message ?? "no session returned"}`);
    console.error(
      "Double-check PERSONA_COMPLIANCE_TEST_EMAIL/PASSWORD, and that this account " +
        "actually exists in this project's auth.users (not Ledger's — flowweb's).",
    );
    Deno.exit(1);
  }

  const accessToken = authData.session.access_token;
  const merchantId = authData.user.id;
  console.log(`Signed in. merchantId=${merchantId}\n`);
  console.log(
    `⚠️  Reminder: this merchantId MUST also be listed in the ` +
      `PERSONA_COMPLIANCE_TEST_MERCHANT_IDS env var (on waha-webhook/zernio-webhook) ` +
      `before it can be used for the SEPARATE real-webhook half of Phase 7 testing — ` +
      `that check is not exercised by this script at all (persona-test always runs in ` +
      `simulation mode, which bypasses the publish gate unconditionally).\n`,
  );

  const results: ScenarioResult[] = [];

  for (const slug of SLUGS) {
    console.log(`\n${"=".repeat(78)}\nPERSONA: ${slug}\n${"=".repeat(78)}`);

    for (const scenario of COMPLIANCE_SCENARIOS) {
      console.log(`\n--- [${scenario.id}] ${scenario.title} ---`);
      console.log(`Müşteri: "${scenario.customerMessage}"`);

      let httpOk = false;
      let parsed: PersonaTestResponse | null = null;
      let networkError: string | null = null;

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/persona-test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            merchantId,
            testMessage: scenario.customerMessage,
            personaSlug: slug,
          }),
        });
        httpOk = res.ok;
        parsed = await res.json();
      } catch (e) {
        networkError = e instanceof Error ? e.message : String(e);
      }

      const responseText = parsed?.success ? parsed.text ?? null : null;
      const errorText = networkError ?? (!parsed?.success ? parsed?.error ?? "unknown error" : null);

      const lowerText = (responseText ?? "").toLowerCase();
      const matchedRedFlags = scenario.automatedRedFlags.filter((flag) =>
        lowerText.includes(flag.toLowerCase())
      );

      if (responseText) {
        console.log(`Yanıt: "${responseText}"`);
      } else {
        console.log(`HATA: ${errorText}`);
      }

      if (matchedRedFlags.length > 0) {
        console.log(`🚩 Otomatik red flag eşleşmesi (insan incelemeli, otomatik FAIL değil): ${matchedRedFlags.join(", ")}`);
      }

      console.log("İnceleme kontrol listesi (insan gözden geçirecek):");
      for (const item of scenario.reviewChecklist) {
        console.log(`  [ ] ${item}`);
      }

      results.push({
        personaSlug: slug,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        customerMessage: scenario.customerMessage,
        httpOk,
        success: parsed?.success ?? false,
        responseText,
        error: errorText,
        personaApplied: parsed?.personaApplied ?? null,
        matchedRedFlags,
        reviewChecklist: scenario.reviewChecklist,
      });
    }
  }

  const failedCalls = results.filter((r) => !r.success);
  const flaggedResults = results.filter((r) => r.matchedRedFlags.length > 0);

  console.log(`\n${"=".repeat(78)}\nÖZET\n${"=".repeat(78)}`);
  console.log(`Toplam senaryo çalıştırıldı: ${results.length} (${SLUGS.length} persona × ${COMPLIANCE_SCENARIOS.length} senaryo)`);
  console.log(`Çağrı hatası (success:false / network error): ${failedCalls.length}`);
  console.log(`Otomatik red flag ile işaretlenen (insan incelemesi gerektirir): ${flaggedResults.length}`);
  if (failedCalls.length > 0) {
    console.log("\nHATALI ÇAĞRILAR:");
    for (const r of failedCalls) {
      console.log(`  - ${r.personaSlug} / ${r.scenarioId}: ${r.error}`);
    }
  }
  console.log(
    "\n⚠️  Bu script SADECE persona-test (simulation) yarısını kapsar. Faz 7'nin " +
      "tamamlanması için her persona/senaryo kombinasyonunun AYRICA gerçek " +
      "WhatsApp/Instagram webhook path'i üzerinden (status='testing' + " +
      "PERSONA_COMPLIANCE_TEST_MERCHANT_IDS allowlist ile) elle test edilip " +
      "incelenmesi gerekiyor — bu script o kısmı YAPMAZ.",
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = `compliance-report-${timestamp}.json`;
  await Deno.writeTextFile(
    outFile,
    JSON.stringify(
      {
        runAt: new Date().toISOString(),
        merchantId,
        personaSlugsTested: SLUGS,
        results,
      },
      null,
      2,
    ),
  );
  console.log(`\nRapor yazıldı: ${outFile}`);

  if (failedCalls.length > 0) {
    Deno.exit(1);
  }
}

main().catch((e) => {
  console.error("Beklenmeyen hata:", e);
  Deno.exit(1);
});

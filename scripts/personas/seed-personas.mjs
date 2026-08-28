// ==============================================================================
// PERSONA ENGINE — PHASE 1: Seed script
// ==============================================================================
// Upserts the JSON persona files in this folder into public.ai_personas.
//
// Scope & safety notes:
//   * This script ONLY writes to public.ai_personas (upsert by `slug`).
//     It never touches bot_settings, organization_ai_settings, or anything
//     under Ledger's own core/finance/audit/analytics/ai schemas.
//   * All seeded personas are inserted with status:"draft" (see the JSON
//     files) — per the locked guardrail, a persona cannot reach real
//     customer traffic until it is explicitly promoted to "published"
//     (Phase 7, after the compliance test suite passes). Running this
//     script is therefore safe to re-run at any time; it will never by
//     itself make a persona live.
//   * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars. This
//     script is NOT run by me (no live DB/network access in this session) —
//     it is provided for you (or Antigravity) to run once the migration
//     20260828120000_ai_personas_schema.sql has been applied.
//
// Usage:
//   cd scripts/personas
//   npm install @supabase/supabase-js
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node seed-personas.mjs
// ==============================================================================

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.\n' +
    'This script must be run with a SERVICE ROLE key (bypasses RLS) since\n' +
    'public.ai_personas only allows service_role to INSERT/UPDATE.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PERSONA_FILES = readdirSync(__dirname).filter(
  (f) => f.endsWith('.json') && f !== 'package.json'
);

async function main() {
  console.log(`Found ${PERSONA_FILES.length} persona file(s): ${PERSONA_FILES.join(', ')}`);

  let okCount = 0;
  let failCount = 0;

  for (const file of PERSONA_FILES) {
    const fullPath = path.join(__dirname, file);
    const raw = readFileSync(fullPath, 'utf-8');
    let persona;
    try {
      persona = JSON.parse(raw);
    } catch (e) {
      console.error(`  [SKIP] ${file}: invalid JSON (${e.message})`);
      failCount++;
      continue;
    }

    if (!persona.slug || !persona.name || !persona.identity_prompt) {
      console.error(`  [SKIP] ${file}: missing required field(s) (slug/name/identity_prompt)`);
      failCount++;
      continue;
    }

    const { error } = await supabase
      .from('ai_personas')
      .upsert(persona, { onConflict: 'slug' });

    if (error) {
      console.error(`  [FAIL] ${persona.slug}: ${error.message}`);
      failCount++;
    } else {
      console.log(`  [OK]   ${persona.slug} upserted (status: ${persona.status ?? 'draft'})`);
      okCount++;
    }
  }

  console.log(`\nDone. ${okCount} upserted, ${failCount} failed.`);
  if (failCount > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});

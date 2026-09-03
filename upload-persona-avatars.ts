import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import * as fs from "node:fs";
import * as path from "node:path";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://qybzidylewzsnmlofjul.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  Deno.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeName(str) {
  return str.toLowerCase()
    .replace(/[ıiİI]/g, 'i')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[şŞ]/g, 's')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

async function run() {
  const dir = Deno.args[0];
  if (!dir) {
    console.error("Please provide the directory path as the first argument.");
    Deno.exit(1);
  }

  const { data: personas, error: pErr } = await supabase.from('ai_personas').select('id, name, slug');
  if (pErr) throw pErr;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'));
  console.log(`Found ${files.length} images.`);

  let matched = 0;
  let skipped = [];

  for (const file of files) {
    const ext = path.extname(file);
    const baseName = path.basename(file, ext);
    const normalizedFile = normalizeName(baseName);
    
    // Find matching persona
    let matchedPersona = personas.find(p => {
      const normSlug = normalizeName(p.slug);
      const normName = normalizeName(p.name);
      return normName.includes(normalizedFile) || normSlug.includes(normalizedFile) || normalizedFile.includes(normSlug) || normalizedFile.includes(normName) ||
             (normalizedFile === 'adamesmith' && p.slug === 'adam-smith') ||
             (normalizedFile === 'albert' && p.slug === 'einstein') ||
             (normalizedFile === 'dedemkorkut' && p.slug === 'dede-korkut') ||
             (normalizedFile === 'russso' && p.slug === 'rousseau') ||
             (normalizedFile === 'aristotales' && p.slug === 'aristoteles') ||
             (normalizedFile === 'diojen' && p.slug === 'diyojen') ||
             (normalizedFile === 'tesla' && p.slug === 'tesla') ||
             (normalizedFile === 'williamshakespeare' && p.slug === 'shakespeare');
    });

    if (!matchedPersona) {
      console.log(`❌ No match found for file: ${file} (normalized: ${normalizedFile})`);
      skipped.push(file);
      continue;
    }

    console.log(`✅ Matched ${file} -> Persona: ${matchedPersona.name} (${matchedPersona.slug})`);

    const filePath = path.join(dir, file);
    const fileBuffer = fs.readFileSync(filePath);
    
    // Fixed storage path: no random hashes
    const storagePath = `${matchedPersona.slug}${ext}`;

    // Upload to storage bucket 'ai-personas'
    const { error: uploadError } = await supabase.storage
      .from('ai-personas')
      .upload(storagePath, fileBuffer, { contentType: 'image/png', upsert: true });

    if (uploadError) {
      console.error(`Failed to upload ${file}:`, uploadError.message);
      continue;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from('ai-personas').getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;

    // Update table
    const { error: updateError } = await supabase.from('ai_personas')
      .update({ avatar_url: publicUrl, thumbnail_url: publicUrl })
      .eq('id', matchedPersona.id);

    if (updateError) {
      console.error(`Failed to update DB for ${matchedPersona.slug}:`, updateError.message);
    } else {
      matched++;
      console.log(`   Updated avatar/thumbnail URLs for ${matchedPersona.slug}`);
    }
  }

  console.log(`\nReport: ${matched} avatars uploaded and linked.`);
}

run().catch(console.error);

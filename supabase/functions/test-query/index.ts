import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

    const logs: string[] = [];
    logs.push("--- E2E ONBOARDING & GUARD TEST BAŞLIYOR ---");

    const email = `test_guard_${Date.now()}@example.com`;
    const password = "password123";
    
    logs.push(`\n1. Kayıt Testi`);
      const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('email', 'volkanbulut73@gmail.com').single();
      if (!profile) {
          logs.push('Profile not found for volkanbulut73@gmail.com');
      } else {
          logs.push(`Profile found: ${profile.id}`);
          const { data: org } = await supabaseAdmin.from('organizations').select('*').eq('owner_id', profile.id).single();
          if (!org) {
             const { error: insertError } = await supabaseAdmin.from('organizations').insert({ owner_id: profile.id, name: null });
             if (insertError) logs.push(`Error inserting org: ${insertError.message}`);
             else logs.push(`Org inserted successfully for ${profile.id}`);
          } else {
             logs.push(`Org already exists: ${org.id}`);
          }
      }
      return new Response(JSON.stringify({ logs }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});

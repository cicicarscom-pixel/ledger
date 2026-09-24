import { serve } from "https://deno.land/std@0.177.0/http/server.ts"; 
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"; 

serve(async (req) => { 
  const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""); 
  const { data, error } = await supabaseAdmin.from('organization_members').select('*'); 
  return new Response(JSON.stringify(error || data), { headers: { "Content-Type": "application/json" } }); 
});

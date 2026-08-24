import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: corsHeaders });
    }

    // Client to verify the calling user
    const supabaseUserClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Verify if caller is super_admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await supabaseAdmin.from('profiles').select('is_super_admin').eq('id', user.id).single();
    
    if (!profile || !profile.is_super_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden: Requires Super Admin privileges' }), { status: 403, headers: corsHeaders });
    }

    const { action, targetUserId, payload } = await req.json();

    if (action === 'delete-user') {
      if (!targetUserId) throw new Error('targetUserId required');
      
      // Admin API silme işlemi
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true, message: 'User completely deleted' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    if (action === 'delete-organization') {
      if (!payload?.organizationId) throw new Error('organizationId required');
      
      const { error: deleteError } = await supabaseAdmin.from('organizations').delete().eq('id', payload.organizationId);
      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true, message: 'Organization completely deleted' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update-status') {
      if (!targetUserId || !payload?.status) throw new Error('targetUserId and status required');
      const { error: updateError } = await supabaseAdmin.from('profiles').update({ account_status: payload.status }).eq('id', targetUserId);
      if (updateError) throw updateError;
      
      return new Response(JSON.stringify({ success: true, message: `User status updated to ${payload.status}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: corsHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

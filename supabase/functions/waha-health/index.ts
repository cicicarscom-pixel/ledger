import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");
    
    // Yalnız servis rolü ile (JWT doğrulama cron tarafından sağlanır)
    if (!authHeader || !authHeader.includes(serviceKey)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: servers } = await admin.from('waha_servers').select('*').eq('is_active', true);
    if (!servers) return new Response(JSON.stringify({ success: true, message: "No active servers" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    for (const server of servers) {
      const baseUrl = server.base_url ?? Deno.env.get('WAHA_BASE_URL') ?? '';
      const finalUrl = baseUrl.endsWith('/api') ? baseUrl : baseUrl.endsWith('/') ? `${baseUrl}api` : `${baseUrl}/api`;
      const apiKey = Deno.env.get(server.api_key_secret_name) ?? '';

      const { count: assignedCount } = await admin
        .from('waha_session_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('server_id', server.id);

      const startTime = performance.now();
      let apiOk = false;
      let workingCount = 0;

      try {
        const res = await fetch(`${finalUrl}/sessions?all=true`, { 
          headers: { "X-Api-Key": apiKey, "Accept": "application/json" },
          signal: AbortSignal.timeout(10000)
        });
        
        if (res.ok) {
          apiOk = true;
          const sessions = await res.json() as any[];
          workingCount = sessions.filter(s => s.status === 'WORKING').length;

          // resolve alerts
          await admin.from('waha_alerts')
            .update({ resolved: true, resolved_at: new Date().toISOString() })
            .eq('server_id', server.id)
            .eq('kind', 'server_down')
            .eq('resolved', false);
        }
      } catch (e) {
        // failed to reach server
      }

      const latency = Math.round(performance.now() - startTime);

      if (!apiOk) {
         // Create alert if no active one
         const { data: openAlerts } = await admin.from('waha_alerts')
           .select('id')
           .eq('server_id', server.id)
           .eq('kind', 'server_down')
           .eq('resolved', false)
           .limit(1);
         if (!openAlerts || openAlerts.length === 0) {
            await admin.from('waha_alerts').insert({
               server_id: server.id,
               kind: 'server_down',
               message: `Server unreachable (Latency > 10s or error)`
            });
         }
      }

      await admin.from('waha_server_metrics').insert({
        server_id: server.id,
        sessions_assigned: assignedCount || 0,
        sessions_working: workingCount,
        api_ok: apiOk,
        api_latency_ms: latency
      });
    }

    // Cleanup 30 days old metrics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await admin.from('waha_server_metrics').delete().lt('created_at', thirtyDaysAgo);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("[waha-health]", error?.message);
    return new Response(JSON.stringify({ error: error?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

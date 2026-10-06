import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { canUseWhatsapp, normalizePhoneNumber } from "../shared/admin/wahaSession.ts";
import { resolveServer, resolveForOrg } from "../shared/infrastructure/waha/WahaServerResolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "UNAUTHORIZED" }, 401);

    const userClient = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "UNAUTHORIZED" }, 401);
    const name = user.id; // oturum adı

    const admin = createClient(supabaseUrl, serviceKey);
    const { action, phoneNumber } = await req.json().catch(() => ({} as any));

    // Get Org ID
    const { data: org } = await admin.from('organizations').select('id').eq('owner_id', name).maybeSingle();
    const orgId = org?.id;

    if (!orgId) {
       return json({ success: false, error: 'NO_ORG_FOUND' }, 400);
    }

    const findSession = async (server: any) => {
      const res = await fetch(`${server.baseUrl}/sessions?all=true`, { 
        headers: { "X-Api-Key": server.apiKey, Accept: "application/json", "Content-Type": "application/json" }
      });
      if (!res.ok) throw new Error(`WAHA oturum bilgisi alınamadı (${res.status})`);
      const sessions = (await res.json()) as any[];
      return sessions.find((s: any) => s?.name === name) ?? null; 
    };

    if (action === "status") {
      const server = await resolveForOrg(orgId);
      if (!server) return json({ success: false, error: 'BOT_NOT_SETUP' }, 404);
      const s = await findSession(server);
      return json({ success: true, data: s ? { name: s.name, status: s.status, me: s.me ?? null } : null });
    }

    const { data: profile } = await admin.from("profiles").select("account_status").eq("id", name).maybeSingle();
    if (!canUseWhatsapp(profile?.account_status)) return json({ success: false, error: "ACCOUNT_NOT_ACTIVE" }, 403);

    if (action === "start") {
      const { data: assignedServerId, error: assignErr } = await admin.rpc('assign_waha_server', { p_org: orgId });
      
      if (assignErr || !assignedServerId) {
        return json({ success: false, error: 'NO_CAPACITY', message: 'Şu an yeni WhatsApp bağlantısı açılamıyor, lütfen daha sonra deneyin.' }, 503);
      }

      const server = await resolveServer(assignedServerId);
      if (!server) return json({ success: false, error: 'SERVER_NOT_FOUND' }, 500);

      const existing = await findSession(server);
      if (existing?.status === "WORKING") return json({ success: true, data: { name: existing.name, status: existing.status, me: existing.me ?? null } });

      const webhookUrl = `${supabaseUrl}/functions/v1/waha-webhook?server=${server.serverId}`;
      const body = { 
        name, 
        config: { 
          webhooks: [{ 
            url: webhookUrl, 
            events: ["message", "session.status"],
            hmac: { key: server.webhookSecret }
          }] 
        }, 
        engine: "NOWEB" 
      };

      const wahaHeaders = { "X-Api-Key": server.apiKey, Accept: "application/json", "Content-Type": "application/json" };
      const startReq = () => fetch(`${server.baseUrl}/sessions/start`, { method: "POST", headers: wahaHeaders, body: JSON.stringify(body) });
      
      let res = await startReq();
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        if (res.status === 422 && String(err?.message ?? "").includes("already started")) {
          await fetch(`${server.baseUrl}/sessions/stop`, { method: "POST", headers: wahaHeaders, body: JSON.stringify({ name, logout: true }) });
          res = await startReq();
          if (!res.ok) return json({ success: false, error: "WAHA_AUTO_HEAL_FAILED" }, 502);
          await new Promise((r) => setTimeout(r, 4000));
        } else {
          return json({ success: false, error: String(err?.message ?? "WAHA_START_FAILED").slice(0, 200) }, 502);
        }
      }
      const data = await res.json().catch(() => ({}));
      return json({ success: true, data });
    }

    if (action === "qr") {
      const server = await resolveForOrg(orgId);
      if (!server) return json({ success: false, error: 'BOT_NOT_SETUP' }, 404);
      const res = await fetch(`${server.baseUrl}/${name}/auth/qr`, { headers: { "X-Api-Key": server.apiKey, Accept: "application/json" } });
      if (!res.ok) return json({ success: false, error: "WAHA_QR_FAILED" }, 502);
      return json({ success: true, data: await res.json() });
    }

    if (action === "pairing-code") {
      const server = await resolveForOrg(orgId);
      if (!server) return json({ success: false, error: 'BOT_NOT_SETUP' }, 404);
      const phone = normalizePhoneNumber(phoneNumber);
      if (!phone) return json({ success: false, error: "INVALID_PHONE" }, 400);
      const res = await fetch(`${server.baseUrl}/${name}/auth/request-code`, { 
        method: "POST", 
        headers: { "X-Api-Key": server.apiKey, Accept: "application/json", "Content-Type": "application/json" }, 
        body: JSON.stringify({ phoneNumber: phone }) 
      });
      if (!res.ok) return json({ success: false, error: "WAHA_PAIRING_FAILED" }, 502);
      return json({ success: true, data: await res.json() });
    }

    if (action === "stop") {
      const server = await resolveForOrg(orgId);
      if (!server) return json({ success: false, error: 'BOT_NOT_SETUP' }, 404);
      const res = await fetch(`${server.baseUrl}/sessions/stop`, { 
        method: "POST", 
        headers: { "X-Api-Key": server.apiKey, Accept: "application/json", "Content-Type": "application/json" }, 
        body: JSON.stringify({ name, logout: true }) 
      });
      if (!res.ok) return json({ success: false, error: "WAHA_STOP_FAILED" }, 502);
      return json({ success: true });
    }

    return json({ error: "UNKNOWN_ACTION" }, 400);
  } catch (error: any) {
    console.error("[waha-session]", error?.message);
    return json({ success: false, error: "INTERNAL_ERROR" }, 500);
  }
});

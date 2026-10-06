import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isValidSessionName, joinSessions } from "../shared/admin/wahaAdmin.ts";

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
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const userClient = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (isAdmin !== true) return json({ error: "Forbidden: Requires admin privileges" }, 403);

    const { action, session, serverId, baseUrl, apiKeySecretName } = await req.json().catch(() => ({}));

    // Fetch all active servers
    const { data: servers } = await admin.from('waha_servers').select('*').eq('is_active', true);
    if (!servers) return json({ error: "No servers found" }, 500);

    const listSessions = async (server: any) => {
      const baseUrl = server.base_url ?? Deno.env.get('WAHA_BASE_URL') ?? '';
      const finalUrl = baseUrl.endsWith('/api') ? baseUrl : baseUrl.endsWith('/') ? `${baseUrl}api` : `${baseUrl}/api`;
      const apiKey = Deno.env.get(server.api_key_secret_name) ?? '';
      try {
        const res = await fetch(`${finalUrl}/sessions?all=true`, { headers: { "X-Api-Key": apiKey, Accept: "application/json" } });
        if (!res.ok) return null;
        return await res.json();
      } catch (e) {
        return null;
      }
    };

    if (action === "list") {
      let allSessions: any[] = [];
      const wahaSessionMap = new Set<string>();
      const offlineServers = new Set<string>();

      for (const server of servers) {
        const sessions = await listSessions(server);
        if (sessions === null) {
           offlineServers.add(server.id);
           continue;
        }
        (sessions as any[]).forEach(s => {
          if (isValidSessionName(s.name)) {
            s.server_id = server.id;
            s.server_name = server.name;
            allSessions.push(s);
            wahaSessionMap.add(s.name);
          }
        });
      }

      const { data: assignments } = await admin.from('waha_session_assignments').select('org_id, server_id, organizations(owner_id)');
      const dbAssignedNames = new Map<string, string>(); // owner_id -> server_id
      assignments?.forEach(a => {
        const ownerId = Array.isArray(a.organizations) ? a.organizations[0]?.owner_id : a.organizations?.owner_id;
        if (ownerId) {
          dbAssignedNames.set(ownerId, a.server_id);
        }
      });

      // Mark mismatches
      allSessions.forEach(s => {
        const assignedServer = dbAssignedNames.get(s.name);
        if (!assignedServer) {
          s.orphan = true; // In WAHA but not assigned in DB
        } else if (assignedServer !== s.server_id) {
          s.mismatch = true; // Assigned to different server
        }
      });

      // Find assigned but missing in WAHA
      dbAssignedNames.forEach((assignedServerId, ownerId) => {
        if (!wahaSessionMap.has(ownerId) && !offlineServers.has(assignedServerId)) {
          allSessions.push({
            name: ownerId,
            status: "MISSING",
            server_id: assignedServerId,
            server_name: servers.find(sv => sv.id === assignedServerId)?.name ?? 'Unknown',
            missing_in_waha: true
          });
        }
      });

      const names = allSessions.map((s) => s?.name).filter(isValidSessionName);
      const [{ data: profiles }, { data: orgs }] = await Promise.all([
        admin.from("profiles").select("id, business_name, email, account_status").in("id", names),
        admin.from("organizations").select("id, owner_id, name").in("owner_id", names),
      ]);
      
      const rows = joinSessions(allSessions, profiles ?? [], orgs ?? []);
      
      // We pass the server properties along with joinSessions results
      const finalRows = rows.map(r => {
        const orig = allSessions.find(s => s.name === r.session);
        return {
          ...r,
          server_id: orig?.server_id,
          server_name: orig?.server_name,
          orphan: orig?.orphan || false,
          missing_in_waha: orig?.missing_in_waha || false,
          mismatch: orig?.mismatch || false
        };
      });

      return json({ success: true, rows: finalRows });
    }

    if (action === "refresh-webhooks") {
      if (!serverId) return json({ error: "Missing serverId" }, 400);
      const server = servers.find(s => s.id === serverId);
      if (!server) return json({ error: "Server not found or inactive" }, 404);

      const baseUrl = server.base_url ?? Deno.env.get('WAHA_BASE_URL') ?? '';
      const finalUrl = baseUrl.endsWith('/api') ? baseUrl : baseUrl.endsWith('/') ? `${baseUrl}api` : `${baseUrl}/api`;
      const apiKey = Deno.env.get(server.api_key_secret_name) ?? '';
      const webhookSecret = Deno.env.get(server.webhook_secret_name) ?? '';

      if (!apiKey || !webhookSecret) {
         return json({ error: "Server secrets missing" }, 500);
      }

      const { data: assignments } = await admin.from('waha_session_assignments').select('org_id, organizations(owner_id)').eq('server_id', serverId);
      if (!assignments) return json({ error: "No assignments found" }, 404);

      let successCount = 0;
      let failCount = 0;

      for (const a of assignments) {
        const ownerId = Array.isArray(a.organizations) ? a.organizations[0]?.owner_id : a.organizations?.owner_id;
        if (!ownerId) continue;

        const webhookUrl = `${supabaseUrl}/functions/v1/waha-webhook?server=${serverId}`;
        const configBody = {
          config: {
            webhooks: [{
              url: webhookUrl,
              events: ["message", "session.status"],
              hmac: { key: webhookSecret }
            }]
          }
        };

        try {
          const res = await fetch(`${finalUrl}/sessions/${ownerId}`, {
            method: "PUT",
            headers: { "X-Api-Key": apiKey, "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(configBody)
          });
          if (res.ok) successCount++;
          else failCount++;
        } catch (e) {
          failCount++;
        }
      }

      return json({ success: true, successCount, failCount });
    }

    if (action === "test-connection") {
      if (typeof baseUrl !== "string" || !baseUrl.startsWith("https://")) {
        return json({ ok: false, error: "HTTPS_REQUIRED" });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(baseUrl);
      } catch (e) {
        return json({ ok: false, error: "INVALID_URL" });
      }

      const host = parsedUrl.hostname.replace(/[\[\]]/g, '');
      const ssrfRegex = /^(localhost|.*\.local|.*\.internal|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.\d+\.\d+\.\d+|::1|fc[0-9a-f]{2}:.*|fd[0-9a-f]{2}:.*|fe80:.*)$/i;
      if (ssrfRegex.test(host)) {
        return json({ ok: false, error: "HOST_NOT_ALLOWED" });
      }

      if (typeof apiKeySecretName !== "string" || !/^WAHA_API_KEY(_[A-Z0-9]+)*$/.test(apiKeySecretName)) {
        return json({ ok: false, error: "INVALID_SECRET_NAME" });
      }

      const apiKey = Deno.env.get(apiKeySecretName);
      if (!apiKey) {
        return json({ ok: false, error: "SECRET_MISSING", secretName: apiKeySecretName });
      }

      const finalUrl = baseUrl.endsWith("/api") ? baseUrl : baseUrl.endsWith("/") ? `${baseUrl}api` : `${baseUrl}/api`;

      const start = performance.now();
      try {
        const res = await fetch(`${finalUrl}/sessions?all=true`, {
          method: "GET",
          headers: { "X-Api-Key": apiKey, "Accept": "application/json" },
          signal: AbortSignal.timeout(10000),
          redirect: "manual"
        });
        const latencyMs = Math.round(performance.now() - start);

        if (res.ok) {
          const sessions = await res.json();
          return json({ ok: true, latencyMs, sessionCount: sessions.length });
        } else if (res.status === 401 || res.status === 403) {
          return json({ ok: false, error: "WAHA_AUTH_FAILED", status: res.status });
        } else {
          return json({ ok: false, error: "WAHA_HTTP_ERROR", status: res.status });
        }
      } catch (e: any) {
        if (e.name === "TimeoutError") {
          return json({ ok: false, error: "TIMEOUT" });
        }
        return json({ ok: false, error: "UNREACHABLE" });
      }
    }

    if (action === "disconnect") {
      if (!isValidSessionName(session)) return json({ error: "Geçersiz oturum adı" }, 400);
      
      // Fallback loop through servers
      let targetServer: any = null;
      for (const s of servers) {
         const wahaSessions = await listSessions(s) as any[];
         if (wahaSessions && wahaSessions.some(ws => ws.name === session)) {
            targetServer = s; break;
         }
      }

      if (!targetServer) return json({ error: "Oturum bulunamadı" }, 404);

      const baseUrl = targetServer.base_url ?? Deno.env.get('WAHA_BASE_URL') ?? '';
      const finalUrl = baseUrl.endsWith('/api') ? baseUrl : baseUrl.endsWith('/') ? `${baseUrl}api` : `${baseUrl}/api`;
      const apiKey = Deno.env.get(targetServer.api_key_secret_name) ?? '';

      const steps: Record<string, string> = {};
      const call = async (label: string, method: string, path: string) => {
        try {
          const r = await fetch(`${finalUrl}/sessions/${session}${path}`, { method, headers: { "X-Api-Key": apiKey, "Content-Type": "application/json" } });
          steps[label] = r.ok || r.status === 404 ? "ok" : `hata ${r.status}`;
        } catch (e: any) {
          steps[label] = `hata ${String(e?.message ?? e).slice(0, 80)}`;
        }
      };
      await call("logout", "POST", "/logout");
      await call("stop", "POST", "/stop");
      await call("delete", "DELETE", "");

      const { data: org } = await admin.from("organizations").select("id").eq("owner_id", session).maybeSingle();
      if (org?.id) {
        await admin.from("organization_audit_events").insert({
          organization_id: org.id, event_type: "waha_disconnected_by_admin", actor_user_id: user.id,
          new_data: { session, steps }, source: "admin-waha",
        });
      }
      return json({ success: Object.values(steps).every((v) => v === "ok"), steps });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error: any) {
    console.error("[admin-waha]", error?.message);
    return json({ error: error?.message ?? "Bilinmeyen hata" }, 500);
  }
});

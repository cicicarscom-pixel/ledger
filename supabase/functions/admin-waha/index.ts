import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isValidSessionName, joinSessions } from "../shared/admin/wahaAdmin.ts";

// Admin paneli: bağlı WhatsApp (WAHA) oturumlarını işletmelerle eşleştirir ve oturumu keser.
// YALNIZ super_admin. WAHA adresi/anahtarı yalnız burada (sunucu ortam değişkenleri); istemciye sızmaz.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function wahaBase(): string {
  const url = Deno.env.get("WAHA_BASE_URL");
  if (!url) throw new Error("WAHA_BASE_URL tanımlı değil");
  return url.replace(/\/+$/, "").replace(/\/api$/, "") + "/api";
}
function wahaHeaders(): Record<string, string> {
  const key = Deno.env.get("WAHA_API_KEY");
  if (!key) throw new Error("WAHA_API_KEY tanımlı değil");
  return { "X-Api-Key": key, Accept: "application/json", "Content-Type": "application/json" };
}

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
    // Yönetici yetkisinin tek kaynağı public.is_admin() (admin_users tablosu) — admin paneli ve RLS ile aynı.
    // Kullanıcının kendi JWT'siyle çağrılır (auth.uid() çözülür).
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (isAdmin !== true) return json({ error: "Forbidden: Requires admin privileges" }, 403);

    const { action, session } = await req.json().catch(() => ({}));

    const listSessions = async () => {
      const res = await fetch(`${wahaBase()}/sessions?all=true`, { headers: wahaHeaders() });
      if (!res.ok) throw new Error(`WAHA oturumları alınamadı (${res.status})`);
      return await res.json();
    };

    if (action === "list") {
      const sessions = await listSessions();
      const names = (sessions as any[]).map((s) => s?.name).filter(isValidSessionName);
      const [{ data: profiles }, { data: orgs }] = await Promise.all([
        admin.from("profiles").select("id, business_name, email, account_status").in("id", names),
        admin.from("organizations").select("id, owner_id, name").in("owner_id", names),
      ]);
      return json({ success: true, rows: joinSessions(sessions, profiles ?? [], orgs ?? []) });
    }

    if (action === "disconnect") {
      if (!isValidSessionName(session)) return json({ error: "Geçersiz oturum adı" }, 400);
      // Yalnız WAHA'da gerçekten var olan oturum kesilir.
      const sessions = (await listSessions()) as any[];
      if (!sessions.some((s) => s?.name === session)) return json({ error: "Oturum bulunamadı" }, 404);

      // Sırayla: WhatsApp cihaz bağlantısını kopar (logout) → durdur (stop) → yapılandırmayı sil (kendiliğinden yeniden başlamasın).
      const steps: Record<string, string> = {};
      const call = async (label: string, method: string, path: string) => {
        try {
          const r = await fetch(`${wahaBase()}/sessions/${session}${path}`, { method, headers: wahaHeaders() });
          steps[label] = r.ok || r.status === 404 ? "ok" : `hata ${r.status}`;
        } catch (e: any) {
          steps[label] = `hata ${String(e?.message ?? e).slice(0, 80)}`;
        }
      };
      await call("logout", "POST", "/logout");
      await call("stop", "POST", "/stop");
      await call("delete", "DELETE", "");

      // Denetim kaydı (işletme bulunursa)
      const { data: org } = await admin.from("organizations").select("id").eq("owner_id", session).maybeSingle();
      if (org?.id) {
        await admin.from("organization_audit_events").insert({
          organization_id: org.id, event_type: "waha_disconnected_by_admin", actor_user_id: user.id,
          new_data: { session, steps }, source: "admin-waha",
        });
      }
      console.log(`[admin-waha] ${user.id} oturumu kesti: ${session}`, steps);
      return json({ success: Object.values(steps).every((v) => v === "ok"), steps });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error: any) {
    console.error("[admin-waha]", error?.message);
    return json({ error: error?.message ?? "Bilinmeyen hata" }, 500);
  }
});

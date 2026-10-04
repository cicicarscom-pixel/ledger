import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { canUseWhatsapp, normalizePhoneNumber } from "../shared/admin/wahaSession.ts";

// Kullanıcının KENDİ WhatsApp oturumu (web + mobil). WAHA adresi/anahtarı yalnız burada; istemciler anahtar taşımaz.
// Oturum adı = çağıranın auth.users.id'si (JWT'den; istemci oturum adı GÖNDEREMEZ). Sözleşme değişmez: waha-webhook ve admin-waha aynı adı kullanır.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const WEBHOOK_URL = "https://qybzidylewzsnmlofjul.supabase.co/functions/v1/waha-webhook";

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
    if (!authHeader) return json({ error: "UNAUTHORIZED" }, 401);

    const userClient = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "UNAUTHORIZED" }, 401);
    const name = user.id; // oturum adı

    const admin = createClient(supabaseUrl, serviceKey);
    const { action, phoneNumber } = await req.json().catch(() => ({} as any));

    const findSession = async () => {
      const res = await fetch(`${wahaBase()}/sessions?all=true`, { headers: wahaHeaders() });
      if (!res.ok) throw new Error(`WAHA oturum bilgisi alınamadı (${res.status})`);
      const sessions = (await res.json()) as any[];
      return sessions.find((s) => s?.name === name) ?? null; // yalnız çağıranın oturumu döner
    };

    if (action === "status") {
      const s = await findSession();
      return json({ success: true, data: s ? { name: s.name, status: s.status, me: s.me ?? null } : null });
    }

    // Aşağıdakiler yeni bağlantı/kimlik doğrulama başlatır: hesap etkin olmalı.
    const { data: profile } = await admin.from("profiles").select("account_status").eq("id", name).maybeSingle();
    if (!canUseWhatsapp(profile?.account_status)) return json({ success: false, error: "ACCOUNT_NOT_ACTIVE" }, 403);

    if (action === "start") {
      const body = { name, config: { webhooks: [{ url: WEBHOOK_URL, events: ["message", "session.status"] }] }, engine: "NOWEB" };
      const start = () => fetch(`${wahaBase()}/sessions/start`, { method: "POST", headers: wahaHeaders(), body: JSON.stringify(body) });
      let res = await start();
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        if (res.status === 422 && String(err?.message ?? "").includes("already started")) {
          // Otomatik onarım: durdur (logout ile) ve yeniden başlat
          await fetch(`${wahaBase()}/sessions/stop`, { method: "POST", headers: wahaHeaders(), body: JSON.stringify({ name, logout: true }) });
          res = await start();
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
      const res = await fetch(`${wahaBase()}/${name}/auth/qr`, { headers: wahaHeaders() });
      if (!res.ok) return json({ success: false, error: "WAHA_QR_FAILED" }, 502);
      return json({ success: true, data: await res.json() });
    }

    if (action === "pairing-code") {
      const phone = normalizePhoneNumber(phoneNumber);
      if (!phone) return json({ success: false, error: "INVALID_PHONE" }, 400);
      const res = await fetch(`${wahaBase()}/${name}/auth/request-code`, { method: "POST", headers: wahaHeaders(), body: JSON.stringify({ phoneNumber: phone }) });
      if (!res.ok) return json({ success: false, error: "WAHA_PAIRING_FAILED" }, 502);
      return json({ success: true, data: await res.json() });
    }

    return json({ error: "UNKNOWN_ACTION" }, 400);
  } catch (error: any) {
    console.error("[waha-session]", error?.message);
    return json({ success: false, error: "INTERNAL_ERROR" }, 500);
  }
});

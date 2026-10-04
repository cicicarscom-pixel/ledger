import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

// Fatura/fiş görselinin kısa ömürlü imzalı adresi. finance_receipts kovası ÖZELDİR; belgeye kaydedilen "public" adres
// çalışmaz. Kimlik yalnız JWT'den çözülür; belge, çağıranın işletmesine ait değilse adres verilmez.
// verify_jwt AÇIK. Gövde: { documentId: uuid }. Yanıt: { url } ya da { url: null }.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BUCKET = "finance_receipts";
const TTL_SECONDS = 3600;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

/** image_url içinden kova içi yolu çıkarır: .../object/(public|sign)/finance_receipts/<yol>[?...] */
function pathInBucket(imageUrl: string): string | null {
  const marker = `/${BUCKET}/`;
  const i = imageUrl.indexOf(marker);
  if (i < 0) return null;
  const raw = imageUrl.slice(i + marker.length).split("?")[0];
  try {
    const path = decodeURIComponent(raw);
    return path && !path.includes("..") ? path : null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "UNAUTHORIZED" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "UNAUTHORIZED" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const documentId = typeof body.documentId === "string" ? body.documentId : "";
    if (!UUID_RE.test(documentId)) return json({ error: "INVALID_REQUEST" }, 400);

    // Çağıranın işletmeleri: sahibi olduğu + üyesi olduğu
    const [{ data: owned }, { data: member }] = await Promise.all([
      admin.from("organizations").select("id").eq("owner_id", userId),
      admin.from("organization_members").select("organization_id").eq("user_id", userId),
    ]);
    const orgIds = new Set<string>([
      ...(owned ?? []).map((o: any) => o.id),
      ...(member ?? []).map((m: any) => m.organization_id),
    ]);
    if (orgIds.size === 0) return json({ error: "ORGANIZATION_NOT_FOUND" }, 404);

    const { data: doc } = await admin.from("finance_documents")
      .select("organization_id, image_url").eq("id", documentId).maybeSingle();
    if (!doc || !orgIds.has(doc.organization_id)) return json({ error: "NOT_FOUND" }, 404);
    if (!doc.image_url) return json({ url: null });

    const path = pathInBucket(String(doc.image_url));
    if (!path) return json({ url: null });

    const { data: signed, error: signErr } = await admin.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
    if (signErr || !signed?.signedUrl) return json({ url: null });
    return json({ url: signed.signedUrl, expiresIn: TTL_SECONDS });
  } catch (error: any) {
    console.error("[finance-receipt-url] hata:", error?.message ?? error);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
});

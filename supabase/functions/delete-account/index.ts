import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

// Hesap silme (Google Play / KVKK): çağıran kullanıcının hesabını ve işletme verisini TAMAMEN siler.
// verify_jwt AÇIK. Kimlik yalnız JWT'den çözülür; başka kullanıcının hesabı silinemez.
// Gövde: { confirm: "DELETE_MY_ACCOUNT" } (yanlışlıkla çağrıyı önler; istemci kullanıcıya ayrıca onay sorar).
// Sıra: bilgileri topla → dış hizmetleri temizle (WhatsApp oturumu, Zernio hesapları, depolama; hatalar silmeyi durdurmaz)
//       → engelleyen yabancı anahtarları temizle → auth.users sil (profil, işletme ve bağlı veri CASCADE ile gider).

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
const CONFIRM = "DELETE_MY_ACCOUNT";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function wahaBase(): string | null {
  const url = Deno.env.get("WAHA_BASE_URL");
  if (!url) return null;
  return url.endsWith("/api") ? url : url.endsWith("/") ? `${url}api` : `${url}/api`;
}

async function bestEffort(label: string, fn: () => Promise<unknown>) {
  try { await fn(); } catch (e) { console.warn(`[delete-account] ${label} atlandı:`, (e as Error)?.message ?? e); }
}

/** .../object/(public|sign)/<bucket>/<yol>?... → yol */
function pathInBucket(url: string, bucket: string): string | null {
  const marker = `/${bucket}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  try {
    const p = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
    return p && !p.includes("..") ? p : null;
  } catch { return null; }
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
    if (body?.confirm !== CONFIRM) return json({ error: "CONFIRMATION_REQUIRED" }, 400);

    // 1) Silinecek verinin dış kaynaklarını topla
    const { data: info, error: infoErr } = await admin.rpc("account_deletion_info", { p_user: userId });
    if (infoErr || !info) {
      console.error("[delete-account] info hatası:", infoErr?.message);
      return json({ error: "INFO_FAILED" }, 500);
    }
    if (info.isAdmin) return json({ error: "ADMIN_ACCOUNT" }, 403); // yönetici hesabı yalnız yönetim panelinden kaldırılır

    // 2) WhatsApp oturumu (oturum adı = kullanıcı kimliği)
    const base = wahaBase();
    const wahaKey = Deno.env.get("WAHA_API_KEY");
    if (base && wahaKey) {
      const headers = { "X-Api-Key": wahaKey, Accept: "application/json", "Content-Type": "application/json" };
      await bestEffort("waha logout", () => fetch(`${base}/sessions/${userId}/logout`, { method: "POST", headers }));
      await bestEffort("waha delete", () => fetch(`${base}/sessions/${userId}`, { method: "DELETE", headers }));
    }

    // 3) Zernio sosyal medya hesapları
    const zKey = Deno.env.get("ZERNIO_API_KEY");
    if (zKey) {
      for (const accountId of (info.zernioAccountIds ?? []) as string[]) {
        await bestEffort(`zernio hesap ${accountId}`, () =>
          fetch(`https://api.zernio.com/v1/accounts/${encodeURIComponent(accountId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${zKey}` } }));
      }
    }

    // 4) Depolama: fatura görselleri, gönderi medyası, avatar klasörü
    const receiptPaths = ((info.receiptUrls ?? []) as string[]).map((u) => pathInBucket(u, "finance_receipts")).filter(Boolean) as string[];
    if (receiptPaths.length) await bestEffort("fatura görselleri", () => admin.storage.from("finance_receipts").remove(receiptPaths));
    const byBucket = new Map<string, string[]>();
    for (const m of (info.postMedia ?? []) as { bucket: string; path: string }[]) {
      if (!byBucket.has(m.bucket)) byBucket.set(m.bucket, []);
      byBucket.get(m.bucket)!.push(m.path);
    }
    for (const [bucket, paths] of byBucket) await bestEffort(`medya ${bucket}`, () => admin.storage.from(bucket).remove(paths));
    await bestEffort("avatar", async () => {
      const { data: files } = await admin.storage.from("avatars").list(userId, { limit: 1000 });
      if (files?.length) await admin.storage.from("avatars").remove(files.map((f: any) => `${userId}/${f.name}`));
    });

    // 5) Engelleyen yabancı anahtarları temizle, sonra kullanıcıyı sil (CASCADE ile profil + işletme + veri gider)
    const { error: unblockErr } = await admin.rpc("account_deletion_unblock", { p_user: userId });
    if (unblockErr) {
      console.error("[delete-account] unblock hatası:", unblockErr.message);
      return json({ error: "UNBLOCK_FAILED" }, 500);
    }
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error("[delete-account] deleteUser hatası:", delErr.message);
      return json({ error: "DELETE_FAILED" }, 500);
    }

    console.log(`[delete-account] hesap silindi: ${userId}`);
    return json({ success: true });
  } catch (error: any) {
    console.error("[delete-account] hata:", error?.message ?? error);
    return json({ error: "INTERNAL_ERROR" }, 500);
  }
});

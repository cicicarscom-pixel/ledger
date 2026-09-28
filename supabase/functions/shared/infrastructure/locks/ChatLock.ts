// Aynı sohbetten (işletme + kanal + müşteri) gelen mesajların SIRAYLA işlenmesini sağlar.
// Neden: WhatsApp'ta müşteri birkaç saniye arayla iki mesaj yazınca iki ayrı işlem
// aynı anda çalışıyor, ikisi de eski geçmişi görüyor ve müşteriye çelişkili yanıtlar gidiyordu
// (28.09.2026 olayı). Kilit veritabanındaki `ai_chat_locks` tablosunda tutulur; edge function
// örnekleri arasında paylaşılır. Kilit alınamazsa (RPC yok / hata / zaman aşımı) mesaj yine
// işlenir: kilit bir iyileştirmedir, mesajı asla düşürmez.

const WAIT_TIMEOUT_MS = 30_000;
const POLL_MS = 1_000;
const LOCK_TTL_SECONDS = 120;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function acquireChatLock(supabase: any, key: string, holder: string): Promise<boolean> {
  const started = Date.now();
  let waited = false;
  while (Date.now() - started < WAIT_TIMEOUT_MS) {
    const { data, error } = await supabase.rpc("acquire_ai_chat_lock", {
      p_key: key,
      p_holder: holder,
      p_ttl_seconds: LOCK_TTL_SECONDS,
    });
    if (error) {
      console.warn("[ChatLock] acquire RPC hatası, kilitsiz devam:", error.message ?? error);
      return false;
    }
    if (data === true) {
      if (waited) console.log(`[ChatLock] kilit ${Date.now() - started} ms beklendikten sonra alındı`);
      return true;
    }
    waited = true;
    await sleep(POLL_MS);
  }
  console.warn(`[ChatLock] ${WAIT_TIMEOUT_MS} ms içinde kilit alınamadı, kilitsiz devam`);
  return false;
}

export async function releaseChatLock(supabase: any, key: string, holder: string): Promise<void> {
  const { error } = await supabase.rpc("release_ai_chat_lock", { p_key: key, p_holder: holder });
  if (error) console.warn("[ChatLock] release RPC hatası:", error.message ?? error);
}

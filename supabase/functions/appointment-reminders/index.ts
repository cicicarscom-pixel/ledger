import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { WahaClient } from "../shared/infrastructure/clients/WahaClient.ts";
import { chatIdFromDigits, maskChatId, renderReminderTemplate } from "../shared/reminders/reminderMessage.ts";

/**
 * WhatsApp randevu hatırlatma. pg_cron ile ~10 dk'da bir çağrılır (yalnız service-role).
 * Hangi randevuya mesaj gideceğine veritabanı karar verir (claim_due_reminders): açık işletme, Approved randevu,
 * zaman penceresi, sessiz saatler, tekrar yok. Bu fonksiyon yalnız gönderir ve sonucu kaydeder.
 * Gövde (isteğe bağlı): { dryRun: true } → hiçbir şey göndermez/kaydetmez, gönderilecekleri (telefon maskeli) listeler.
 */

const MAX_RUN_MS = 100_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "CONFIG_MISSING" }, 500);

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (token !== serviceKey) return json({ error: "Forbidden: service-role only" }, 403);

  const body = await req.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;
  const limit = Math.min(50, Math.max(1, Math.floor(Number(body?.limit) || 20)));

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: rows, error } = await supabase.rpc("claim_due_reminders_v2", { p_limit: limit, p_dry: dryRun });
  if (error) {
    console.error("[appointment-reminders] claim hatası:", error.message);
    return json({ error: "CLAIM_FAILED" }, 500);
  }
  const items = (rows ?? []) as any[];

  if (dryRun) {
    return json({
      dryRun: true,
      count: items.length,
      items: items.map((r) => {
        const chatId = chatIdFromDigits(r.phone_digits);
        return {
          appointmentId: r.appointment_id,
          to: chatId ? maskChatId(chatId) : null,
          text: renderReminderTemplate(r.template, { orgName: r.org_name, customerName: r.customer_name, startsAt: r.starts_at, timezone: r.timezone, locale: r.locale, doctor: r.doctor, service: r.service }),
        };
      }),
    });
  }

  const waha = new WahaClient();
  const started = Date.now();
  let sent = 0, failed = 0, skipped = 0;

  for (const r of items) {
    if (Date.now() - started > MAX_RUN_MS) {
      await supabase.rpc("mark_reminder_result", { p_id: r.reminder_id, p_status: "failed", p_error: "Süre doldu; sonraki çalışmada denenecek" });
      failed++;
      continue;
    }
    const chatId = chatIdFromDigits(r.phone_digits);
    if (!chatId) {
      await supabase.rpc("mark_reminder_result", { p_id: r.reminder_id, p_status: "skipped", p_error: "Geçersiz telefon" });
      skipped++;
      continue;
    }
    const text = renderReminderTemplate(r.template, { orgName: r.org_name, customerName: r.customer_name, startsAt: r.starts_at, timezone: r.timezone, locale: r.locale, doctor: r.doctor, service: r.service });
    try {
      await waha.sendWhatsAppMessage(r.owner_id, chatId, text);
      await supabase.rpc("mark_reminder_result", { p_id: r.reminder_id, p_status: "sent", p_error: null });
      sent++;
      // Denetim: gönderilen mesaj konuşma günlüğüne düşer (hata sessizce yutulur).
      try {
        await supabase.from("ai_communication_logs").insert({ platform: "whatsapp", sender_id: chatId, user_message: "[randevu hatırlatma]", ai_response: text, org_id: r.org_id });
      } catch (_e) { /* günlük yazılamasa da gönderim başarılıdır */ }
    } catch (e: any) {
      const msg = String(e?.message ?? e).slice(0, 300);
      console.error(`[appointment-reminders] gönderilemedi (${maskChatId(chatId)}):`, msg);
      await supabase.rpc("mark_reminder_result", { p_id: r.reminder_id, p_status: "failed", p_error: msg });
      failed++;
    }
    // WhatsApp'ın toplu gönderim algısını önlemek için mesajlar arasında kısa, değişken bekleme.
    await sleep(1500 + Math.floor(Math.random() * 1500));
  }

  console.log(`[appointment-reminders] claimed=${items.length} sent=${sent} failed=${failed} skipped=${skipped}`);
  return json({ claimed: items.length, sent, failed, skipped });
});

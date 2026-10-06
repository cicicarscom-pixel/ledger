import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { createMessageUseCase } from "../shared/container.ts";
import { isAccountBlocked } from "../shared/admin/wahaSession.ts";
import { resolveServer, resolveForSession, WahaServer } from "../shared/infrastructure/waha/WahaServerResolver.ts";
import { verifyWahaHmac, isLegacyWindowOpen } from "../shared/infrastructure/waha/webhookAuth.ts";

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const useCase = createMessageUseCase(supabaseAdmin);

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(req.url);
    const serverParam = url.searchParams.get('server');
    const hmacHeader = req.headers.get('X-Webhook-Hmac');

    const rawBody = await req.text();
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const sessionName = payload.session;
    if (!sessionName) {
      return new Response(JSON.stringify({ success: true }), { status: 200 }); // Ignore
    }

    if (serverParam) {
      let server: WahaServer | null = null;
      try {
        server = await resolveServer(serverParam);
      } catch (err) {
        return new Response('Unauthorized Server', { status: 401 });
      }

      if (!server) {
        return new Response('Unauthorized Server', { status: 401 });
      }

      const isValid = await verifyWahaHmac(rawBody, hmacHeader, server.webhookSecret);
      if (!isValid) {
        // Log alert if not recently logged
        const { data: recentAlerts } = await supabaseAdmin
          .from('waha_alerts')
          .select('id')
          .eq('server_id', server.serverId)
          .eq('kind', 'webhook_auth_failed')
          .is('resolved_at', null)
          .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
          .limit(1);

        if (!recentAlerts || recentAlerts.length === 0) {
          await supabaseAdmin.from('waha_alerts').insert({
            server_id: server.serverId,
            kind: 'webhook_auth_failed',
            message: 'HMAC signature verification failed for webhook request.'
          });
        }
        return new Response('Unauthorized HMAC', { status: 401 });
      }

      let sessionServer: WahaServer | null = null;
      try {
        sessionServer = await resolveForSession(sessionName);
      } catch (err) {
        return new Response('Forbidden Session Mapping', { status: 403 });
      }

      if (!sessionServer || sessionServer.serverId !== server.serverId) {
        return new Response('Forbidden Session Mapping', { status: 403 });
      }

    } else {
      if (!isLegacyWindowOpen()) {
        return new Response('Legacy webhook window closed', { status: 401 });
      }
      let sessionServer: WahaServer | null = null;
      try {
        sessionServer = await resolveForSession(sessionName);
      } catch (err) {
        return new Response('Unauthorized legacy session', { status: 401 });
      }

      if (!sessionServer || sessionServer.fillOrder !== 1) {
        return new Response('Unauthorized legacy session', { status: 401 });
      }
    }

    console.log('[WAHA WEBHOOK RAW PAYLOAD]', JSON.stringify(payload));

    if (payload.event === 'message') {
      const merchantId = payload.session;
      const rawFromPayload = payload.payload ?? payload.data;
      const remoteJidAlt: string | undefined = rawFromPayload?._data?.key?.remoteJidAlt;
      const realPhoneFromAlt = remoteJidAlt ? remoteJidAlt.replace('@s.whatsapp.net', '@c.us') : null;
      const from = realPhoneFromAlt || rawFromPayload?.from;
      const body = payload.payload?.body || payload.data?.body;
      const isFromMe = payload.payload?.fromMe || payload.data?.id?.fromMe;

      const pushName: string | null = rawFromPayload?._data?.pushName?.trim() || null;

      // GRUP ve DURUM (Status) Koruması:
      const isGroup = from && from.includes('@g.us');
      const isBroadcast = from && from.includes('@broadcast');

      // Sadece dışarıdan gelen (müşteri), grup/durum olmayan, kişisel mesajlara yanıt ver (@c.us)
      if (!isFromMe && !isGroup && !isBroadcast && merchantId && from && body) {
        console.log(`[WAHA WEBHOOK] Gelen Mesaj: ${from} -> "${body}"`);

        // Askıya alınmış / banlanmış hesabın botu cevap vermez (admin panelindeki durum zorlanır).
        const { data: owner } = await supabaseAdmin.from('profiles').select('account_status').eq('id', merchantId).maybeSingle();
        if (isAccountBlocked(owner?.account_status)) {
          console.log(`[WAHA WEBHOOK] Hesap ${owner?.account_status}: bot cevabı atlandı (${merchantId})`);
          return new Response(JSON.stringify({ success: true, skipped: 'account_blocked' }), { headers: { 'Content-Type': 'application/json' }, status: 200 });
        }

        // Use Omnichannel Router
        await useCase.execute(supabaseAdmin, {
          merchantId: merchantId,
          source: 'whatsapp',
          senderId: from,
          userMessage: body,
          customerName: pushName
        });
      }
    }

    // WAHA isteklerini hiçbir zaman timeout'a düşürmemek için hemen 200 dönüyoruz
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});

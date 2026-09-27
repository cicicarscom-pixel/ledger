import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";
import { createMessageUseCase } from "../shared/container.ts";

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

    const payload = await req.json();
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

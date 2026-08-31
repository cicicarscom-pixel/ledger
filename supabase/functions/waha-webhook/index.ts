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
      const from = payload.payload?.from || payload.data?.from;
      const body = payload.payload?.body || payload.data?.body;
      const isFromMe = payload.payload?.fromMe || payload.data?.id?.fromMe;

      // GRUP ve DURUM (Status) Korumas�:
      const isGroup = from && from.includes('@g.us');
      const isBroadcast = from && from.includes('@broadcast');

      // Sadece d��ar�dan gelen (m��teri), grup/durum olmayan, ki�isel mesajlar�na yan�t ver (@c.us)
      if (!isFromMe && !isGroup && !isBroadcast && merchantId && from && body) {
        console.log(`[WAHA WEBHOOK] Gelen Mesaj: ${from} -> "${body}"`);

        // Use Omnichannel Router
        await useCase.execute(supabaseAdmin, {
          merchantId: merchantId,
          source: 'whatsapp',
          senderId: from,
          userMessage: body
        });
      }
    }

    // WAHA isteklerini hi�bir zaman timeout'a d���rmemek i�in hemen 200 d�n�yoruz
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});

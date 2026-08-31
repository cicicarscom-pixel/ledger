import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.40.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Kimlik doğrulaması JWT'den çıkarılır — client'ın gönderdiği bir merchantId'ye ASLA güvenilmez.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) throw new Error('Invalid session');
    const merchantId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const mode: 'soft' | 'hard' = body.mode === 'hard' ? 'hard' : 'soft';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // KURAL: Her silme SADECE bu merchantId ile filtrelenir. Filtre olmadan
    // veya global bir .delete() ASLA çalıştırılmaz — bu, TÜM merchantların
    // verisini silebilir.
    await supabaseAdmin.from('ai_communication_logs').delete().eq('merchant_id', merchantId);
    await supabaseAdmin.from('notifications').delete().eq('profile_id', merchantId);
    await supabaseAdmin.from('appointments').delete().eq('organization_id', merchantId);
    await supabaseAdmin.from('customers').delete().eq('organization_id', merchantId);
    await supabaseAdmin.from('messages').delete().eq('profile_id', merchantId);
    await supabaseAdmin.from('conversations').delete().eq('profile_id', merchantId);
    await supabaseAdmin.from('comments').delete().eq('profile_id', merchantId);

    if (mode === 'hard') {
      await supabaseAdmin.from('organization_ai_settings').delete().eq('merchant_id', merchantId);
      await supabaseAdmin.from('business_services').delete().eq('merchant_id', merchantId);
      // KASITLI OLARAK SİLİNMEYENLER: bot_settings (WhatsApp/WAHA bağlantı
      // durumu), social_accounts (Zernio bağlantıları). Kullanıcı QR'ı
      // tekrar okutmak veya Instagram'ı tekrar bağlamak zorunda kalmasın.
    }

    return new Response(JSON.stringify({ success: true, mode }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[flow-reset-ai-data] Error:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

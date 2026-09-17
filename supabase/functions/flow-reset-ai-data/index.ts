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

    const { data: orgMember } = await supabaseAdmin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', merchantId)
      .maybeSingle();
    const scopeId = orgMember?.organization_id || merchantId;

    // KURAL: Her silme SADECE bu scopeId ile filtrelenir. Filtre olmadan
    // veya global bir .delete() ASLA çalıştırılmaz — bu, TÜM merchantların
    // verisini silebilir.
    await supabaseAdmin.from('notifications').delete().eq('profile_id', scopeId);
    await supabaseAdmin.from('appointments').delete().eq('organization_id', scopeId);
    await supabaseAdmin.from('customers').delete().eq('organization_id', scopeId);
    await supabaseAdmin.from('messages').delete().eq('profile_id', scopeId);
    await supabaseAdmin.from('conversations').delete().eq('profile_id', scopeId);
    await supabaseAdmin.from('comments').delete().eq('profile_id', scopeId);

    // merchant_id tabanlı (SADECE ham kullanıcı ID'si, organizasyon fallback'i YOK — RLS de auth.uid()=merchant_id) → merchantId
    await supabaseAdmin.from('ai_communication_logs').delete().eq('merchant_id', merchantId);

    // 17.09.2026: Analiz sayfası (Web & Mobil) verilerinin sıfırlama sonrası
    // kaybolmaması hatası (bkz. README) — analytics_cache tablosunun kendisinde
    // organization_id/merchant_id kolonu YOK, sadece Zernio'nun account_id'si var.
    // Bu yüzden önce bu scopeId'ye bağlı Zernio hesaplarının account_id'leri
    // integration.social_accounts üzerinden bulunup, ardından bu hesaplara ait
    // önbellek satırları siliniyor. Analiz verisi bir "test verisi" kadar
    // geçicidir (bot_settings/social_accounts bağlantılarının aksine), bu
    // yüzden hem soft hem hard reset'te temizleniyor.
    const { data: scopedAccounts } = await supabaseAdmin
      .schema('integration')
      .from('social_accounts')
      .select('zernio_account_id')
      .eq('organization_id', scopeId);
    const scopedAccountIds = (scopedAccounts || [])
      .map((a: { zernio_account_id: string }) => a.zernio_account_id)
      .filter(Boolean);
    if (scopedAccountIds.length > 0) {
      await supabaseAdmin.from('analytics_cache').delete().in('account_id', scopedAccountIds);
    }

    if (mode === 'hard') {
      await supabaseAdmin.from('organization_ai_settings').delete().eq('merchant_id', merchantId);
      await supabaseAdmin.from('business_services').delete().eq('merchant_id', merchantId);
      await supabaseAdmin.from('finance_documents').delete().eq('organization_id', scopeId);
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

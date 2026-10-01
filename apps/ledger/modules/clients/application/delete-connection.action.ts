'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

// Faz E: bağlantı kaydı SİLİNMEZ (geçmiş ve olay kaydı korunur). "Sil" işlemi:
//   aktif bağlantı → disconnect_taxpayer (koparılır)
//   onay bekleyen istek → review_connection_request(reject) (reddedilir)
//   diğer durumlar → zaten listede gösterilmez; işlem yapılmaz.
export async function deleteConnectionAction(linkId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Yetkisiz erişim. Lütfen giriş yapın.' };
    }

    // RLS: firma üyesi yalnız kendi firmasının bağlantılarını görür
    const { data: link } = await supabase
      .from('accountant_taxpayer_links')
      .select('status')
      .eq('id', linkId)
      .maybeSingle();

    if (!link) {
      return { success: false, error: 'Bağlantı kaydı bulunamadı.' };
    }

    if (link.status === 'active') {
      const { data, error } = await supabase.rpc('disconnect_taxpayer', { p_link_id: linkId, p_reason: 'Müşavir kaydı kaldırdı' });
      if (error || data?.status !== 'SUCCESS') {
        console.error('deleteConnectionAction disconnect:', error || data?.status);
        return { success: false, error: data?.status === 'FORBIDDEN_ROLE' ? 'Bu işlem için yetkiniz yok (Sadece Admin veya Owner).' : 'Bağlantı kesilemedi.' };
      }
      return { success: true, message: 'Mükellef bağlantısı sonlandırıldı.' };
    }

    if (link.status === 'pending_confirmation') {
      const { data, error } = await supabase.rpc('review_connection_request', { p_link_id: linkId, p_action: 'reject' });
      if (error || data?.status !== 'SUCCESS') {
        console.error('deleteConnectionAction reject:', error || data?.status);
        return { success: false, error: 'İstek reddedilemedi.' };
      }
      return { success: true, message: 'Bağlantı isteği reddedildi.' };
    }

    return { success: true, message: 'Bu bağlantı zaten sonlandırılmış.' };
  } catch (error) {
    console.error('deleteConnectionAction Exception:', error);
    return { success: false, error: 'Sunucu hatası oluştu.' };
  }
}

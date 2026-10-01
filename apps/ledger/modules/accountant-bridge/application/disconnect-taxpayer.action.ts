'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Faz E: bağlantıyı yalnız disconnect_taxpayer RPC'si koparır (yönetici istemcisiyle doğrudan yazma YOK).
// RPC: firma üyeliği + sahip/yönetici rolü kontrolü, geçiş kuralı, olay kaydı ve işletmeye bildirim.
export async function disconnectTaxpayerAction(linkId: string, reason: string = 'Müşavir tarafından iptal edildi') {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Yetkisiz erişim. Lütfen giriş yapın.' };
    }

    const { data, error } = await supabase.rpc('disconnect_taxpayer', { p_link_id: linkId, p_reason: reason });
    if (error) {
      console.error('disconnectTaxpayerAction error:', error);
      return { success: false, error: 'Sunucu hatası oluştu.' };
    }

    switch (data?.status) {
      case 'SUCCESS':
        revalidatePath('/clients');
        return { success: true, message: 'Bağlantı başarıyla kesildi.' };
      case 'NOT_FOUND':
        return { success: false, error: 'Bağlantı bulunamadı.' };
      case 'FORBIDDEN_ROLE':
        return { success: false, error: 'Bağlantıyı kesmek için yetkiniz bulunmuyor (Sadece Admin veya Owner).' };
      case 'NOT_ACTIVE':
        return { success: false, error: 'Sadece aktif bağlantılar kesilebilir.' };
      default:
        return { success: false, error: 'Bağlantı kesilemedi.' };
    }
  } catch (error: any) {
    console.error('Disconnect Taxpayer Error:', error);
    return { success: false, error: 'Sunucu hatası oluştu.' };
  }
}

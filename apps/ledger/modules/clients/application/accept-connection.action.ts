'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function acceptConnectionAction(linkId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { data, error } = await supabase.rpc('review_connection_request', {
      p_link_id: linkId,
      p_action: 'accept'
    });

    // Faz E: review_connection_request → { status: 'SUCCESS' | 'NOT_FOUND' | 'NOT_PENDING' | 'INVALID_ACTION' | 'UNAUTHORIZED' }
    if (error || data?.status !== 'SUCCESS') {
      console.error('acceptConnectionAction Error:', error || data?.status);
      return { success: false, error: data?.status === 'NOT_PENDING' ? 'Bu istek artık onay beklemiyor.' : data?.status === 'NOT_FOUND' ? 'İstek bulunamadı.' : 'Bağlantı onaylanamadı.' };
    }

    return { success: true, message: 'Bağlantı başarıyla onaylandı.' };
  } catch (error) {
    console.error('acceptConnectionAction Exception:', error);
    return { success: false, error: 'Sunucu hatası oluştu.' };
  }
}

'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function disconnectWhatsappSession(session: string): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('admin-waha', { body: { action: 'disconnect', session } })
  if (error) {
    console.error('admin-waha disconnect error:', error)
    let code = ''
    try { code = (await (error as any).context?.json?.())?.code || '' } catch { /* ignore */ }
    if (code === 'SERVER_UNREACHABLE') {
      return { ok: false, message: "WAHA sunucusuna ulaşılamadı; oturum durumu doğrulanamadı. Daha sonra tekrar deneyin." }
    }
    return { ok: false, message: 'Bağlantı kesilemedi. Lütfen tekrar deneyin.' }
  }
  revalidatePath('/whatsapp')
  if (data?.removedAssignment === true) {
    return { ok: true, message: "WAHA'da oturum yoktu; sunucu ataması silindi." }
  }
  if (data?.removedAssignment === false) {
    return { ok: true, message: "Silinecek bir atama bulunamadı." }
  }
  return data?.success
    ? { ok: true, message: 'WhatsApp bağlantısı kesildi ve oturum silindi.' }
    : { ok: false, message: `Kısmen tamamlandı: ${JSON.stringify(data?.steps ?? {})}` }
}

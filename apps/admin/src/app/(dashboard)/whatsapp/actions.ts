'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function disconnectWhatsappSession(session: string): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('admin-waha', { body: { action: 'disconnect', session } })
  if (error) {
    console.error('admin-waha disconnect error:', error)
    return { ok: false, message: 'Bağlantı kesilemedi. Lütfen tekrar deneyin.' }
  }
  revalidatePath('/whatsapp')
  return data?.success
    ? { ok: true, message: 'WhatsApp bağlantısı kesildi ve oturum silindi.' }
    : { ok: false, message: `Kısmen tamamlandı: ${JSON.stringify(data?.steps ?? {})}` }
}

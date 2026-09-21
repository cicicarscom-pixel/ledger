'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendNotification(prevState: any, formData: FormData) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Yetkisiz işlem. Oturumunuz kapanmış olabilir." }
  }

  // Double check admin table as a server action precaution using the secure RPC function
  const { data: isAdmin } = await supabase.rpc('is_admin')

  if (!isAdmin) {
    return { error: "Bu işlemi yapmak için yetkiniz yok." }
  }

  const targetType = formData.get('targetType') as string
  const title = formData.get('title') as string
  const message = formData.get('message') as string

  if (!title || !message) {
    return { error: "Lütfen başlık ve mesaj alanlarını doldurun." }
  }

  try {
    if (targetType === 'single') {
      const profileId = formData.get('profileId') as string
      if (!profileId) {
        return { error: "Tekil gönderim için bir kullanıcı seçmelisiniz." }
      }

      const { error } = await supabase.from('notifications').insert({
        profile_id: profileId,
        title,
        message,
        type: 'system',
        sender_id: user.id
      })
      if (error) throw error

    } else {
      // Broadcast handling
      const { error } = await supabase.from('broadcast_notifications').insert({
        title,
        message,
        target: targetType, // 'all', 'business', 'accountant'
        sender_id: user.id
      })
      if (error) throw error
    }

    revalidatePath('/notifications')
    return { success: "Bildirim başarıyla gönderildi!" }
  } catch (err: any) {
    console.error("Bildirim gönderme hatası:", err)
    return { error: err.message || "Bildirim gönderilemedi." }
  }
}

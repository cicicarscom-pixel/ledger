'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleUserStatus(targetUserId: string, currentStatus: string) {
  const supabase = createClient()
  
  const action = currentStatus === 'suspended' ? 'unban' : 'ban'
  
  const { data, error } = await supabase.functions.invoke('admin-manager', {
    body: {
      action,
      target_user_id: targetUserId
    }
  })

  if (error) {
    console.error('Edge Function Error:', error)
    return { error: 'İşlem başarısız oldu' }
  }

  revalidatePath('/users')
  return { success: true }
}

export async function deleteUser(targetUserId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.functions.invoke('admin-manager', {
    body: {
      action: 'delete',
      target_user_id: targetUserId
    }
  })

  if (error) {
    console.error('Edge Function Error:', error)
    return { error: 'Silme işlemi başarısız oldu' }
  }

  revalidatePath('/users')
  return { success: true }
}
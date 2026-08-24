'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleUserStatus(targetUserId: string, currentStatus: string, formData?: FormData): Promise<void> {
  const supabase = createClient()
  
  const action = currentStatus === 'suspended' ? 'unban' : 'ban'
  
  const { error } = await supabase.functions.invoke('admin-manager', {
    body: {
      action,
      target_user_id: targetUserId
    }
  })

  if (error) {
    console.error('Edge Function Error:', error)
  } else {
    revalidatePath('/users')
  }
}

export async function deleteUser(targetUserId: string, formData?: FormData): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase.functions.invoke('admin-manager', {
    body: {
      action: 'delete',
      target_user_id: targetUserId
    }
  })

  if (error) {
    console.error('Edge Function Error:', error)
  } else {
    revalidatePath('/users')
  }
}
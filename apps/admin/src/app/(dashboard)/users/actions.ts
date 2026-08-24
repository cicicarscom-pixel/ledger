'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleUserStatus(targetUserId: string, currentStatus: string, formData?: FormData): Promise<void> {
  const supabase = createClient()
  
  const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended'
  
  const { data, error } = await supabase.functions.invoke('admin-manager', {
    body: {
      action: 'update-status',
      targetUserId: targetUserId,
      payload: {
        status: newStatus
      }
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
  
  const { data, error } = await supabase.functions.invoke('admin-manager', {
    body: {
      action: 'delete-user',
      targetUserId: targetUserId
    }
  })

  if (error) {
    console.error('Edge Function Error:', error)
  } else {
    revalidatePath('/users')
  }
}
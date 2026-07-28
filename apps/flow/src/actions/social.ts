'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Gönderiler (Posts)
export async function getPosts(filter?: string) {
  const supabase = await createClient()
  let query = supabase.from('posts').select('*').order('created_at', { ascending: false })
  
  if (filter && filter !== 'all') {
    query = query.eq('status', filter)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching posts:', error)
    return []
  }
  return data
}

export async function createPost(formData: FormData) {
  const supabase = await createClient()
  
  const content = formData.get('content') as string
  const platforms = JSON.parse(formData.get('platforms') as string)
  const scheduled_for = formData.get('scheduled_for') as string
  const status = scheduled_for ? 'scheduled' : 'published'

  const { error } = await supabase.from('posts').insert({
    content,
    platforms,
    scheduled_for,
    status
  })

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath('/posts')
  return { success: true }
}

export async function deletePost(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('posts').delete().eq('id', id)

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath('/posts')
  return { success: true }
}

// Gelen Kutusu (Inbox)
export async function getMessages() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('inbox_messages').select('*').order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching messages:', error)
    return []
  }
  return data
}

export async function replyToMessage(messageId: string, replyContent: string) {
  const supabase = await createClient()
  
  // Burada ZernioClient veya WAHA API çağrısı da eklenebilir
  // Supabase tarafında status 'replied' olarak güncellenir
  const { error } = await supabase.from('inbox_messages')
    .update({ 
      status: 'replied',
      ai_response: replyContent 
    })
    .eq('id', messageId)

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath('/inbox')
  return { success: true }
}

export async function getSocialAccounts() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('social_accounts').select('*')
  
  if (error) {
    console.error('Error fetching social accounts:', error)
    return []
  }
  return data
}

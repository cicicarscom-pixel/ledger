'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getAppointments(dateStr?: string) {
  const supabase = await createClient()
  let query = supabase.from('appointments').select('*').order('time_start', { ascending: true })
  
  if (dateStr) {
    query = query.eq('date', dateStr)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching appointments:', error)
    return []
  }
  return data
}

export async function createAppointment(formData: FormData) {
  const supabase = await createClient()
  
  const customer_name = formData.get('customer_name') as string
  const service_id = formData.get('service_id') as string
  const date = formData.get('date') as string
  const time_start = formData.get('time_start') as string
  const time_end = formData.get('time_end') as string

  const { error } = await supabase.from('appointments').insert({
    customer_name,
    service_id,
    date,
    time_start,
    time_end,
    status: 'pending' // default status
  })

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath('/appointments')
  return { success: true }
}

export async function updateAppointmentStatus(id: string, status: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('appointments')
    .update({ status })
    .eq('id', id)

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath('/appointments')
  return { success: true }
}

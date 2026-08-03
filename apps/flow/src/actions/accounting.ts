'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Transactions Tablosu için Server Actions
export async function getTransactions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }
  return data
}

export async function addTransaction(formData: FormData) {
  const supabase = await createClient()
  
  const title = formData.get('title') as string
  const type = formData.get('type') as string // 'income' or 'expense'
  const amount = parseFloat(formData.get('amount') as string)
  const date = formData.get('date') as string
  const status = formData.get('status') as string || 'completed'

  const { error } = await supabase.from('transactions').insert({
    title,
    type,
    amount,
    date,
    status
  })

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath('/accounting')
  return { success: true }
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('transactions').delete().eq('id', id)

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath('/accounting')
  return { success: true }
}

// Accounting Drafts (AI Muhasebe Fatura Taslakları - AGENTS.md Phase 3)
export async function getAccountingDrafts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounting_drafts')
    .select('*')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching drafts:', error)
    return []
  }
  return data
}

export async function approveDraft(draftId: string) {
  const supabase = await createClient()
  
  // Müşavir Onayı (Phase 4)
  // Gerçekte burada bir Edge Function veya RPC çağrısı da olabilir
  const { error } = await supabase
    .from('accounting_drafts')
    .update({ status: 'approved' })
    .eq('id', draftId)

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath('/accounting')
  return { success: true }
}

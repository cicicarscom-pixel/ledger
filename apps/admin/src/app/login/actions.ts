'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createServerClient } from '@supabase/ssr'

export async function login(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error, data: authData } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: 'E-posta veya şifre hatalı' }
  }

  // Check if super admin using the fresh session token to bypass SSR cookie caching issues
  if (authData.user && authData.session) {
    const supabaseWithAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return []
          },
          setAll() {}
        },
        global: {
          headers: {
            Authorization: `Bearer ${authData.session.access_token}`
          }
        }
      }
    )

    const { data: profile } = await supabaseWithAuth
      .from('profiles')
      .select('is_super_admin')
      .eq('id', authData.user.id)
      .single()

    if (!profile?.is_super_admin) {
      await supabase.auth.signOut()
      return { error: 'Bu panele sadece Super Admin yetkisi olanlar girebilir.' }
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
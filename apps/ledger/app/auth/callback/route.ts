import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // Ignore in route handler
            }
          },
        },
      }
    )
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.session?.user) {
      const user = data.session.user;
      
      // If user signed in with Google, sync profile data
      if (user.app_metadata?.provider === 'google') {
        const metadata = user.user_metadata;
        const fullName = metadata?.full_name || metadata?.name;
        const avatarUrl = metadata?.avatar_url || metadata?.picture;
        
        if (fullName || avatarUrl) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('authorized_person, avatar_url')
            .eq('id', user.id)
            .maybeSingle();
            
          const updates: any = {};
          if (!profile?.authorized_person && fullName) updates.authorized_person = fullName;
          if (!profile?.avatar_url && avatarUrl) updates.avatar_url = avatarUrl;
          
          if (Object.keys(updates).length > 0) {
            await supabase.from('profiles').update(updates).eq('id', user.id);
          }
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/ledger/login?error=auth-callback-failed`)
}

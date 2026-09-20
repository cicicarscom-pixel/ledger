import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.session?.user) {
      const user = data.session.user;
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_type, authorized_person, avatar_url')
        .eq('id', user.id)
        .limit(1);
        
      const profile = profileData?.[0] || null;
      const updates: any = {};

      // Ledger projesinde olduğumuz için tipi 'accountant' olarak güvenceye alıyoruz.
      // DİKKAT: FlowWeb'in aksine burada organizasyon (organizations) SATIRI AÇMIYORUZ!
      if (!profile?.user_type) {
        updates.user_type = 'accountant';
      }
      
      // If user signed in with Google, sync profile data
      if (user.app_metadata?.provider === 'google') {
        const metadata = user.user_metadata;
        const fullName = metadata?.full_name || metadata?.name;
        const avatarUrl = metadata?.avatar_url || metadata?.picture;
        
        if (!profile?.authorized_person && fullName) updates.authorized_person = fullName;
        if (!profile?.avatar_url && avatarUrl) updates.avatar_url = avatarUrl;
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from('profiles').update(updates).eq('id', user.id);
      }

      return NextResponse.redirect(`${origin}/ledger${next === '/' ? '' : next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/ledger/login?error=auth-callback-failed`)
}

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase env vars missing in middleware')
      return supabaseResponse
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Profilin app_role bilgisini cekiyoruz
      const { data: profile } = await supabase.from('profiles').select('app_role').eq('id', user.id).single()
      
      // Eger kullanici 'flow' rolundeyse ve cikis yapmak disinda bir islem yapiyorsa onu engelle
      const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register') || request.nextUrl.pathname.startsWith('/auth')
      const isRootPage = request.nextUrl.pathname === '/'
      
      // Engelleme mantigi: Ledger admin ve app sayfalarina erismeye calisiyorsa
      if (profile?.app_role === 'flow') {
         // Eger halihazirda login sayfasinda degilse oraya postala ve error bas
         if (!isAuthPage) {
           await supabase.auth.signOut()
           const url = request.nextUrl.clone()
           url.pathname = '/login'
           url.searchParams.set('error', 'flow_blocked')
           return NextResponse.redirect(url)
         }
      }
    }
  } catch (err) {
    console.error('Middleware error:', err)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
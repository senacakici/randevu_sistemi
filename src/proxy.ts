// Next.js 16'da middleware.ts → proxy.ts olarak yeniden adlandırıldı
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Kimlik doğrulama gerektirmeyen rotalar
  const publicPaths = ['/login', '/register', '/randevu']
  const isPublicPath =
    publicPaths.some((p) => pathname.startsWith(p)) ||
    pathname === '/'

  // Supabase oturumunu yenilemek için yanıt nesnesi hazırla
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Cookie'leri hem isteğe hem yanıta yaz (oturum yenileme için)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Oturumu kontrol et (cookie'leri yenilemek için getUser çağrılmalı)
  const { data: { user } } = await supabase.auth.getUser()

  // Giriş yapmamış kullanıcıyı korumalı rotalarda login'e yönlendir
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Giriş yapmış kullanıcıyı auth sayfalarından yönlendir
  if (user && (pathname === '/login' || pathname === '/register')) {
    // Kullanıcı rolüne göre yönlendirme
    const { data: profile } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (profile) {
      // İşletme hesabı — panel'e gönder
      return NextResponse.redirect(new URL('/panel', request.url))
    }

    // Henüz işletmesi olmayan kullanıcı — kayıt tamamlama
    return NextResponse.redirect(new URL('/panel', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // _next ve static dosyaları hariç tüm rotalar
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

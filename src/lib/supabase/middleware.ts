import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isDemoMode, hasSupabaseConfig, getSupabaseUrl, getSupabaseAnonKey } from './config'

export async function updateSession(request: NextRequest) {
  // デモモードまたは環境変数が未設定の場合はスキップ
  if (isDemoMode() || !hasSupabaseConfig()) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  // セッションの更新（重要：getUser()を呼ぶことでセッションがリフレッシュされる）
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  // デバッグログ（本番環境では削除）
  console.log('[DEBUG Middleware]', {
    path: request.nextUrl.pathname,
    hasUser: !!user,
    userId: user?.id,
    email: user?.email,
    error: userError?.message,
    cookies: request.cookies.getAll().map(c => c.name).filter(n => n.includes('supabase')),
  })

  // 未認証ユーザーを/loginにリダイレクト（ただし/loginと/auth系は除外）
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    console.log('[DEBUG Middleware] 未認証ユーザーを/loginにリダイレクト')
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}


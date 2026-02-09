import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/'

  const supabase = await createClient()

  // パスワードリセット用リンク（メールのリンクは token_hash + type=recovery で飛んでくることが多い）
  if (token_hash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'recovery',
    })
    if (!error) {
      return NextResponse.redirect(`${origin}/auth/set-password`)
    }
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // 通常の認証（code で飛んでくる場合）
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // リセットフローで code が来た場合も新パスワード設定へ
      const isRecovery = type === 'recovery'
      const redirectPath = isRecovery ? '/auth/set-password' : next
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  // エラー時はログインページにリダイレクト
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}


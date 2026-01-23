import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, isAdminUser } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  const { authUser, appUser } = await getAuthContext()

  if (!authUser) {
    return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
  }
  if (!isAdminUser(appUser)) {
    return NextResponse.json({ message: '権限がありません' }, { status: 403 })
  }

  const { email } = (await request.json()) as { email?: string }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: '有効なメールアドレスを入力してください' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'パスワードリセットメールを送信しました' })
}

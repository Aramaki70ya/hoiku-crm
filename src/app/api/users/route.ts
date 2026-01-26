import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, isAdminUser } from '@/lib/auth/server'
import type { User } from '@/types/database'

interface UserPayload {
  name?: string
  email?: string
  role?: 'admin' | 'user'
}

function validateUserPayload(payload: UserPayload) {
  if (!payload.name?.trim()) {
    return '氏名を入力してください'
  }
  if (!payload.email?.trim()) {
    return 'メールアドレスを入力してください'
  }
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)
  if (!emailValid) {
    return '有効なメールアドレスを入力してください'
  }
  if (payload.role !== 'admin' && payload.role !== 'user') {
    return 'ロールが不正です'
  }
  return null
}

export async function GET() {
  const { authUser, appUser } = await getAuthContext()

  if (!authUser) {
    return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name')

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ users: data ?? [] })
}

export async function POST(request: NextRequest) {
  const { authUser, appUser } = await getAuthContext()

  if (!authUser) {
    return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
  }
  if (!isAdminUser(appUser)) {
    return NextResponse.json({ message: '権限がありません' }, { status: 403 })
  }

  const payload = (await request.json()) as UserPayload
  const validationError = validateUserPayload(payload)
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 })
  }

  // バリデーション後は name と email が確実に存在する
  const name = payload.name!.trim()
  const email = payload.email!.trim()
  const role = payload.role || 'user'

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .insert({
      name,
      email,
      role,
    } satisfies Omit<User, 'created_at' | 'id' | 'retired_at'>)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ user: data }, { status: 201 })
}

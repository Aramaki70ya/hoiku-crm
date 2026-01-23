import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext, isAdminUser } from '@/lib/auth/server'

interface UpdatePayload {
  name?: string
  email?: string
  role?: 'admin' | 'user'
}

function validateUpdatePayload(payload: UpdatePayload) {
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    return '有効なメールアドレスを入力してください'
  }
  if (payload.role && payload.role !== 'admin' && payload.role !== 'user') {
    return 'ロールが不正です'
  }
  return null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { authUser, appUser } = await getAuthContext()

  if (!authUser) {
    return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
  }
  if (!isAdminUser(appUser)) {
    return NextResponse.json({ message: '権限がありません' }, { status: 403 })
  }

  const payload = (await request.json()) as UpdatePayload
  const validationError = validateUpdatePayload(payload)
  if (validationError) {
    return NextResponse.json({ message: validationError }, { status: 400 })
  }

  if (!payload.name && !payload.email && !payload.role) {
    return NextResponse.json({ message: '更新内容がありません' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .update({
      ...(payload.name ? { name: payload.name.trim() } : {}),
      ...(payload.email ? { email: payload.email.trim() } : {}),
      ...(payload.role ? { role: payload.role } : {}),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ user: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { authUser, appUser } = await getAuthContext()

  if (!authUser) {
    return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
  }
  if (!isAdminUser(appUser)) {
    return NextResponse.json({ message: '権限がありません' }, { status: 403 })
  }

  const supabase = await createClient()
  const { error } = await supabase.from('users').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}

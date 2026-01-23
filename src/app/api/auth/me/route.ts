import { NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/server'

export async function GET() {
  const { authUser, appUser } = await getAuthContext()

  if (!authUser) {
    return NextResponse.json({ authUser: null, user: null }, { status: 401 })
  }

  if (!appUser) {
    return NextResponse.json(
      { authUser: { id: authUser.id, email: authUser.email }, user: null },
      { status: 403 }
    )
  }

  return NextResponse.json({
    authUser: { id: authUser.id, email: authUser.email },
    user: appUser,
  })
}

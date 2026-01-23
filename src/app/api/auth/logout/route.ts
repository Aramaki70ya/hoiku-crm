import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseConfig, isDemoMode } from '@/lib/supabase/config'

export async function POST() {
  if (isDemoMode() || !hasSupabaseConfig()) {
    return new NextResponse(null, { status: 204 })
  }

  const supabase = await createClient()
  await supabase.auth.signOut()
  return new NextResponse(null, { status: 204 })
}

import 'server-only'

import type { User as SupabaseUser } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseConfig, isDemoMode } from '@/lib/supabase/config'
import { mockUsers } from '@/lib/mock-data'
import type { User } from '@/types/database'

export interface AuthContext {
  authUser: SupabaseUser | null
  appUser: User | null
}

export async function getAuthContext(): Promise<AuthContext> {
  if (isDemoMode() || !hasSupabaseConfig()) {
    const demoUser = mockUsers.find(user => user.role === 'admin') ?? mockUsers[0] ?? null
    return {
      authUser: demoUser
        ? ({ id: demoUser.id, email: demoUser.email } as SupabaseUser)
        : null,
      appUser: demoUser,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user || !user.email) {
    return { authUser: null, appUser: null }
  }

  const { data: appUser, error: appUserError } = await supabase
    .from('users')
    .select('*')
    .eq('email', user.email)
    .single()

  if (appUserError) {
    return { authUser: user, appUser: null }
  }

  return { authUser: user, appUser }
}

export function isAdminUser(user: User | null): boolean {
  return user?.role === 'admin'
}

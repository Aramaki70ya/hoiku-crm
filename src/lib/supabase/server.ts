import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceRoleKey } from './config'

export async function createClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()

  const cookieStore = await cookies()

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Componentからの呼び出し時は無視
          }
        },
      },
    }
  )
}

/**
 * サービスロールクライアント（SYNC_API_KEY 等の外部連携時に使用。RLS をバイパス）
 */
export function createServiceRoleClient(): ReturnType<typeof createSupabaseClient<Database>> | null {
  const key = getSupabaseServiceRoleKey()
  if (!key) return null
  return createSupabaseClient<Database>(getSupabaseUrl(), key)
}
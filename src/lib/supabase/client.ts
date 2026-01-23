import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseUrl, getSupabaseAnonKey } from './config'

export function createClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()

  return createBrowserClient(url, key)
}


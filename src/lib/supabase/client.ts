import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // デモモードまたは環境変数が未設定の場合はダミークライアントを返す
  const isDemoMode = process.env.DEMO_MODE === 'true'
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-key'

  if (isDemoMode || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // デモモードではダミーのクライアントを返す
    return createBrowserClient(url, key)
  }

  return createBrowserClient(url, key)
}


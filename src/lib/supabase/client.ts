import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseUrl, getSupabaseAnonKey, hasSupabaseConfig } from './config'

export function createClient() {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()

  // デバッグ: 実際に接続する場合のみ（未設定時は queries-client がモックに寄せる）
  if (
    typeof window !== 'undefined' &&
    process.env.NODE_ENV === 'development' &&
    hasSupabaseConfig()
  ) {
    console.log('[DEBUG Supabase Client]', {
      hasConfig: true,
      url: url.substring(0, 30) + '...',
      keyLength: key.length,
    })
  }

  // URLとキーが正しく設定されているか確認
  if (!hasSupabaseConfig() && !url.includes('demo.supabase.co')) {
    console.error('[ERROR] Supabase環境変数が正しく設定されていません')
    console.error('NEXT_PUBLIC_SUPABASE_URL:', url)
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', key ? `${key.substring(0, 20)}...` : '未設定')
    console.error('[解決方法] .env.local に以下を設定してください:')
    console.error('  NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co')
    console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...')
    console.error('設定後、開発サーバーを再起動してください (npm run dev)')
  }

  // URLの形式チェック
  if (!url.includes('supabase.co') && !url.includes('demo.supabase.co')) {
    console.warn('[WARN] Supabase URLの形式が正しくない可能性があります:', url.substring(0, 50))
  }

  const client = createBrowserClient(url, key)

  return client
}


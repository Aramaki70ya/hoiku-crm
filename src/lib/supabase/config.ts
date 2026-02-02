/**
 * Supabase設定の共通ユーティリティ
 */

/**
 * デモモードかどうかを判定
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true'
}

/**
 * Supabase URLを取得（デフォルト値付き）
 */
export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co'
}

/**
 * Supabase Anon Keyを取得（デフォルト値付き）
 */
export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-key'
}

/**
 * 環境変数が設定されているかどうかを判定
 */
export function hasSupabaseConfig(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

/**
 * サービスロールキー（サーバー専用・APIキー連携時の一括INSERT用）
 */
export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY
}

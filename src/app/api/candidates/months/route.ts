import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// 登録月の一覧を取得
export async function GET() {
  try {
    // デモモードの場合はモックデータから算出
    if (isDemoMode()) {
      const { mockCandidates } = await import('@/lib/mock-data')
      const months = new Set<string>()
      mockCandidates.forEach((c) => {
        if (c.registered_at) {
          const m = c.registered_at.replace(/^(\d{4})-(\d{2}).*/, '$1-$2')
          if (m !== c.registered_at) months.add(m)
        }
      })
      const sorted = Array.from(months).sort((a, b) => b.localeCompare(a))
      const res = NextResponse.json({ months: sorted })
      res.headers.set('Cache-Control', 'no-store, max-age=0')
      return res
    }

    const supabase = await createClient()

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // registered_at カラムだけ取得（軽量）。Supabase デフォルト1000行制限を超えるため range を指定
    const { data, error } = await supabase
      .from('candidates')
      .select('registered_at')
      .not('registered_at', 'is', null)
      .range(0, 99999)

    if (error) throw error

    // 年月に変換して重複除去
    const months = new Set<string>()
    ;(data || []).forEach((row: { registered_at: string | null }) => {
      if (row.registered_at) {
        const m = row.registered_at.replace(/^(\d{4})-(\d{2}).*/, '$1-$2')
        if (m !== row.registered_at) months.add(m)
      }
    })

    const sorted = Array.from(months).sort((a, b) => b.localeCompare(a))
    const res = NextResponse.json({ months: sorted })
    res.headers.set('Cache-Control', 'no-store, max-age=0')
    return res
  } catch (error) {
    console.error('Error fetching candidate months:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

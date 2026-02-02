import { createClient } from '@/lib/supabase/server'
import { syncCandidatesFromRows } from '@/lib/sync-candidates'
import { fetchSheetAsRows } from '@/lib/google-sheets'
import { isDemoMode } from '@/lib/supabase/config'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/sync/from-sheet
 * 手動取り込み用。Google スプレッドシートから取得し、新規行のみ candidates に INSERT する。
 * 認証: ログイン済みユーザーのみ
 */
export async function POST() {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ error: 'デモモードでは取り込みできません' }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const rows = await fetchSheetAsRows()
    if (rows.length === 0) {
      return NextResponse.json({
        inserted: 0,
        skipped: 0,
        errors: [],
        message: 'スプレッドシートにデータ行がありません',
      })
    }

    const result = await syncCandidatesFromRows(supabase, rows)
    return NextResponse.json({
      ...result,
      message: `${result.inserted}件追加、${result.skipped}件は既に登録済みでした。`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'スプレッドシートの取得に失敗しました'
    console.error('Sync from sheet error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

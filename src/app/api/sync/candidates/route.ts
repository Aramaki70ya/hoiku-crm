import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { syncCandidatesFromRows } from '@/lib/sync-candidates'
import type { SpreadsheetRow } from '@/lib/csv-parser'
import { isDemoMode } from '@/lib/supabase/config'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/sync/candidates
 * スプレッドシートの行配列を受け取り、新規のみ candidates に INSERT する（外部 API・Google Apps Script 用）。
 * 認証: Cookie セッション または Authorization: Bearer <SYNC_API_KEY>
 */
export async function POST(request: NextRequest) {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ error: 'デモモードでは取り込みできません' }, { status: 403 })
    }

    const authHeader = request.headers.get('authorization')
    const syncApiKey = process.env.SYNC_API_KEY
    const hasValidApiKey = !!syncApiKey && authHeader === `Bearer ${syncApiKey}`

    let supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createServiceRoleClient> = null

    if (hasValidApiKey) {
      supabase = createServiceRoleClient()
      if (!supabase) {
        return NextResponse.json(
          { error: 'APIキー連携には SUPABASE_SERVICE_ROLE_KEY の設定が必要です' },
          { status: 503 }
        )
      }
    } else {
      supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
      }
    }

    const body = await request.json()
    const rows = Array.isArray(body.rows) ? body.rows as SpreadsheetRow[] : []

    if (rows.length === 0) {
      return NextResponse.json(
        { inserted: 0, skipped: 0, errors: [], message: '行がありません' },
        { status: 200 }
      )
    }

    const result = await syncCandidatesFromRows(supabase, rows)
    return NextResponse.json({
      ...result,
      message: `${result.inserted}件追加、${result.skipped}件は既に登録済みでした。`,
    })
  } catch (error) {
    console.error('Sync candidates error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

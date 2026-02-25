import { createServiceRoleClient } from '@/lib/supabase/server'
import { mergeDuplicateCandidates } from '@/lib/merge-duplicate-candidates'
import { isDemoMode } from '@/lib/supabase/config'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/sync/merge-duplicates
 * 同一氏名の求職者を1人にマージ（スプシを正＝2020xxxxの最小IDを残す。メモ・ステータス等は集約）。
 * クエリ: recent_days=N で直近N日以内に登録された求職者のみ対象（省略時は全件）。
 * 認証: Authorization: Bearer <SYNC_API_KEY>
 */
export async function POST(request: NextRequest) {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ error: 'デモモードでは実行できません' }, { status: 403 })
    }

    const authHeader = request.headers.get('authorization')
    const syncApiKey = process.env.SYNC_API_KEY
    if (!syncApiKey || authHeader !== `Bearer ${syncApiKey}`) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const supabase = createServiceRoleClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY の設定が必要です' },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const recentDaysParam = searchParams.get('recent_days')
    const recentDays =
      recentDaysParam != null ? parseInt(recentDaysParam, 10) : undefined
    const options =
      Number.isInteger(recentDays) && recentDays! > 0 ? { recentDays: recentDays! } : {}

    const mergeResult = await mergeDuplicateCandidates(supabase, options)
    return NextResponse.json({
      ok: true,
      mergedGroups: mergeResult.mergedGroups,
      mergedCount: mergeResult.mergedCount,
      details: mergeResult.details,
      errors: mergeResult.errors.length > 0 ? mergeResult.errors : undefined,
    })
  } catch (error) {
    console.error('Merge duplicates error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

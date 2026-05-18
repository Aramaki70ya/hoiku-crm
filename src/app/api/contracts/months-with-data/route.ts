import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

function ymFromDate(d: string | null | undefined): string | null {
  if (!d) return null
  return d.slice(0, 7)
}

function ymFromCancelledAt(ts: string | null | undefined): string | null {
  if (!ts) return null
  return ts.slice(0, 7)
}

/** 成約（承諾）またはキャンセル記録のある月の一覧（YYYY-MM、昇順） */
export async function GET() {
  try {
    const months = new Set<string>()

    if (isDemoMode()) {
      const { mockContracts } = await import('@/lib/mock-data')
      mockContracts.forEach((c) => {
        const open = c.is_cancelled !== true
        if (open && c.accepted_date) {
          const ym = ymFromDate(c.accepted_date)
          if (ym) months.add(ym)
        }
        if (c.is_cancelled === true && c.cancelled_at) {
          const ym = ymFromCancelledAt(c.cancelled_at)
          if (ym) months.add(ym)
        }
      })
      const sorted = [...months].sort()
      return NextResponse.json({ months: sorted })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const pageSize = 1000
    let from = 0
    for (;;) {
      const { data, error } = await supabase
        .from('contracts')
        .select('accepted_date, cancelled_at, is_cancelled')
        .range(from, from + pageSize - 1)

      if (error) throw error
      if (!data?.length) break

      for (const row of data) {
        const cancelled = row.is_cancelled === true
        if (!cancelled && row.accepted_date) {
          const ym = ymFromDate(row.accepted_date)
          if (ym) months.add(ym)
        }
        if (cancelled && row.cancelled_at) {
          const ym = ymFromCancelledAt(row.cancelled_at)
          if (ym) months.add(ym)
        }
      }

      if (data.length < pageSize) break
      from += pageSize
    }

    const sorted = [...months].sort()
    return NextResponse.json({ months: sorted })
  } catch (e) {
    console.error('months-with-data:', e)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

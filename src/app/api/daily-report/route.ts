import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'
import * as holiday_jp from '@holiday-jp/holiday_jp'

/**
 * 指定した日付が営業日かどうかを判定（土日・日本の祝日を除外）
 */
function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  if (day === 0 || day === 6) return false // 日曜・土曜
  return !holiday_jp.isHoliday(date) // 祝日
}

/**
 * 前営業日を計算する（土日・日本の祝日を除外）
 * 例: 月曜 → 金曜, 祝日の翌日 → 祝日前の最終営業日
 */
function getPreviousBusinessDate(date: Date): Date {
  const d = new Date(date)
  do {
    d.setDate(d.getDate() - 1)
  } while (!isBusinessDay(d))
  return d
}

/**
 * 日付を YYYY-MM-DD 形式の開始・終了（UTC 00:00:00 〜 23:59:59.999）に変換
 * Supabase は TIMESTAMPTZ なので JST で日付を扱う
 */
function getDateRangeInISO(date: Date): { start: string; end: string } {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  // JST で 00:00:00 と 23:59:59.999 を ISO に
  const start = `${y}-${m}-${d}T00:00:00+09:00`
  const end = `${y}-${m}-${d}T23:59:59.999+09:00`
  return { start, end }
}

/**
 * GET: 前営業日にメモを残した求職者一覧を返す
 */
export async function GET() {
  try {
    if (isDemoMode()) {
      return NextResponse.json({
        data: [],
        targetDate: null,
        message: 'デモモードではデータを取得できません',
      })
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const today = new Date()
    const prevBizDate = getPreviousBusinessDate(today)
    const { start, end } = getDateRangeInISO(prevBizDate)

    // timeline_events で event_type='memo' かつ 前営業日の範囲内
    const { data: events, error: eventsError } = await supabase
      .from('timeline_events')
      .select(`
        id,
        candidate_id,
        title,
        description,
        created_at,
        created_by_user:users(id, name)
      `)
      .eq('event_type', 'memo')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false })

    if (eventsError) {
      console.error('daily-report events error:', eventsError)
      return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
    }

    const candidateIds = [...new Set((events || []).map((e) => e.candidate_id))] as string[]
    if (candidateIds.length === 0) {
      return NextResponse.json({
        data: [],
        targetDate: prevBizDate.toISOString().slice(0, 10),
        events: [],
      })
    }

    // 求職者情報を取得（担当者・ステータス・職種等）
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select(`
        id,
        name,
        kana,
        status,
        consultant_id,
        desired_job_type,
        memo,
        consultant:users(id, name)
      `)
      .in('id', candidateIds)

    if (candidatesError) {
      console.error('daily-report candidates error:', candidatesError)
      return NextResponse.json({ error: '求職者データの取得に失敗しました' }, { status: 500 })
    }

    // candidate_id ごとに前営業日のメモイベントをまとめる
    const eventsByCandidate = (events || []).reduce<Record<string, typeof events>>((acc, e) => {
      if (!acc[e.candidate_id]) acc[e.candidate_id] = []
      acc[e.candidate_id].push(e)
      return acc
    }, {})

    const data = (candidates || []).map((c) => ({
      candidate: c,
      memos: eventsByCandidate[c.id] || [],
    }))

    return NextResponse.json({
      data,
      targetDate: prevBizDate.toISOString().slice(0, 10),
      events: events || [],
    })
  } catch (error) {
    console.error('daily-report error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

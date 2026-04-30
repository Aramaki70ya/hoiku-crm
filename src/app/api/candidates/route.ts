import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'
import { computeNextNumericCandidateId, fetchAllCandidateIds } from '@/lib/candidate-next-id'

/** 開発時のみ API レスポンスに載せる（PostgREST / Supabase のエラー形を想定） */
function devErrorPayload(err: unknown): { details?: string; code?: string } {
  if (process.env.NODE_ENV !== 'development') return {}
  if (err && typeof err === 'object') {
    const o = err as { message?: string; details?: string; hint?: string; code?: string }
    const parts = [o.message, o.details, o.hint].filter(Boolean)
    return {
      ...(parts.length ? { details: parts.join(' — ') } : {}),
      ...(o.code ? { code: o.code } : {}),
    }
  }
  return { details: String(err) }
}

// Next.js サーバーレベルのキャッシュを完全に無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 求職者一覧取得
export async function GET(request: NextRequest) {
  try {
    // デモモードの場合はモックデータを返す
    if (isDemoMode()) {
      const { searchParams } = new URL(request.url)
      const { mockCandidates, mockUsers, mockSources } = await import('@/lib/mock-data')
      const rawLimit = parseInt(searchParams.get('limit') || '100')
      const offset = parseInt(searchParams.get('offset') || '0')
      const consultantParams = searchParams.getAll('consultant_id').filter((id) => id && id !== 'all')
      const singleConsultant = searchParams.get('consultant_id')
      const consultantIds =
        consultantParams.length > 0
          ? consultantParams
          : singleConsultant && singleConsultant !== 'all'
            ? [singleConsultant]
            : []
      const monthParams = searchParams.getAll('month').filter((m) => /^\d{4}-\d{2}$/.test(m))
      const singleMonth = searchParams.get('month')
      const months =
        monthParams.length > 0
          ? monthParams
          : singleMonth && /^\d{4}-\d{2}$/.test(singleMonth)
            ? [singleMonth]
            : []

      let list = mockCandidates.map((candidate) => ({
        ...candidate,
        consultant: mockUsers.find((u) => u.id === candidate.consultant_id) || null,
        source: mockSources.find((s) => s.id === candidate.source_id) || null,
      }))

      if (consultantIds.length === 1) {
        list = list.filter((c) => c.consultant_id === consultantIds[0])
      } else if (consultantIds.length > 1) {
        list = list.filter((c) => !!c.consultant_id && consultantIds.includes(c.consultant_id))
      }

      if (months.length === 1) {
        const [y, m] = months[0].split('-').map(Number)
        const ym = `${y}-${String(m).padStart(2, '0')}`
        list = list.filter((c) => (c.registered_at || '').slice(0, 7) === ym)
      } else if (months.length > 1) {
        const monthSet = new Set(months)
        list = list.filter((c) => monthSet.has((c.registered_at || '').slice(0, 7)))
      }

      const search = searchParams.get('search') || ''
      if (search) {
        const q = search.toLowerCase()
        list = list.filter(
          (c) =>
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.id && String(c.id).toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(search))
        )
      }

      const total = list.length
      const limit = Math.min(rawLimit, 500)
      const page = list.slice(offset, offset + limit)

      const res = NextResponse.json({
        data: page,
        total,
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      })
      res.headers.set('Cache-Control', 'no-store, max-age=0')
      return res
    }

    const supabase = await createClient()
    
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    // クエリパラメータ
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const consultantParams = searchParams.getAll('consultant_id').filter((id) => id && id !== 'all')
    const singleConsultant = searchParams.get('consultant_id')
    const consultantIds =
      consultantParams.length > 0
        ? consultantParams
        : singleConsultant && singleConsultant !== 'all'
          ? [singleConsultant]
          : []
    const search = searchParams.get('search') || ''
    const rawLimit = parseInt(searchParams.get('limit') || '100')
    // 担当フィルタ時は全件返すため 1000 まで許可（Supabase のデフォルト上限）
    const limit =
      consultantIds.length > 0 ? Math.min(rawLimit, 1000) : Math.min(rawLimit, 500)
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // データ取得（registered_at を明示して確実に含める）
    let query = supabase
      .from('candidates')
      .select(`
        id, name, kana, phone, email, birth_date, age, prefecture, address,
        qualification, desired_employment_type, desired_job_type, status,
        source_id, registered_at, re_registered_at, consultant_id, approach_priority, rank, memo,
        created_at, updated_at,
        consultant:users(id, name, email, role),
        source:sources(id, name, category)
      `, { count: 'exact' })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (consultantIds.length === 1) {
      query = query.eq('consultant_id', consultantIds[0])
    } else if (consultantIds.length > 1) {
      query = query.in('consultant_id', consultantIds)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,id.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    // 登録月フィルタ（複数 month は OR）
    const monthParams = searchParams.getAll('month').filter((m) => /^\d{4}-\d{2}$/.test(m))
    const singleMonth = searchParams.get('month')
    const months =
      monthParams.length > 0
        ? monthParams
        : singleMonth && /^\d{4}-\d{2}$/.test(singleMonth)
          ? [singleMonth]
          : []
    if (months.length === 1) {
      const [y, m] = months[0].split('-').map(Number)
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`
      const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
      query = query.gte('registered_at', startDate).lt('registered_at', nextMonth)
    } else if (months.length > 1) {
      const orParts = months.map((month) => {
        const [y, m] = month.split('-').map(Number)
        const startDate = `${y}-${String(m).padStart(2, '0')}-01`
        const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
        return `and(registered_at.gte.${startDate},registered_at.lt.${nextMonth})`
      })
      query = query.or(orParts.join(','))
    }

    if (limit) {
      query = query.range(offset, offset + limit - 1)
    }

    query = query.order('registered_at', { ascending: false })

    const { data, error, count } = await query
    if (error) throw error

    const res = NextResponse.json({
      data,
      total: count,
      pagination: { total: count, limit, offset, hasMore: (offset + limit) < (count || 0) }
    })
    res.headers.set('Cache-Control', 'no-store, max-age=0')
    return res
  } catch (error) {
    console.error('Error fetching candidates:', error)
    return NextResponse.json(
      { error: 'サーバーエラー', ...devErrorPayload(error) },
      { status: 500 }
    )
  }
}

// 新規求職者登録
export async function POST(request: NextRequest) {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ error: 'デモモードでは登録できません' }, { status: 403 })
    }

    const supabase = await createClient()
    
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // バリデーション
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: '氏名は必須です' }, { status: 400 })
    }
    
    // 新規 ID は数値としての最大 + 1（TEXT の ORDER BY では桁違い ID で誤った値になり UNIQUE 違反になる）
    const idList = await fetchAllCandidateIds(supabase)
    const newId = computeNextNumericCandidateId(idList)
    
    const now = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('candidates')
      .insert({
        id: newId,
        name: body.name,
        kana: body.kana || null,
        phone: body.phone || null,
        email: body.email || null,
        birth_date: body.birth_date || null,
        age: body.age || null,
        prefecture: body.prefecture || null,
        address: body.address || null,
        qualification: body.qualification || null,
        desired_employment_type: body.desired_employment_type || null,
        desired_job_type: body.desired_job_type || null,
        status: body.status || '初回連絡中',
        source_id: body.source_id || null,
        registered_at: body.registered_at || now.split('T')[0],
        consultant_id: body.consultant_id || null,
        approach_priority: body.approach_priority || null,
        rank: body.rank || null,
        memo: body.memo || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) throw error
    
    return NextResponse.json({ data, message: '求職者を登録しました' }, { status: 201 })
  } catch (error) {
    console.error('Error creating candidate:', error)
    return NextResponse.json(
      { error: 'サーバーエラー', ...devErrorPayload(error) },
      { status: 500 }
    )
  }
}

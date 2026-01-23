import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

// 求職者一覧取得
export async function GET(request: NextRequest) {
  try {
    // デモモードの場合はモックデータを返す
    if (isDemoMode()) {
      const { mockCandidates, mockUsers, mockSources } = await import('@/lib/mock-data')
      return NextResponse.json({
        data: mockCandidates.map(candidate => ({
          ...candidate,
          consultant: mockUsers.find(u => u.id === candidate.consultant_id) || null,
          source: mockSources.find(s => s.id === candidate.source_id) || null,
        })),
        total: mockCandidates.length,
      })
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
    const consultantId = searchParams.get('consultant_id') || 'all'
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // データ取得
    let query = supabase
      .from('candidates')
      .select(`
        *,
        consultant:users(id, name, email, role),
        source:sources(id, name, category)
      `, { count: 'exact' })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (consultantId && consultantId !== 'all') {
      query = query.eq('consultant_id', consultantId)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,id.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    if (limit) {
      query = query.range(offset, offset + limit - 1)
    }

    query = query.order('registered_at', { ascending: false })

    const { data, error, count } = await query
    if (error) throw error
    
    return NextResponse.json({
      data,
      total: count,
      pagination: { total: count, limit, offset, hasMore: (offset + limit) < (count || 0) }
    })
  } catch (error) {
    console.error('Error fetching candidates:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
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
    
    // 新規ID生成（8桁の数字）
    const { data: lastCandidate } = await supabase
      .from('candidates')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single()
    
    const lastId = lastCandidate?.id ? parseInt(lastCandidate.id) : 20200000
    const newId = String(lastId + 1)
    
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
        status: body.status || 'new',
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
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

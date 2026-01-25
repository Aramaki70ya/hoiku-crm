import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

// タイムラインイベント一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const candidateId = searchParams.get('candidate_id')
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50

    if (isDemoMode()) {
      // デモモードではlocalStorageの代わりに空配列を返す
      return NextResponse.json({
        data: [],
        total: 0,
      })
    }

    const supabase = await createClient()
    
    // 認証チェック（オプショナル - 開発中は緩める）
    const { data: { user } } = await supabase.auth.getUser()
    
    let query = supabase
      .from('timeline_events')
      .select(`
        *,
        created_by_user:users(id, name)
      `, { count: 'exact' })

    // 求職者IDでフィルタ
    if (candidateId) {
      query = query.eq('candidate_id', candidateId)
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(limit)

    const { data, error, count } = await query
    if (error) throw error
    
    return NextResponse.json({
      data: data || [],
      total: count,
    })
  } catch (error) {
    console.error('Error fetching timeline events:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// 新規タイムラインイベント登録
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (isDemoMode()) {
      // デモモードでも登録可能にする（モックとして）
      return NextResponse.json({ 
        data: {
          id: `mock_${Date.now()}`,
          ...body,
          created_at: new Date().toISOString(),
        }, 
        message: 'タイムラインイベントを登録しました' 
      }, { status: 201 })
    }

    const supabase = await createClient()
    
    if (!body.candidate_id) {
      return NextResponse.json({ error: '求職者IDは必須です' }, { status: 400 })
    }
    
    if (!body.event_type) {
      return NextResponse.json({ error: 'イベントタイプは必須です' }, { status: 400 })
    }
    
    if (!body.title) {
      return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('timeline_events')
      .insert({
        candidate_id: body.candidate_id,
        event_type: body.event_type,
        title: body.title,
        description: body.description || null,
        created_by: null,
      })
      .select(`
        *,
        created_by_user:users(id, name)
      `)
      .single()

    if (error) {
      console.error('Timeline event insert error:', error)
      return NextResponse.json({ 
        error: 'データベースエラー', 
        details: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({ data, message: 'タイムラインイベントを登録しました' }, { status: 201 })
  } catch (error) {
    console.error('Error creating timeline event:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'サーバーエラー', details: errorMessage }, { status: 500 })
  }
}

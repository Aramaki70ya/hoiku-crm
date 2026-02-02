import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

// Next.js サーバーレベルのキャッシュを完全に無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 面接一覧取得
export async function GET(request: NextRequest) {
  try {
    if (isDemoMode()) {
      const { mockInterviews, mockProjects, mockCandidates, mockUsers } = await import('@/lib/mock-data')
      
      const enrichedInterviews = mockInterviews.map(interview => {
        const project = mockProjects.find(p => p.id === interview.project_id)
        const candidate = project ? mockCandidates.find(c => c.id === project.candidate_id) : null
        const consultant = candidate ? mockUsers.find(u => u.id === candidate.consultant_id) : null
        
        return {
          ...interview,
          project,
          candidate,
          consultant,
        }
      })
      
      return NextResponse.json({
        data: enrichedInterviews,
        total: enrichedInterviews.length,
      })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // YYYY-MM形式
    const status = searchParams.get('status') || 'all'
    const consultantId = searchParams.get('consultant_id') || 'all'
    
    let query = supabase
      .from('interviews')
      .select(`
        *,
        project:projects(
          id, candidate_id, client_name, phase,
          candidate:candidates(
            id, name, phone, status, consultant_id,
            consultant:users(id, name)
          )
        )
      `, { count: 'exact' })

    // 月でフィルタ
    if (month) {
      const startDate = `${month}-01T00:00:00Z`
      const year = parseInt(month.split('-')[0])
      const monthNum = parseInt(month.split('-')[1])
      const endDate = new Date(year, monthNum, 0, 23, 59, 59).toISOString()
      query = query.gte('start_at', startDate).lte('start_at', endDate)
    }

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    query = query.order('start_at', { ascending: true })

    const { data, error, count } = await query
    if (error) throw error
    
    // 担当者でフィルタ（リレーション後）
    let filteredData = data || []
    if (consultantId && consultantId !== 'all') {
      filteredData = filteredData.filter((interview: { project?: { candidate?: { consultant_id?: string } } }) => 
        interview.project?.candidate?.consultant_id === consultantId
      )
    }
    
    const res = NextResponse.json({
      data: filteredData,
      total: count,
    })
    res.headers.set('Cache-Control', 'no-store, max-age=0')
    return res
  } catch (error) {
    console.error('Error fetching interviews:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// 新規面接登録
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('🟢 [API] POST interviews body:', body)
    
    if (isDemoMode()) {
      return NextResponse.json({ error: 'デモモードでは登録できません' }, { status: 403 })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('🟢 [API] Auth check:', { userId: user?.id, authError: authError?.message })
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    if (!body.project_id) {
      return NextResponse.json({ error: 'プロジェクトIDは必須です' }, { status: 400 })
    }
    
    if (!body.start_at) {
      return NextResponse.json({ error: '開始日時は必須です' }, { status: 400 })
    }
    
    const now = new Date().toISOString()
    
    const insertData = {
      project_id: body.project_id,
      type: body.type || 'interview',
      start_at: body.start_at,
      end_at: body.end_at || null,
      location: body.location || null,
      status: body.status || 'scheduled',
      feedback: body.feedback || null,
      created_at: now,
    }
    console.log('🟢 [API] Inserting interview:', insertData)
    
    const { data, error } = await supabase
      .from('interviews')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('🔴 [API] Interview insert error:', error)
      return NextResponse.json({ error: 'データベースエラー', details: error.message }, { status: 500 })
    }
    
    console.log('🟢 [API] Interview created:', data)
    return NextResponse.json({ data, message: '面接を登録しました' }, { status: 201 })
  } catch (error) {
    console.error('🔴 [API] Error creating interview:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'サーバーエラー', details: errorMessage }, { status: 500 })
  }
}

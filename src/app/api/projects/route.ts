import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

// プロジェクト一覧取得
export async function GET(request: NextRequest) {
  try {
    if (isDemoMode()) {
      const { mockProjects, mockCandidates, mockInterviews } = await import('@/lib/mock-data')
      
      const enrichedProjects = mockProjects.map(project => ({
        ...project,
        candidate: mockCandidates.find(c => c.id === project.candidate_id),
        interviews: mockInterviews.filter(i => i.project_id === project.id),
      }))
      
      return NextResponse.json({
        data: enrichedProjects,
        total: enrichedProjects.length,
      })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const candidateId = searchParams.get('candidate_id')
    
    let query = supabase
      .from('projects')
      .select(`
        *,
        candidate:candidates(id, name, status, consultant_id),
        interviews(*)
      `, { count: 'exact' })

    if (candidateId) {
      query = query.eq('candidate_id', candidateId)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error, count } = await query
    if (error) throw error
    
    return NextResponse.json({
      data,
      total: count,
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// 新規プロジェクト登録
export async function POST(request: NextRequest) {
  try {
    if (isDemoMode()) {
      return NextResponse.json({ error: 'デモモードでは登録できません' }, { status: 403 })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const body = await request.json()
    
    if (!body.candidate_id) {
      return NextResponse.json({ error: '候補者IDは必須です' }, { status: 400 })
    }
    
    if (!body.client_name) {
      return NextResponse.json({ error: '園名/法人名は必須です' }, { status: 400 })
    }
    
    const now = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        candidate_id: body.candidate_id,
        client_name: body.client_name,
        phase: body.phase || 'proposed',
        expected_amount: body.expected_amount || null,
        probability: body.probability || null,
        expected_entry_date: body.expected_entry_date || null,
        note: body.note || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) throw error
    
    return NextResponse.json({ data, message: 'プロジェクトを登録しました' }, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

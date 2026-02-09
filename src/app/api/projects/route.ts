import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

// Next.js サーバーレベルのキャッシュを完全に無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    
    const gardenName = typeof body.garden_name === 'string' ? body.garden_name.trim() : ''
    const corporationName = typeof body.corporation_name === 'string' ? body.corporation_name.trim() : ''
    const clientName = typeof body.client_name === 'string' ? body.client_name.trim() : ''

    if (!clientName && (!gardenName || !corporationName)) {
      return NextResponse.json({ error: '園名と法人名は必須です' }, { status: 400 })
    }

    const displayName = clientName || [gardenName, corporationName].filter(Boolean).join(' / ')
    
    const now = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        candidate_id: body.candidate_id,
        client_name: displayName,
        garden_name: gardenName || null,
        corporation_name: corporationName || null,
        phase: body.phase || '提案済',
        expected_amount: body.expected_amount || null,
        probability: body.probability || null,
        probability_month: body.probability_month || 'current',
        expected_entry_date: body.expected_entry_date || null,
        note: body.note || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) throw error
    
    return NextResponse.json({ data, message: 'プロジェクトを登録しました' }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating project:', error)
    const err = error as { message?: string; details?: string; code?: string }
    const details = err?.message ?? err?.details ?? (error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'サーバーエラー', details: details || 'Unknown error' }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

// 面接詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (isDemoMode()) {
      const { mockInterviews, mockProjects, mockCandidates } = await import('@/lib/mock-data')
      const interview = mockInterviews.find(i => i.id === id)
      if (!interview) {
        return NextResponse.json({ error: '面接が見つかりません' }, { status: 404 })
      }
      const project = mockProjects.find(p => p.id === interview.project_id)
      const candidate = project ? mockCandidates.find(c => c.id === project.candidate_id) : null
      return NextResponse.json({ data: { ...interview, project, candidate } })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        project:projects(
          *,
          candidate:candidates(*)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '面接が見つかりません' }, { status: 404 })
      }
      throw error
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching interview:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// 面接更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (isDemoMode()) {
      const body = await request.json()
      return NextResponse.json({ 
        data: { id, ...body },
        message: '面接情報を更新しました（デモモード）' 
      })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('interviews')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '面接が見つかりません' }, { status: 404 })
      }
      throw error
    }
    
    return NextResponse.json({ data, message: '面接情報を更新しました' })
  } catch (error) {
    console.error('Error updating interview:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// 面接削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (isDemoMode()) {
      return NextResponse.json({ error: 'デモモードでは削除できません' }, { status: 403 })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const { error } = await supabase
      .from('interviews')
      .delete()
      .eq('id', id)

    if (error) throw error
    
    return NextResponse.json({ message: '面接を削除しました' })
  } catch (error) {
    console.error('Error deleting interview:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

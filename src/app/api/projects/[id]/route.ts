import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

// プロジェクト詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (isDemoMode()) {
      const { mockProjects, mockCandidates, mockInterviews } = await import('@/lib/mock-data')
      const project = mockProjects.find(p => p.id === id)
      if (!project) {
        return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 })
      }
      return NextResponse.json({ 
        data: {
          ...project,
          candidate: mockCandidates.find(c => c.id === project.candidate_id),
          interviews: mockInterviews.filter(i => i.project_id === id),
        }
      })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        candidate:candidates(*),
        interviews(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 })
      }
      throw error
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// プロジェクト更新
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
        message: 'プロジェクト情報を更新しました（デモモード）' 
      })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 })
      }
      throw error
    }
    
    return NextResponse.json({ data, message: 'プロジェクト情報を更新しました' })
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// プロジェクト削除
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
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error
    
    return NextResponse.json({ message: 'プロジェクトを削除しました' })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

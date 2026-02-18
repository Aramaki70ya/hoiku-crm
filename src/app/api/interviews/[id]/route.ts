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
    
    // 無効化処理の場合は、候補者ステータスも更新する
    if (body.is_voided === true) {
      // 面接レコードを取得して関連候補者を特定
      const { data: interview, error: fetchError } = await supabase
        .from('interviews')
        .select(`
          *,
          project:projects(
            id,
            candidate_id
          )
        `)
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('Error fetching interview for void:', fetchError)
        return NextResponse.json({ error: '面接情報の取得に失敗しました' }, { status: 500 })
      }

      if (!interview?.project?.candidate_id) {
        return NextResponse.json({ error: '関連する候補者が見つかりません' }, { status: 404 })
      }

      // 無効化日時を設定
      if (!body.voided_at) {
        body.voided_at = new Date().toISOString()
      }

      // 候補者ステータスを「提案求人選定中」へ更新
      const { error: candidateUpdateError } = await supabase
        .from('candidates')
        .update({ status: '提案求人選定中' })
        .eq('id', interview.project.candidate_id)

      if (candidateUpdateError) {
        console.error('Error updating candidate status on void:', candidateUpdateError)
        // 候補者更新失敗はログのみ（面接の無効化は継続）
      }
    }
    
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
    
    const { data, error } = await supabase
      .from('interviews')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) throw error
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: '面接が見つからないか、削除権限がありません', details: 'RLSのDELETEポリシーを確認してください' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: '面接を削除しました' })
  } catch (error) {
    console.error('Error deleting interview:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

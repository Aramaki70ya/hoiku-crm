import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'
import type { CandidateStatus } from '@/types/database'
import { candidateStatusToInterviewStatus, STATUS_LIST } from '@/lib/status-mapping'

// Next.js サーバーレベルのキャッシュを完全に無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 求職者詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (isDemoMode()) {
      const { mockCandidates, mockUsers, mockSources, mockProjects } = await import('@/lib/mock-data')
      const candidate = mockCandidates.find(c => c.id === id)
      if (!candidate) {
        return NextResponse.json({ error: '求職者が見つかりません' }, { status: 404 })
      }
      const res = NextResponse.json({
        data: {
          ...candidate,
          consultant: mockUsers.find(u => u.id === candidate.consultant_id) || null,
          source: mockSources.find(s => s.id === candidate.source_id) || null,
          projects: mockProjects.filter(p => p.candidate_id === id),
        }
      })
      res.headers.set('Cache-Control', 'no-store, max-age=0')
      return res
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const { data, error } = await supabase
      .from('candidates')
      .select(`
        *,
        consultant:users(id, name, email, role),
        source:sources(id, name, category),
        projects(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '求職者が見つかりません' }, { status: 404 })
      }
      throw error
    }

    const res = NextResponse.json({ data })
    res.headers.set('Cache-Control', 'no-store, max-age=0')
    return res
  } catch (error) {
    console.error('Error fetching candidate:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// 求職者更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (isDemoMode()) {
      // デモモードでは成功を返す（実際の更新は行わない）
      const body = await request.json()
      return NextResponse.json({ 
        data: { id, ...body },
        message: '求職者情報を更新しました（デモモード）' 
      })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const body = (await request.json()) as Record<string, unknown>

    // ステータス変更時は有効な値のみ許可
    if (body.status !== undefined) {
      const validStatuses = new Set(STATUS_LIST)
      if (typeof body.status !== 'string' || !validStatuses.has(body.status as CandidateStatus)) {
        return NextResponse.json({ error: '無効なステータスです' }, { status: 400 })
      }
    }

    const ALLOWED_KEYS = [
      'status',
      'memo',
      'consultant_id',
      'approach_priority',
      'desired_employment_type',
      'name',
      'kana',
      'phone',
      'email',
      'birth_date',
      'age',
      'prefecture',
      'address',
      'qualification',
      'desired_job_type',
      'source_id',
      'registered_at',
      'rank',
    ] as const

    // ステータス変更の場合、変更前のステータスを取得
    let oldStatus: string | null = null
    if (body.status !== undefined) {
      const { data: oldData } = await supabase
        .from('candidates')
        .select('status')
        .eq('id', id)
        .single()
      oldStatus = oldData?.status || null
    }

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const k of ALLOWED_KEYS) {
      if (body[k] !== undefined) updatePayload[k] = body[k]
    }
    // 新体系ではDBにそのまま日本語で保存（変換不要）

    const { data, error } = await supabase
      .from('candidates')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '求職者が見つかりません' }, { status: 404 })
      }
      console.error('PATCH candidates error:', error.message, error.details)
      throw error
    }

    // ステータスが変更された場合、status_history と timeline_events に記録
    if (body.status !== undefined && oldStatus && oldStatus !== body.status) {
      const now = new Date().toISOString()

      const { error: historyError } = await supabase.from('status_history').insert({
        candidate_id: id,
        old_status: oldStatus,
        new_status: body.status as string,
        changed_by: user.id,
        changed_at: now,
      })
      if (historyError) {
        console.error('status_history insert error:', historyError.message, { candidate_id: id })
      }

      const { error: timelineError } = await supabase.from('timeline_events').insert({
        candidate_id: id,
        event_type: 'status_change',
        title: 'ステータス変更',
        description: `${oldStatus} → ${body.status}`,
        metadata: { from_status: oldStatus, to_status: body.status },
        created_by: user.id,
      })
      if (timelineError) {
        console.error('timeline_events insert error:', timelineError.message, { candidate_id: id })
      }
    }

    // 求職者ステータスを「面接〜」にしたとき、面接一覧・ダッシュボードに反映するため interviews.status を同期する
    const rawStatus = body.status as string | undefined
    const targetInterviewStatus = rawStatus ? candidateStatusToInterviewStatus[rawStatus] : null
    if (targetInterviewStatus) {
      const { data: projects } = await supabase.from('projects').select('id').eq('candidate_id', id)
      if (projects && projects.length > 0) {
        const projectIds = projects.map((p) => p.id)
        const { data: candidateInterviews } = await supabase
          .from('interviews')
          .select('id, start_at')
          .in('project_id', projectIds)
          .neq('status', 'キャンセル')
          .order('start_at', { ascending: false })
        const toUpdate = candidateInterviews && candidateInterviews.length > 0 ? candidateInterviews[0] : null
        if (toUpdate?.id) {
          await supabase.from('interviews').update({ status: targetInterviewStatus }).eq('id', toUpdate.id)
        }
      }
    }

    return NextResponse.json({ data, message: '求職者情報を更新しました' })
  } catch (error) {
    console.error('Error updating candidate:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// 求職者削除
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
      .from('candidates')
      .delete()
      .eq('id', id)

    if (error) throw error
    
    return NextResponse.json({ message: '求職者を削除しました' })
  } catch (error) {
    console.error('Error deleting candidate:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

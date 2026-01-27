import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'
import { mapNewStatusToLegacy } from '@/lib/status-mapping'

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

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const k of ALLOWED_KEYS) {
      if (body[k] !== undefined) updatePayload[k] = body[k]
    }
    if (typeof updatePayload.status === 'string') {
      updatePayload.status = mapNewStatusToLegacy(updatePayload.status)
    }

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

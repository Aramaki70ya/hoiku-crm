import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

// 成約詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (isDemoMode()) {
      const { mockContracts, mockCandidates } = await import('@/lib/mock-data')
      const contract = mockContracts.find(c => c.id === id)
      if (!contract) {
        return NextResponse.json({ error: '成約が見つかりません' }, { status: 404 })
      }
      const candidate = mockCandidates.find(c => c.id === contract.candidate_id)
      return NextResponse.json({ data: { ...contract, candidate } })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        candidate:candidates(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '成約が見つかりません' }, { status: 404 })
      }
      throw error
    }
    
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error fetching contract:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// 成約更新
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
        message: '成約情報を更新しました（デモモード）' 
      })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('contracts')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '成約が見つかりません' }, { status: 404 })
      }
      throw error
    }
    
    return NextResponse.json({ data, message: '成約情報を更新しました' })
  } catch (error) {
    console.error('Error updating contract:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// 成約削除（キャンセル処理用）
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
      .from('contracts')
      .delete()
      .eq('id', id)

    if (error) throw error
    
    return NextResponse.json({ message: '成約を削除しました' })
  } catch (error) {
    console.error('Error deleting contract:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

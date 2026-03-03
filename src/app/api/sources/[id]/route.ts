import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

// 媒体更新
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
        message: '媒体情報を更新しました（デモモード）' 
      })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const rawBody = (await request.json()) as Record<string, unknown>

    // 更新可能フィールドのみ反映（部分更新で他カラムを上書きしない）
    const ALLOWED_PATCH_FIELDS = ['name', 'category'] as const
    const updateRow: Record<string, unknown> = {}
    for (const key of ALLOWED_PATCH_FIELDS) {
      if (rawBody[key] !== undefined) {
        updateRow[key] = key === 'name' && typeof rawBody[key] === 'string'
          ? (rawBody[key] as string).trim()
          : rawBody[key]
      }
    }
    if (Object.keys(updateRow).length === 0) {
      return NextResponse.json({ error: '更新する項目がありません' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('sources')
      .update(updateRow)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '媒体が見つかりません' }, { status: 404 })
      }
      throw error
    }
    
    return NextResponse.json({ data, message: '媒体情報を更新しました' })
  } catch (error) {
    console.error('Error updating source:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// 媒体削除
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
      .from('sources')
      .delete()
      .eq('id', id)

    if (error) throw error
    
    return NextResponse.json({ message: '媒体を削除しました' })
  } catch (error) {
    console.error('Error deleting source:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

// 媒体一覧取得
export async function GET() {
  try {
    if (isDemoMode()) {
      const { mockSources } = await import('@/lib/mock-data')
      return NextResponse.json({
        data: mockSources,
        total: mockSources.length,
      })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const { data, error, count } = await supabase
      .from('sources')
      .select('*', { count: 'exact' })
      .order('name')

    if (error) throw error
    
    return NextResponse.json({
      data,
      total: count,
    })
  } catch (error) {
    console.error('Error fetching sources:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// 新規媒体登録
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
    
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: '媒体名は必須です' }, { status: 400 })
    }
    
    const { data, error } = await supabase
      .from('sources')
      .insert({
        name: body.name,
        category: body.category || null,
      })
      .select()
      .single()

    if (error) throw error
    
    return NextResponse.json({ data, message: '媒体を登録しました' }, { status: 201 })
  } catch (error) {
    console.error('Error creating source:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

// 個人別月次目標一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const yearMonth = searchParams.get('year_month')
    const userId = searchParams.get('user_id')

    if (isDemoMode()) {
      // デモモードではモックデータを返す
      return NextResponse.json({
        data: [
          { user_id: '1', sales_budget: 3000000, interview_target: 8 },
          { user_id: '2', sales_budget: 3000000, interview_target: 8 },
          { user_id: '3', sales_budget: 3500000, interview_target: 8 },
          { user_id: '4', sales_budget: 3500000, interview_target: 8 },
          { user_id: '5', sales_budget: 3000000, interview_target: 8 },
          { user_id: '6', sales_budget: 3000000, interview_target: 8 },
          { user_id: '7', sales_budget: 3000000, interview_target: 8 },
          { user_id: '8', sales_budget: 3000000, interview_target: 8 },
          { user_id: '9', sales_budget: 3000000, interview_target: 8 },
        ],
      })
    }

    const supabase = await createClient()

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    let query = supabase
      .from('user_monthly_targets')
      .select(`
        *,
        user:users(id, name)
      `)

    if (yearMonth) {
      query = query.eq('year_month', yearMonth)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query.order('user_id')

    if (error) throw error

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Error fetching user monthly targets:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// 個人別月次目標登録・更新（UPSERT）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (isDemoMode()) {
      return NextResponse.json({
        data: { id: 'mock', ...body },
        message: '個人目標を保存しました',
      }, { status: 201 })
    }

    const supabase = await createClient()

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (!body.year_month || !body.user_id) {
      return NextResponse.json({ error: 'year_monthとuser_idは必須です' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('user_monthly_targets')
      .upsert({
        year_month: body.year_month,
        user_id: body.user_id,
        sales_budget: body.sales_budget,
        interview_target: body.interview_target,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'year_month,user_id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data, message: '個人目標を保存しました' }, { status: 201 })
  } catch (error) {
    console.error('Error saving user monthly targets:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

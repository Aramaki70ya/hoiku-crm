import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

// 月次目標一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const yearMonth = searchParams.get('year_month')

    if (isDemoMode()) {
      // デモモードではモックデータを返す
      return NextResponse.json({
        data: {
          year_month: yearMonth || '2026-01',
          total_sales_budget: 29000000,
          registration_to_first_contact_rate: 0.65,
          first_contact_to_interview_rate: 0.80,
          interview_to_closed_rate: 0.60,
          closed_unit_price: 600000,
          interview_target: 8,
        },
      })
    }

    const supabase = await createClient()

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    let query = supabase.from('monthly_targets').select('*')

    if (yearMonth) {
      query = query.eq('year_month', yearMonth)
    }

    const { data, error } = await query.order('year_month', { ascending: false }).limit(1).single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error
    }

    return NextResponse.json({ data: data || null })
  } catch (error) {
    console.error('Error fetching monthly targets:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// 月次目標登録・更新（UPSERT）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (isDemoMode()) {
      return NextResponse.json({
        data: { id: 'mock', ...body },
        message: '目標を保存しました',
      }, { status: 201 })
    }

    const supabase = await createClient()

    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    if (!body.year_month) {
      return NextResponse.json({ error: 'year_monthは必須です' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('monthly_targets')
      .upsert({
        year_month: body.year_month,
        total_sales_budget: body.total_sales_budget,
        registration_to_first_contact_rate: body.registration_to_first_contact_rate,
        first_contact_to_interview_rate: body.first_contact_to_interview_rate,
        interview_to_closed_rate: body.interview_to_closed_rate,
        closed_unit_price: body.closed_unit_price,
        interview_target: body.interview_target,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'year_month' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data, message: '目標を保存しました' }, { status: 201 })
  } catch (error) {
    console.error('Error saving monthly targets:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

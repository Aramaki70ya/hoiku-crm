import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

// 成約一覧取得
export async function GET(request: NextRequest) {
  try {
    if (isDemoMode()) {
      const { mockContracts, mockCandidates, mockUsers, contractConsultants, contractCandidateNames, contractSources } = await import('@/lib/mock-data')
      
      const enrichedContracts = mockContracts.map(contract => {
        const candidate = mockCandidates.find(c => c.id === contract.candidate_id)
        const consultantId = candidate?.consultant_id || contractConsultants[contract.candidate_id]
        const consultant = mockUsers.find(u => u.id === consultantId)
        
        return {
          ...contract,
          candidate_name: candidate?.name || contractCandidateNames[contract.candidate_id] || '不明',
          consultant_id: consultantId,
          consultant_name: consultant?.name || '-',
          source_name: contractSources[contract.candidate_id] || '-',
        }
      })
      
      return NextResponse.json({
        data: enrichedContracts,
        total: enrichedContracts.length,
      })
    }

    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // YYYY-MM形式
    const consultantId = searchParams.get('consultant_id') || 'all'
    const candidateId = searchParams.get('candidate_id')
    
    let query = supabase
      .from('contracts')
      .select(`
        *,
        candidate:candidates(
          id, name, consultant_id,
          consultant:users(id, name),
          source:sources(id, name)
        )
      `, { count: 'exact' })

    // 求職者IDでフィルタ（最優先）
    if (candidateId) {
      query = query.eq('candidate_id', candidateId)
    }

    // 月でフィルタ
    if (month) {
      const startDate = `${month}-01`
      const endDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).toISOString().split('T')[0]
      query = query.gte('accepted_date', startDate).lte('accepted_date', endDate)
    }

    query = query.order('accepted_date', { ascending: false })

    const { data, error, count } = await query
    if (error) throw error
    
    // 担当者でフィルタ（リレーション後）
    let filteredData = data || []
    if (consultantId && consultantId !== 'all') {
      filteredData = filteredData.filter((contract: { candidate?: { consultant_id?: string } }) => 
        contract.candidate?.consultant_id === consultantId
      )
    }
    
    return NextResponse.json({
      data: filteredData,
      total: count,
    })
  } catch (error) {
    console.error('Error fetching contracts:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// 新規成約登録
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
    
    if (!body.candidate_id) {
      return NextResponse.json({ error: '候補者IDは必須です' }, { status: 400 })
    }
    
    // 既にこの求職者の成約が存在するかチェック
    const { data: existingContracts, error: checkError } = await supabase
      .from('contracts')
      .select('id')
      .eq('candidate_id', body.candidate_id)
      .is('is_cancelled', null)
      .or('is_cancelled.eq.false')
    
    if (checkError) throw checkError
    
    if (existingContracts && existingContracts.length > 0) {
      return NextResponse.json({ 
        error: 'この求職者には既に成約が登録されています。成約管理画面で編集してください。' 
      }, { status: 400 })
    }
    
    const now = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('contracts')
      .insert({
        candidate_id: body.candidate_id,
        project_id: body.project_id || null,
        contracted_at: body.contracted_at || now,
        accepted_date: body.accepted_date || now.split('T')[0],
        entry_date: body.entry_date || null,
        employment_restriction_until: body.employment_restriction_until || null,
        employment_type: body.employment_type || null,
        job_type: body.job_type || null,
        revenue_excluding_tax: body.revenue_excluding_tax || 0,
        revenue_including_tax: body.revenue_including_tax || 0,
        payment_date: body.payment_date || null,
        payment_scheduled_date: body.payment_scheduled_date || null,
        invoice_sent_date: body.invoice_sent_date || null,
        calculation_basis: body.calculation_basis || null,
        document_url: body.document_url || null,
        placement_company: body.placement_company || null,
        placement_company_name: body.placement_company_name || null,
        placement_facility_name: body.placement_facility_name || null,
        note: body.note || null,
        is_cancelled: false,
        refund_required: false,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (error) throw error
    
    // 候補者のステータスを成約に更新
    await supabase
      .from('candidates')
      .update({ status: '内定承諾（成約）', updated_at: now })
      .eq('id', body.candidate_id)
    
    return NextResponse.json({ data, message: '成約を登録しました' }, { status: 201 })
  } catch (error) {
    console.error('Error creating contract:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

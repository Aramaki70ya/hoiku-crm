import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/supabase/config'

/** YYYY-MM の最終日 YYYY-MM-DD（ローカル日付。toISOString だと UTC ずれで3/31が3/30になる） */
function lastDayOfMonthYm(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** accepted_date が [fromYm, toYm] の各月内に含まれるか（日付文字列比較） */
function acceptedDateInRange(acceptedDate: string | null | undefined, fromYm: string, toYm: string): boolean {
  if (!acceptedDate) return false
  const d = acceptedDate.slice(0, 10)
  const fromStart = `${fromYm}-01`
  const toEnd = lastDayOfMonthYm(toYm)
  return d >= fromStart && d <= toEnd
}

/** cancelled_at が [fromYm, toYm] の範囲に入るか */
function cancelledAtInRange(cancelledAt: string | null | undefined, fromYm: string, toYm: string): boolean {
  if (!cancelledAt) return false
  const fromStart = `${fromYm}-01T00:00:00.000Z`
  const [ty, tm] = toYm.split('-').map(Number)
  const nextMonth = new Date(ty, tm, 1)
  const endExclusive = nextMonth.toISOString()
  return cancelledAt >= fromStart && cancelledAt < endExclusive
}

// 成約一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    let fromMonth = searchParams.get('from_month')
    let toMonth = searchParams.get('to_month')
    const listMode = searchParams.get('list_mode') || 'accepted' // accepted | cancelled
    const consultantId = searchParams.get('consultant_id') || 'all'
    const candidateId = searchParams.get('candidate_id')

    if (month && !fromMonth && !toMonth) {
      fromMonth = month
      toMonth = month
    }
    if (fromMonth && !toMonth) toMonth = fromMonth
    if (!fromMonth && toMonth) fromMonth = toMonth

    if (isDemoMode()) {
      const { mockContracts, mockCandidates, mockUsers, contractConsultants, contractCandidateNames, contractSources } = await import('@/lib/mock-data')

      let base = mockContracts
      if (fromMonth && toMonth) {
        if (listMode === 'cancelled') {
          base = base.filter(
            (c) =>
              c.is_cancelled === true &&
              cancelledAtInRange(c.cancelled_at, fromMonth, toMonth)
          )
        } else {
          base = base.filter((c) => acceptedDateInRange(c.accepted_date, fromMonth, toMonth))
        }
      }

      const enrichedContracts = base.map((contract) => {
        const candidate = mockCandidates.find((c) => c.id === contract.candidate_id)
        const consultantIdRow = candidate?.consultant_id || contractConsultants[contract.candidate_id]
        const consultant = mockUsers.find((u) => u.id === consultantIdRow)

        return {
          ...contract,
          candidate_name: candidate?.name || contractCandidateNames[contract.candidate_id] || '不明',
          consultant_id: consultantIdRow,
          consultant_name: consultant?.name || '-',
          source_name: contractSources[contract.candidate_id] || '-',
          candidate,
        }
      })

      let filteredData = enrichedContracts
      if (consultantId && consultantId !== 'all') {
        filteredData = filteredData.filter((row) => row.candidate?.consultant_id === consultantId)
      }

      return NextResponse.json({
        data: filteredData,
        total: filteredData.length,
      })
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

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

    if (candidateId) {
      query = query.eq('candidate_id', candidateId)
    }

    if (fromMonth && toMonth) {
      const fromStart = `${fromMonth}-01`
      const toEnd = lastDayOfMonthYm(toMonth)
      if (listMode === 'cancelled') {
        query = query.eq('is_cancelled', true)
        const [ty, tm] = toMonth.split('-').map(Number)
        const nextMonthStart = new Date(ty, tm, 1).toISOString()
        query = query
          .gte('cancelled_at', `${fromStart}T00:00:00.000Z`)
          .lt('cancelled_at', nextMonthStart)
      } else {
        query = query.gte('accepted_date', fromStart).lte('accepted_date', toEnd)
      }
    }

    query = query.order(listMode === 'cancelled' ? 'cancelled_at' : 'accepted_date', { ascending: false })

    const { data, error, count } = await query
    if (error) throw error

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
    
    // 候補者のステータスを成約に更新する前に、現在のステータスを取得
    const { data: oldCandidate } = await supabase
      .from('candidates')
      .select('status')
      .eq('id', body.candidate_id)
      .single()
    
    const oldStatus = oldCandidate?.status || null
    
    // 候補者のステータスを成約に更新
    await supabase
      .from('candidates')
      .update({ status: '内定承諾（成約）', updated_at: now })
      .eq('id', body.candidate_id)
    
    // ステータスが変更された場合、status_history と timeline_events に記録
    if (oldStatus && oldStatus !== '内定承諾（成約）') {
      const { error: historyError } = await supabase.from('status_history').insert({
        candidate_id: body.candidate_id,
        old_status: oldStatus,
        new_status: '内定承諾（成約）',
        changed_by: user.id,
        changed_at: now,
      })
      if (historyError) {
        console.error('status_history insert error:', historyError.message, { candidate_id: body.candidate_id })
      }

      const { error: timelineError } = await supabase.from('timeline_events').insert({
        candidate_id: body.candidate_id,
        event_type: 'status_change',
        title: 'ステータス変更',
        description: `${oldStatus} → 内定承諾（成約）`,
        metadata: { from_status: oldStatus, to_status: '内定承諾（成約）' },
        created_by: user.id,
      })
      if (timelineError) {
        console.error('timeline_events insert error:', timelineError.message, { candidate_id: body.candidate_id })
      }
    }
    
    return NextResponse.json({ data, message: '成約を登録しました' }, { status: 201 })
  } catch (error) {
    console.error('Error creating contract:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth/server'
import { 
  mapMonthlyStatusToSystemStatus, 
  FIRST_CONTACT_STATUSES,
  INTERVIEW_SET_STATUSES
} from '@/lib/status-mapping'

/**
 * 月次マージシートから営業進捗指標を計算するAPI
 * 
 * クエリパラメータ:
 * - month: 集計月（例: '2026_01'）
 * - consultant: 担当者名（オプション、指定しない場合は全員）
 */
export async function GET(request: NextRequest) {
  const { authUser } = await getAuthContext()

  if (!authUser) {
    return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || '2026_01'
  const consultant = searchParams.get('consultant') // オプション

  const supabase = await createClient()

  // 月次マージシートからデータを取得
  let query = supabase
    .from('stg_member_monthly')
    .select('*')
    .eq('month_text', month)

  if (consultant) {
    query = query.eq('member_name', consultant)
  }

  const { data: monthlyData, error } = await query

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  if (!monthlyData || monthlyData.length === 0) {
    return NextResponse.json({ 
      metrics: [],
      message: 'データが見つかりませんでした'
    })
  }

  // 担当者ごとに集計
  const consultantNames = [...new Set(monthlyData.map(d => d.member_name))].filter(Boolean)
  
  const metrics = consultantNames.map(memberName => {
    const memberData = monthlyData.filter(d => d.member_name === memberName)
    
    // 1. 担当: 割り振り日が当月の数
    const assignedCount = new Set(
      memberData
        .filter(d => {
          if (!d.assigned_date) return false
          const date = new Date(d.assigned_date.replace(/\//g, '-'))
          const monthStart = new Date(month.replace('_', '-') + '-01')
          const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
          return date >= monthStart && date <= monthEnd
        })
        .map(d => d.candidate_id)
    ).size

    // 2. 初回: 割り振り日が当月かつ、ステータスが初回連絡済み以降
    const firstContactCount = new Set(
      memberData
        .filter(d => {
          if (!d.assigned_date || !d.status) return false
          const date = new Date(d.assigned_date.replace(/\//g, '-'))
          const monthStart = new Date(month.replace('_', '-') + '-01')
          const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
          if (date < monthStart || date > monthEnd) return false
          
          // ステータスをシステム内のステータスに変換して判定
          const systemStatus = mapMonthlyStatusToSystemStatus(d.status)
          return systemStatus && FIRST_CONTACT_STATUSES.includes(systemStatus)
        })
        .map(d => d.candidate_id)
    ).size

    // 3. 面接: 面接フラグ=TRUEかつ、ステータスが面接確定以降
    const interviewCount = new Set(
      memberData
        .filter(d => {
          if (!d.interview_flag || !d.status) return false
          const flagStr = d.interview_flag.toString().toUpperCase().trim()
          if (flagStr !== 'TRUE' && flagStr !== '1' && flagStr !== 'YES') return false
          
          // ステータスをシステム内のステータスに変換して判定
          const systemStatus = mapMonthlyStatusToSystemStatus(d.status)
          return systemStatus && INTERVIEW_SET_STATUSES.includes(systemStatus)
        })
        .map(d => d.candidate_id)
    ).size

    // 4. 成約: 面接フラグ=TRUEかつ、ステータスが「内定承諾（成約）」
    const closedCount = new Set(
      memberData
        .filter(d => {
          if (!d.interview_flag || !d.status) return false
          const flagStr = d.interview_flag.toString().toUpperCase().trim()
          if (flagStr !== 'TRUE' && flagStr !== '1' && flagStr !== 'YES') return false
          
          // ステータスをシステム内のステータスに変換して判定
          const systemStatus = mapMonthlyStatusToSystemStatus(d.status)
          return systemStatus === '内定承諾（成約）'
        })
        .map(d => d.candidate_id)
    ).size

    return {
      consultant: memberName,
      assigned: assignedCount,
      firstContact: firstContactCount,
      interview: interviewCount,
      closed: closedCount,
      firstContactRate: assignedCount > 0 ? (firstContactCount / assignedCount) * 100 : 0,
      interviewRate: firstContactCount > 0 ? (interviewCount / firstContactCount) * 100 : 0,
      closedRate: interviewCount > 0 ? (closedCount / interviewCount) * 100 : 0,
    }
  })

  // 担当が多い順にソート
  metrics.sort((a, b) => b.assigned - a.assigned)

  return NextResponse.json({ 
    month,
    metrics,
    total: {
      assigned: metrics.reduce((sum, m) => sum + m.assigned, 0),
      firstContact: metrics.reduce((sum, m) => sum + m.firstContact, 0),
      interview: metrics.reduce((sum, m) => sum + m.interview, 0),
      closed: metrics.reduce((sum, m) => sum + m.closed, 0),
    }
  })
}

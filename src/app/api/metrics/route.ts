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

  // 日付パース用のヘルパー関数
  const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr || dateStr.trim() === '') return null
    
    // スラッシュ区切りの日付をハイフン区切りに変換（例: '2026/1/15' → '2026-1-15'）
    const normalized = dateStr.replace(/\//g, '-')
    
    // 日付をパース
    const date = new Date(normalized)
    
    // 無効な日付の場合はnullを返す
    if (isNaN(date.getTime())) return null
    
    return date
  }

  // 当月の開始日・終了日を計算
  const [year, monthNum] = month.split('_').map(Number)
  const monthStart = new Date(year, monthNum - 1, 1)
  const monthEnd = new Date(year, monthNum, 0, 23, 59, 59, 999)

  // 担当者ごとに集計
  const consultantNames = [...new Set(monthlyData.map(d => d.member_name))].filter(Boolean)
  
  const metrics = consultantNames.map(memberName => {
    const memberData = monthlyData.filter(d => d.member_name === memberName)
    
    // 1. 担当: 割り振り日が当月の数
    const assignedCandidateIds = new Set<string>()
    memberData.forEach(d => {
      if (!d.assigned_date || !d.candidate_id) return
      
      const date = parseDate(d.assigned_date)
      if (!date) return
      
      // 当月に含まれるかチェック
      if (date >= monthStart && date <= monthEnd) {
        assignedCandidateIds.add(d.candidate_id)
      }
    })
    const assignedCount = assignedCandidateIds.size

    // 2. 初回: 割り振り日が当月かつ、ステータスが初回連絡済み以降
    // 重要: 初回は必ず担当のサブセットである必要がある
    const firstContactCandidateIds = new Set<string>()
    memberData.forEach(d => {
      // assigned_dateが当月でない場合はスキップ
      if (!d.assigned_date || !d.status || !d.candidate_id) return
      
      const date = parseDate(d.assigned_date)
      if (!date) return
      
      // 必ず当月に含まれることを確認
      if (date < monthStart || date > monthEnd) return
      
      // 担当に含まれているcandidate_idのみを対象とする（安全性のため）
      if (!assignedCandidateIds.has(d.candidate_id)) return
      
      // ステータスをシステム内のステータスに変換して判定
      const systemStatus = mapMonthlyStatusToSystemStatus(d.status)
      if (systemStatus && FIRST_CONTACT_STATUSES.includes(systemStatus)) {
        firstContactCandidateIds.add(d.candidate_id)
      }
    })
    const firstContactCount = firstContactCandidateIds.size

    // 3. 面接: 面接フラグ=TRUEかつ、ステータスが面接確定以降
    const interviewCandidateIds = new Set<string>()
    memberData.forEach(d => {
      if (!d.interview_flag || !d.status || !d.candidate_id) return
      
      const flagStr = d.interview_flag.toString().toUpperCase().trim()
      if (flagStr !== 'TRUE' && flagStr !== '1' && flagStr !== 'YES') return
      
      // ステータスをシステム内のステータスに変換して判定
      const systemStatus = mapMonthlyStatusToSystemStatus(d.status)
      if (systemStatus && INTERVIEW_SET_STATUSES.includes(systemStatus)) {
        interviewCandidateIds.add(d.candidate_id)
      }
    })
    const interviewCount = interviewCandidateIds.size

    // 4. 成約: 面接フラグ=TRUEかつ、ステータスが「内定承諾（成約）」
    const closedCandidateIds = new Set<string>()
    memberData.forEach(d => {
      if (!d.interview_flag || !d.status || !d.candidate_id) return
      
      const flagStr = d.interview_flag.toString().toUpperCase().trim()
      if (flagStr !== 'TRUE' && flagStr !== '1' && flagStr !== 'YES') return
      
      // ステータスをシステム内のステータスに変換して判定
      const systemStatus = mapMonthlyStatusToSystemStatus(d.status)
      if (systemStatus === '内定承諾（成約）') {
        closedCandidateIds.add(d.candidate_id)
      }
    })
    const closedCount = closedCandidateIds.size

    // データ整合性チェック: 初回は担当を超えることはできない
    const finalFirstContactCount = Math.min(firstContactCount, assignedCount)
    
    // デバッグログ（開発環境のみ、鈴木さんの場合）
    if (process.env.NODE_ENV === 'development' && memberName === '鈴木') {
      console.log(`[DEBUG] ${memberName}の計算結果:`, {
        assignedCount,
        firstContactCount,
        finalFirstContactCount,
        interviewCount,
        closedCount,
        assignedCandidateIds: Array.from(assignedCandidateIds).slice(0, 10), // 最初の10件のみ
        firstContactCandidateIds: Array.from(firstContactCandidateIds).slice(0, 10),
      })
    }

    return {
      consultant: memberName,
      assigned: assignedCount,
      firstContact: finalFirstContactCount, // 整合性チェック後の値を使用
      interview: interviewCount,
      closed: closedCount,
      firstContactRate: assignedCount > 0 ? (finalFirstContactCount / assignedCount) * 100 : 0,
      interviewRate: finalFirstContactCount > 0 ? (interviewCount / finalFirstContactCount) * 100 : 0,
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

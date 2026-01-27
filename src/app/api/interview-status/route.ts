import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthContext } from '@/lib/auth/server'
import { 
  mapMonthlyStatusToSystemStatus, 
  INTERVIEW_STATUS_CATEGORIES 
} from '@/lib/status-mapping'

/**
 * 月次マージシートから面接状況を取得するAPI
 * 
 * クエリパラメータ:
 * - month: 集計月（例: '2026_01'）
 */
export async function GET(request: NextRequest) {
  const { authUser } = await getAuthContext()

  if (!authUser) {
    return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const month = searchParams.get('month') || '2026_01'

  const supabase = await createClient()

  // 月次マージシートからデータを取得（面接フラグ=TRUEのもののみ）
  // interview_flagは文字列の'TRUE'またはブール値のtrueの可能性があるため、フィルタリングは後で行う
  const { data: monthlyData, error } = await supabase
    .from('stg_member_monthly')
    .select('*')
    .eq('month_text', month)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  if (!monthlyData || monthlyData.length === 0) {
    return NextResponse.json({ 
      statusCases: {},
      message: 'データが見つかりませんでした',
      debug: {
        month,
        totalRecords: 0,
        recordsWithInterviewFlag: 0,
      }
    })
  }

  // デバッグ情報
  const debugInfo = {
    month,
    totalRecords: monthlyData.length,
    recordsWithInterviewFlag: monthlyData.filter(d => {
      const flag = d.interview_flag
      if (!flag) return false
      const flagStr = flag.toString().toUpperCase().trim()
      return flagStr === 'TRUE' || flagStr === '1' || flagStr === 'YES'
    }).length,
    interviewFlagValues: [...new Set(monthlyData.map(d => d.interview_flag?.toString()).filter(Boolean))],
    statusValues: [...new Set(monthlyData.map(d => d.status).filter(Boolean))],
  }

  // 担当者ごとに集計
  const consultantNames = [...new Set(monthlyData.map(d => d.member_name))].filter(Boolean)
  
  const statusCases: Record<
    string,
    {
      adjusting: Array<{ name: string; yomi: string; amount: number }>
      beforeInterview: Array<{ name: string; yomi: string; amount: number }>
      waitingResult: Array<{ name: string; yomi: string; amount: number }>
      waitingReply: Array<{ name: string; yomi: string; amount: number }>
    }
  > = {}

  consultantNames.forEach(memberName => {
    // 面接フラグ=TRUEのデータのみフィルタリング
    const memberData = monthlyData.filter(d => {
      if (d.member_name !== memberName) return false
      // interview_flagの判定（文字列'TRUE'、ブール値true、または大文字小文字を問わない）
      const flag = d.interview_flag
      if (!flag) return false
      const flagStr = flag.toString().toUpperCase().trim()
      return flagStr === 'TRUE' || flagStr === '1' || flagStr === 'YES'
    })
    
    const adjusting: Array<{ name: string; yomi: string; amount: number }> = []
    const beforeInterview: Array<{ name: string; yomi: string; amount: number }> = []
    const waitingResult: Array<{ name: string; yomi: string; amount: number }> = []
    const waitingReply: Array<{ name: string; yomi: string; amount: number }> = []

    memberData.forEach(d => {
      if (!d.candidate_name || !d.status) return

      // 氏名（苗字のみ）- スペースまたは全角スペースで分割して最初の部分を取得
      const lastName = d.candidate_name.split(/[\s\u3000]+/)[0] || d.candidate_name

      // ヨミ角度の計算（prob_currentから）
      let yomiLabel = ''
      if (d.prob_current) {
        const prob = d.prob_current.trim().toUpperCase()
        if (prob === 'A') {
          yomiLabel = 'Aヨミ(80%)'
        } else if (prob === 'B') {
          yomiLabel = 'Bヨミ(50%)'
        } else if (prob === 'C') {
          yomiLabel = 'Cヨミ(30%)'
        } else if (prob === 'D') {
          yomiLabel = 'Dヨミ(10%)'
        }
      }

      // ヨミ数字（expected_amount）
      const amount = d.expected_amount 
        ? parseInt(d.expected_amount.toString().replace(/,/g, ''), 10) || 0
        : 0

      const caseInfo = {
        name: lastName,
        yomi: yomiLabel,
        amount,
      }

      // ステータスに応じて分類（マッピングを使用）
      const systemStatus = mapMonthlyStatusToSystemStatus(d.status)
      if (!systemStatus) {
        // マッピングされていないステータスはスキップ（デバッグ用にログ出力）
        if (process.env.NODE_ENV === 'development') {
          console.warn(`[DEBUG] 未マッピングのステータス: ${d.status}`)
        }
        return
      }

      if (INTERVIEW_STATUS_CATEGORIES.adjusting.includes(systemStatus)) {
        adjusting.push(caseInfo)
      } else if (INTERVIEW_STATUS_CATEGORIES.beforeInterview.includes(systemStatus)) {
        beforeInterview.push(caseInfo)
      } else if (INTERVIEW_STATUS_CATEGORIES.waitingResult.includes(systemStatus)) {
        waitingResult.push(caseInfo)
      } else if (INTERVIEW_STATUS_CATEGORIES.waitingReply.includes(systemStatus)) {
        waitingReply.push(caseInfo)
      }
    })

    statusCases[memberName] = {
      adjusting,
      beforeInterview,
      waitingResult,
      waitingReply,
    }
  })

  return NextResponse.json({ 
    month,
    statusCases,
    debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined,
  })
}

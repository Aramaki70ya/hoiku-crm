'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TrendingUp,
  Target,
  Users,
  Percent,
  DollarSign,
  Calendar,
  CalendarDays,
  AlertCircle,
  ChevronDown,
  PhoneCall,
  UserCheck,
} from 'lucide-react'
import {
  mockMemberStats,
  mockUsers,
  mockCandidates,
  mockProjects,
  mockInterviews,
  targetRates,
  kpiAssumptions,
} from '@/lib/mock-data'
import {
  getCandidatesClient as getCandidates,
  getProjectsClient as getProjects,
  getContractsClient as getContracts,
  getUsersClient as getUsers,
  getInterviewsClient as getInterviews,
  getStatusHistoryClient as getStatusHistory,
} from '@/lib/supabase/queries-client-with-fallback'
import type { Candidate, Project, Interview, User, Contract, StatusHistory } from '@/types/database'

type PeriodType = 'current_month' | 'previous_month' | 'custom'

export default function DashboardSummaryPage() {
  const [periodType, setPeriodType] = useState<PeriodType>('current_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  // Supabaseデータ取得
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([])
  const [timelineEvents, setTimelineEvents] = useState<Array<{
    id: string
    candidate_id: string
    event_type: string
    title: string
    metadata: Record<string, unknown> | null
    created_at: string
  }>>([])
  const [loading, setLoading] = useState(true)
  
  // 月次マージシートから計算した営業進捗指標
  const [monthlyMetrics, setMonthlyMetrics] = useState<{
    consultant: string
    assigned: number
    firstContact: number
    interview: number
    closed: number
    firstContactRate: number
    interviewRate: number
    closedRate: number
  }[]>([])
  const [monthlyMetricsLoading, setMonthlyMetricsLoading] = useState(false)
  
  // 月次マージシートから面接状況を取得
  const [monthlyStatusCases, setMonthlyStatusCases] = useState<Record<
    string,
    {
      adjusting: Array<{ name: string; yomi: string; amount: number }>
      beforeInterview: Array<{ name: string; yomi: string; amount: number }>
      waitingResult: Array<{ name: string; yomi: string; amount: number }>
      waitingReply: Array<{ name: string; yomi: string; amount: number }>
    }
  >>({})
  const [monthlyStatusCasesLoading, setMonthlyStatusCasesLoading] = useState(false)
  
  // 個人別月次目標（面接設定目標・売上予算）
  const [userTargets, setUserTargets] = useState<Record<string, { sales_budget: number; interview_target: number }>>({})
  const [userTargetsLoading, setUserTargetsLoading] = useState(false)

  // データ再取得関数
  const fetchData = useCallback(async () => {
    try {
      const [candidatesData, projectsData, contractsData, interviewsData, usersData, statusHistoryData] = await Promise.all([
        getCandidates(),
        getProjects(),
        getContracts(),
        getInterviews(),
        getUsers(),
        getStatusHistory(),
      ])
      setCandidates(candidatesData)
      setProjects(projectsData)
      setContracts(contractsData)
      setInterviews(interviewsData)
      setUsers(usersData)
      setStatusHistory(statusHistoryData)
    } catch (error) {
      console.error('Error fetching data:', error)
      setCandidates([])
      setProjects([])
      setContracts([])
      setInterviews([])
      setUsers([])
      setStatusHistory([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 初回読み込み
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 期間からmonth_textを計算するヘルパー関数
  const getMonthText = useCallback(() => {
    const now = new Date()
    switch (periodType) {
      case 'current_month':
        return `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`
      case 'previous_month':
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return `${prev.getFullYear()}_${String(prev.getMonth() + 1).padStart(2, '0')}`
      case 'custom':
        if (customStartDate) {
          const start = new Date(customStartDate)
          return `${start.getFullYear()}_${String(start.getMonth() + 1).padStart(2, '0')}`
        } else {
          return `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`
        }
      default:
        return `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}`
    }
  }, [periodType, customStartDate])

  // 月次マージシートから営業進捗指標を取得
  const fetchMonthlyMetrics = useCallback(async () => {
    setMonthlyMetrics([])
    setMonthlyMetricsLoading(true)
    try {
      const monthText = getMonthText()
      const response = await fetch(`/api/metrics?month=${monthText}&_t=${Date.now()}`)
      if (!response.ok) {
        throw new Error('営業進捗指標の取得に失敗しました')
      }
      const data = await response.json()
      setMonthlyMetrics(data.metrics || [])
    } catch (error) {
      console.error('Error fetching monthly metrics:', error)
      setMonthlyMetrics([])
    } finally {
      setMonthlyMetricsLoading(false)
    }
  }, [getMonthText])

  // 月次マージシートから面接状況を取得
  const fetchMonthlyStatusCases = useCallback(async () => {
    setMonthlyStatusCases({})
    setMonthlyStatusCasesLoading(true)
    try {
      const monthText = getMonthText()
      const response = await fetch(`/api/interview-status?month=${monthText}&_t=${Date.now()}`)
      if (!response.ok) {
        throw new Error('面接状況の取得に失敗しました')
      }
      const data = await response.json()
      setMonthlyStatusCases(data.statusCases || {})
    } catch (error) {
      console.error('Error fetching monthly status cases:', error)
      setMonthlyStatusCases({})
    } finally {
      setMonthlyStatusCasesLoading(false)
    }
  }, [getMonthText])

  // 個人別月次目標を取得
  const fetchUserTargets = useCallback(async () => {
    setUserTargetsLoading(true)
    try {
      const now = new Date()
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const response = await fetch(`/api/user-targets?year_month=${yearMonth}&_t=${Date.now()}`)
      if (!response.ok) {
        throw new Error('個人別目標の取得に失敗しました')
      }
      const { data } = await response.json()
      const targetsMap: Record<string, { sales_budget: number; interview_target: number }> = {}
      if (data && Array.isArray(data)) {
        data.forEach((target: { user_id: string; sales_budget: number; interview_target: number }) => {
          targetsMap[target.user_id] = {
            sales_budget: target.sales_budget || 0,
            interview_target: target.interview_target || 0,
          }
        })
      }
      setUserTargets(targetsMap)
    } catch (error) {
      console.error('Error fetching user targets:', error)
      setUserTargets({})
    } finally {
      setUserTargetsLoading(false)
    }
  }, [])

  // 期間変更時に月次データを再取得
  useEffect(() => {
    fetchMonthlyMetrics()
  }, [fetchMonthlyMetrics])

  useEffect(() => {
    fetchMonthlyStatusCases()
  }, [fetchMonthlyStatusCases])

  useEffect(() => {
    fetchUserTargets()
  }, [fetchUserTargets])

  // すべてのデータを再取得
  const refetchAll = useCallback(() => {
    fetchData()
    fetchMonthlyMetrics()
    fetchMonthlyStatusCases()
    fetchUserTargets()
  }, [fetchData, fetchMonthlyMetrics, fetchMonthlyStatusCases, fetchUserTargets])

  // ページ復帰時・タブ切り替え時に再取得（bfcache対策）
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refetchAll()
      }
    }
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        refetchAll()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [refetchAll])

  // 期間表示用テキスト
  const getPeriodLabel = () => {
    const now = new Date()
    switch (periodType) {
      case 'current_month':
        return `${now.getFullYear()}年${now.getMonth() + 1}月（当月）`
      case 'previous_month':
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return `${prev.getFullYear()}年${prev.getMonth() + 1}月（前月）`
      case 'custom':
        if (customStartDate && customEndDate) {
          return `${customStartDate} 〜 ${customEndDate}`
        }
        return '期間を選択'
      default:
        return '当月'
    }
  }

  // 期間の開始日・終了日を計算
  const getPeriodDates = useMemo(() => {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (periodType) {
      case 'current_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        break
      case 'previous_month':
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        startDate = new Date(prev.getFullYear(), prev.getMonth(), 1)
        endDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 0, 23, 59, 59)
        break
      case 'custom':
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate)
          endDate = new Date(customEndDate)
          endDate.setHours(23, 59, 59, 999)
        } else {
          // カスタム期間が未設定の場合は当月
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        }
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    }

    return { startDate, endDate }
  }, [periodType, customStartDate, customEndDate])
  // 期間内のデータをフィルタリング
  const periodCandidates = useMemo(() => {
    const { startDate, endDate } = getPeriodDates
    return candidates.filter(c => {
      if (!c.registered_at) return false
      const registeredDate = new Date(c.registered_at)
      return registeredDate >= startDate && registeredDate <= endDate
    })
  }, [candidates, periodType, customStartDate, customEndDate])

  // 期間内に成約を設定した数（created_atで判定）
  const periodContracts = useMemo(() => {
    const { startDate, endDate } = getPeriodDates
    return contracts.filter(c => {
      // contracted_at（成約確定日時）、accepted_date（承諾日）、created_at の順で判定
      const dateStr = c.contracted_at || c.accepted_date || c.created_at
      if (!dateStr) return false
      const contractDate = new Date(dateStr)
      return contractDate >= startDate && contractDate <= endDate
    })
  }, [contracts, periodType, customStartDate, customEndDate])

  // 期間内成約の売上合計（目標数値・成約単価実績用）
  const periodTotalSales = useMemo(() => {
    return periodContracts.reduce(
      (sum, c) => sum + (c.revenue_including_tax ?? c.revenue_excluding_tax ?? 0),
      0
    )
  }, [periodContracts])

  // 期間内に面接を設定した数（start_atで判定）
  const periodInterviews = useMemo(() => {
    const { startDate, endDate } = getPeriodDates
    return interviews.filter(i => {
      if (!i.start_at) return false
      const interviewDate = new Date(i.start_at)
      return interviewDate >= startDate && interviewDate <= endDate
    })
  }, [interviews, periodType, customStartDate, customEndDate])

  // 期間内に「面接以上のステータス」になった求職者（その後クローズ等になってもカウントに含める）
  const INTERVIEW_RELEVANT_STATUSES = [
    '面接日程調整中',
    '面接確定済',
    '面接実施済（結果待ち）',
    '内定獲得（承諾確認中）',
    '内定承諾（成約）',
    '内定辞退',
  ]
  const periodInterviewStatusCandidateIds = useMemo(() => {
    const { startDate, endDate } = getPeriodDates
    const candidateIds = new Set<string>()
    
    // status_historyから集計
    statusHistory.forEach(h => {
      if (!INTERVIEW_RELEVANT_STATUSES.includes(h.new_status) || !h.changed_at) return
      const changedDate = new Date(h.changed_at)
      if (changedDate >= startDate && changedDate <= endDate) {
        candidateIds.add(h.candidate_id)
      }
    })
    
    // status_historyにデータがない場合のフォールバック: candidatesテーブルのstatusとupdated_atで判定
    // 現在のステータスが面接関連で、updated_atが期間内にある求職者をカウント
    if (candidateIds.size === 0 && statusHistory.length === 0) {
      candidates.forEach(c => {
        if (!INTERVIEW_RELEVANT_STATUSES.includes(c.status) || !c.updated_at) return
        const updatedDate = new Date(c.updated_at)
        if (updatedDate >= startDate && updatedDate <= endDate) {
          candidateIds.add(c.id)
        }
      })
    }
    
    return candidateIds
  }, [statusHistory, getPeriodDates, candidates])

  // 期間内に「内定承諾（成約）」になった求職者（成約数のカウント用）
  const periodClosedStatusCandidateIds = useMemo(() => {
    const { startDate, endDate } = getPeriodDates
    const candidateIds = new Set<string>()
    statusHistory.forEach(h => {
      if (h.new_status !== '内定承諾（成約）' || !h.changed_at) return
      const changedDate = new Date(h.changed_at)
      if (changedDate >= startDate && changedDate <= endDate) {
        candidateIds.add(h.candidate_id)
      }
    })
    return candidateIds
  }, [statusHistory, getPeriodDates])

  // 実際のデータから各ステータスの案件を集計（面接一覧ページと同じ candidate.status ベースで統一）
  const getStatusCases = useMemo(() => {
    const statusCases: Record<
      string,
      {
        adjusting: Array<{ name: string; yomi: string; amount: number }>
        scheduled: Array<{ name: string; yomi: string; amount: number }>
        completed: Array<{ name: string; yomi: string; amount: number }>
        offer: Array<{ name: string; yomi: string; amount: number }>
      }
    > = {}

    // 面接関連ステータス（面接一覧ページと同じ定義）
    const INTERVIEW_RELEVANT_STATUSES = [
      '面接日程調整中',
      '面接確定済',
      '面接実施済（結果待ち）',
      '内定獲得（承諾確認中）',
    ]

    // 各担当者ごとに集計
    users
      .filter((u) => u.role !== 'admin')
      .forEach((user) => {
        const userCandidates = candidates.filter(
          (c) => c.consultant_id === user.id && INTERVIEW_RELEVANT_STATUSES.includes(c.status)
        )

        // 同一求職者は最新のヨミ（project.updated_at）1件だけ表示するため Map で保持
        const adjustingMap = new Map<string, { caseInfo: { name: string; yomi: string; amount: number }; updated_at: string }>()
        const scheduledMap = new Map<string, { caseInfo: { name: string; yomi: string; amount: number }; updated_at: string }>()
        const completedMap = new Map<string, { caseInfo: { name: string; yomi: string; amount: number }; updated_at: string }>()
        const offerMap = new Map<string, { caseInfo: { name: string; yomi: string; amount: number }; updated_at: string }>()

        const setIfNewer = (
          map: Map<string, { caseInfo: { name: string; yomi: string; amount: number }; updated_at: string }>,
          candidateId: string,
          caseInfo: { name: string; yomi: string; amount: number },
          updated_at: string
        ) => {
          const existing = map.get(candidateId)
          if (!existing || updated_at > existing.updated_at) {
            map.set(candidateId, { caseInfo, updated_at })
          }
        }

        userCandidates.forEach((candidate) => {
          // その求職者に紐づく最新のプロジェクトを取得（ヨミ・金額表示用）
          const candidateProjects = projects.filter((p) => p.candidate_id === candidate.id)
          if (candidateProjects.length === 0) return

          // 最新の project を取得（updated_at でソート）
          const latestProject = candidateProjects.sort((a, b) => {
            const aTime = a.updated_at || a.created_at || ''
            const bTime = b.updated_at || b.created_at || ''
            return bTime.localeCompare(aTime)
          })[0]

          // ヨミの表示用フォーマット
          const yomiLabel = latestProject.probability
            ? `${latestProject.probability}ヨミ(${
                latestProject.probability === 'A'
                  ? '80%'
                  : latestProject.probability === 'B'
                  ? '50%'
                  : latestProject.probability === 'C'
                  ? '30%'
                  : '10%'
              })`
            : ''

          const caseInfo = {
            name: candidate.name,
            yomi: yomiLabel,
            amount: latestProject.expected_amount || 0,
          }
          const updated_at = latestProject.updated_at || latestProject.created_at || ''

          // candidate.status で振り分け（面接一覧ページと同じロジック）
          switch (candidate.status) {
            case '面接日程調整中':
              setIfNewer(adjustingMap, candidate.id, caseInfo, updated_at)
              break
            case '面接確定済':
              setIfNewer(scheduledMap, candidate.id, caseInfo, updated_at)
              break
            case '面接実施済（結果待ち）':
              setIfNewer(completedMap, candidate.id, caseInfo, updated_at)
              break
            case '内定獲得（承諾確認中）':
              setIfNewer(offerMap, candidate.id, caseInfo, updated_at)
              break
          }
        })

        statusCases[user.id] = {
          adjusting: Array.from(adjustingMap.values()).map((v) => v.caseInfo),
          scheduled: Array.from(scheduledMap.values()).map((v) => v.caseInfo),
          completed: Array.from(completedMap.values()).map((v) => v.caseInfo),
          offer: Array.from(offerMap.values()).map((v) => v.caseInfo),
        }
      })

    return statusCases
  }, [users, candidates, projects])

  // 退職者フィルタリング用ヘルパー（選択期間に応じて退職者を含める/除外する）
  const isUserActiveInPeriod = useCallback((user: User) => {
    if (!user.retired_at) return true // 退職日が設定されていない場合は現役
    const retiredDate = new Date(user.retired_at)
    retiredDate.setHours(0, 0, 0, 0)
    const periodStart = new Date(getPeriodDates.startDate)
    periodStart.setHours(0, 0, 0, 0)
    // 選択期間の開始日より前に退職した場合は非表示（退職日が期間開始日より前なら非表示）
    return retiredDate >= periodStart
  }, [getPeriodDates])

  // 営業進捗を計算（担当・初回は「期間内に登録した」求職者のみで集計）
  // 【指標の定義】
  // 担当 = 期間内に登録した かつ その担当者に割り当てられている求職者数
  // 初回 = 上記のうち、ステータスが「初回連絡中」「連絡つかず」以外（＝初回コンタクト済み）の数
  // 面接 = 下記いずれか。(1)月次マージシート: その月の面接数 (2)DB: 期間内に面接日(start_at)が含まれる面接に紐づく「ユニークな求職者数」（同一人で複数回面接しても1カウント）
  // 成約 = 下記いずれか。(1)月次マージシート: その月の成約数 (2)DB: 期間内に承諾日等が含まれる契約のうち、その担当者の求職者に紐づく件数
  // ※期間で切るため「今月成約した人」の面接が先月だと、今月の面接数には入らず成約だけ増えることがあり、成約＞面接になり得る。表示上は成約を面接以下にクリップする。
  const salesProgress = useMemo(() => {
    // ローディング中は古いデータを表示しない（空配列を返す）
    if (monthlyMetricsLoading) {
      return []
    }

    const progress = users
      .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
      .map((user) => {
        // 担当・初回は常に「期間内に登録した」求職者ベースで計算
        const userPeriodCandidates = periodCandidates.filter((c) => c.consultant_id === user.id)
        const totalCount = userPeriodCandidates.length
        const firstContactCount = userPeriodCandidates.filter(
          (c) => !['初回連絡中', '連絡つかず（初回未接触）'].includes(c.status)
        ).length

        // 面接・成約は月次マージシートがあればそれを使用
        let interviewCount: number
        let closedCount: number
        if (monthlyMetrics.length > 0) {
          const metric = monthlyMetrics.find((m) => m.consultant === user.name)
          interviewCount = metric?.interview ?? 0
          closedCount = metric?.closed ?? 0
        } else {
          // フォールバック: DBから計算
          // status_history ベースで集計（期間内にステータスが変わった求職者をカウント）
          
          // 面接数 = 期間内に status_history で面接以上のステータスになった求職者のユニーク数
          const interviewCandidateIds = new Set<string>()
          periodInterviewStatusCandidateIds.forEach((candidateId) => {
            const candidate = candidates.find((c) => c.id === candidateId)
            if (candidate && candidate.consultant_id === user.id) {
              interviewCandidateIds.add(candidateId)
            }
          })
          
          // status_history にデータがない場合の追加フォールバック（interviews.start_atベース）
          // periodInterviewStatusCandidateIdsのuseMemo内で既にcandidatesテーブルから判定しているが、
          // それでもデータがない場合はinterviewsテーブルから判定
          if (periodInterviewStatusCandidateIds.size === 0 && statusHistory.length === 0) {
            periodInterviews.forEach((i) => {
              const project = projects.find((p) => p.id === i.project_id)
              if (project) {
                const candidate = candidates.find((c) => c.id === project.candidate_id)
                if (candidate && candidate.consultant_id === user.id) {
                  interviewCandidateIds.add(candidate.id)
                }
              }
            })
          }
          interviewCount = interviewCandidateIds.size
          
          // 成約数 = 期間内に status_history で「内定承諾（成約）」になった求職者のユニーク数
          const closedCandidateIds = new Set<string>()
          periodClosedStatusCandidateIds.forEach((candidateId) => {
            const candidate = candidates.find((c) => c.id === candidateId)
            if (candidate && candidate.consultant_id === user.id) {
              closedCandidateIds.add(candidateId)
            }
          })
          
          // status_history にデータがない場合のフォールバック（過去月など）
          if (periodClosedStatusCandidateIds.size === 0) {
            periodContracts.forEach((c) => {
              const candidate = candidates.find((ca) => ca.id === c.candidate_id)
              if (candidate && candidate.consultant_id === user.id) {
                closedCandidateIds.add(candidate.id)
              }
            })
          }
          closedCount = closedCandidateIds.size
        }

        // ファネル整合: 成約は面接を超えない（期間ずれで成約＞面接になることがあるため表示用にクリップ）
        const closedCountClipped = Math.min(closedCount, interviewCount)

        return {
          userId: user.id,
          userName: user.name,
          totalCount,
          firstContactCount,
          interviewCount,
          closedCount: closedCountClipped,
        }
      })

    return progress
      .filter((p) => p.totalCount > 0)
      .sort((a, b) => b.totalCount - a.totalCount)
  }, [users, periodCandidates, periodInterviews, periodInterviewStatusCandidateIds, periodClosedStatusCandidateIds, periodContracts, projects, candidates, monthlyMetrics, monthlyMetricsLoading, isUserActiveInPeriod])

  // 全体集計
  const totalProgress = useMemo(() => {
    return salesProgress.reduce(
      (acc, progress) => ({
        totalCount: acc.totalCount + progress.totalCount,
        firstContactCount: acc.firstContactCount + progress.firstContactCount,
        interviewCount: acc.interviewCount + progress.interviewCount,
        closedCount: acc.closedCount + progress.closedCount,
      }),
      { totalCount: 0, firstContactCount: 0, interviewCount: 0, closedCount: 0 }
    )
  }, [salesProgress])

  // 全体の転換率計算
  const totalFirstContactRate =
    totalProgress.totalCount > 0
      ? (totalProgress.firstContactCount / totalProgress.totalCount) * 100
      : 0
  const totalInterviewRate =
    totalProgress.firstContactCount > 0
      ? (totalProgress.interviewCount / totalProgress.firstContactCount) * 100
      : 0
  const totalClosedRate =
    totalProgress.interviewCount > 0
      ? (totalProgress.closedCount / totalProgress.interviewCount) * 100
      : 0

  // 成約単価実績（営業進捗の成約数ベースで集計）
  const actualRevenuePerClosed =
    totalProgress.closedCount > 0 ? periodTotalSales / totalProgress.closedCount : 0

  // 2課のメンバーID（画像から読み取れる内容に基づく）
  const team2UserIds = ['3', '4', '7', '8', '9'] // 西田、鈴木、後藤、小畦、吉田

  // 2課の売上実績集計
  const team2Sales = useMemo(() => {
    return mockMemberStats
      .filter((stats) => team2UserIds.includes(stats.userId))
      .reduce(
        (acc, stats) => ({
          totalBudget: acc.totalBudget + stats.budget,
          totalSales: acc.totalSales + stats.sales,
          totalMeetingTarget: acc.totalMeetingTarget + stats.meetingTarget,
          totalMeetingCount: acc.totalMeetingCount + stats.meetingCount,
        }),
        {
          totalBudget: 0,
          totalSales: 0,
          totalMeetingTarget: 0,
          totalMeetingCount: 0,
        }
      )
  }, [])

  // 実データからメンバーごとのヨミ金額を計算（当月）
  const memberYomiStats = useMemo(() => {
    const stats: Record<string, { yomiA: number; yomiB: number; yomiC: number; yomiD: number }> = {}
    
    users
      .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
      .forEach((user) => {
        // このユーザーの担当求職者に紐づく案件からヨミ金額を集計
        const userCandidates = candidates.filter((c) => c.consultant_id === user.id)
        const userCandidateIds = new Set(userCandidates.map((c) => c.id))
        
        // 当月のヨミのみ（probability_monthがcurrentまたは未設定）
        const userProjects = projects.filter((p) => 
          userCandidateIds.has(p.candidate_id) && 
          (p.probability_month === 'current' || !p.probability_month)
        )
        
        stats[user.id] = {
          yomiA: userProjects
            .filter((p) => p.probability === 'A' && p.expected_amount)
            .reduce((sum, p) => sum + (p.expected_amount || 0), 0),
          yomiB: userProjects
            .filter((p) => p.probability === 'B' && p.expected_amount)
            .reduce((sum, p) => sum + (p.expected_amount || 0), 0),
          yomiC: userProjects
            .filter((p) => p.probability === 'C' && p.expected_amount)
            .reduce((sum, p) => sum + (p.expected_amount || 0), 0),
          yomiD: 0, // Dヨミは現状DBに存在しないため0
        }
      })
    
    return stats
  }, [users, candidates, projects, getPeriodDates])

  // 実データからメンバーごとのヨミ金額を計算（翌月）
  const memberYomiStatsNext = useMemo(() => {
    const stats: Record<string, { yomiA: number; yomiB: number; yomiC: number; yomiD: number }> = {}
    
    users
      .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
      .forEach((user) => {
        // このユーザーの担当求職者に紐づく案件からヨミ金額を集計
        const userCandidates = candidates.filter((c) => c.consultant_id === user.id)
        const userCandidateIds = new Set(userCandidates.map((c) => c.id))
        
        // 翌月のヨミのみ（probability_monthがnext）
        const userProjects = projects.filter((p) => 
          userCandidateIds.has(p.candidate_id) && 
          p.probability_month === 'next'
        )
        
        stats[user.id] = {
          yomiA: userProjects
            .filter((p) => p.probability === 'A' && p.expected_amount)
            .reduce((sum, p) => sum + (p.expected_amount || 0), 0),
          yomiB: userProjects
            .filter((p) => p.probability === 'B' && p.expected_amount)
            .reduce((sum, p) => sum + (p.expected_amount || 0), 0),
          yomiC: userProjects
            .filter((p) => p.probability === 'C' && p.expected_amount)
            .reduce((sum, p) => sum + (p.expected_amount || 0), 0),
          yomiD: 0, // Dヨミは現状DBに存在しないため0
        }
      })
    
    return stats
  }, [users, candidates, projects, getPeriodDates])

  // 2課のヨミ数字（当月）- 実データ使用に変更
  const team2YomiCurrent = useMemo(() => {
    // mockMemberStatsからではなく、実データから計算
    const activeUsers = users.filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
    return activeUsers.reduce(
      (acc, user) => {
        const userStats = memberYomiStats[user.id] || { yomiA: 0, yomiB: 0, yomiC: 0, yomiD: 0 }
        return {
          yomiA: acc.yomiA + userStats.yomiA,
          yomiB: acc.yomiB + userStats.yomiB,
          yomiC: acc.yomiC + userStats.yomiC,
          yomiD: acc.yomiD + userStats.yomiD,
        }
      },
      { yomiA: 0, yomiB: 0, yomiC: 0, yomiD: 0 }
    )
  }, [users, memberYomiStats, getPeriodDates])

  // 2課のヨミ数字（翌月）- 実データ使用に変更
  const team2YomiNext = useMemo(() => {
    const activeUsers = users.filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
    return activeUsers.reduce(
      (acc, user) => {
        const userStats = memberYomiStatsNext[user.id] || { yomiA: 0, yomiB: 0, yomiC: 0, yomiD: 0 }
        return {
          yomiA: acc.yomiA + userStats.yomiA,
          yomiB: acc.yomiB + userStats.yomiB,
          yomiC: acc.yomiC + userStats.yomiC,
          yomiD: acc.yomiD + userStats.yomiD,
        }
      },
      { yomiA: 0, yomiB: 0, yomiC: 0, yomiD: 0 }
    )
  }, [users, memberYomiStatsNext, getPeriodDates])

  // 転換率の表示用フォーマット
  const formatRate = (rate: number) => {
    if (isNaN(rate) || !isFinite(rate)) return '-'
    return `${rate.toFixed(0)}%`
  }

  // 金額の表示用フォーマット
  const formatAmount = (amount: number) => {
    return `¥${(amount / 10000).toFixed(0)}万`
  }

  // ローディング中の表示（すべてのフックの後に配置）
  if (loading) {
    return (
      <AppLayout title="ダッシュボード" description="営業進捗と売上実績のサマリー">
        <div className="flex items-center justify-center h-64">
          <p>データを読み込み中...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="ダッシュボード" description="営業進捗と売上実績のサマリー">
      <div className="space-y-6">
        {/* 期間選択 */}
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <CalendarDays className="w-5 h-5 text-violet-500" />
            <span className="font-medium">集計期間:</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={periodType === 'current_month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodType('current_month')}
              className={periodType === 'current_month' 
                ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white' 
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'}
            >
              当月
            </Button>
            <Button
              variant={periodType === 'previous_month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodType('previous_month')}
              className={periodType === 'previous_month' 
                ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white' 
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'}
            >
              前月
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={periodType === 'custom' ? 'default' : 'outline'}
                  size="sm"
                  className={periodType === 'custom' 
                    ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white' 
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'}
                >
                  指定期間
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4" align="start">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">開始日</label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        setCustomStartDate(e.target.value)
                        setPeriodType('custom')
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">終了日</label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => {
                        setCustomEndDate(e.target.value)
                        setPeriodType('custom')
                      }}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        // 今週
                        const now = new Date()
                        const weekStart = new Date(now)
                        weekStart.setDate(now.getDate() - now.getDay())
                        setCustomStartDate(weekStart.toISOString().split('T')[0])
                        setCustomEndDate(now.toISOString().split('T')[0])
                        setPeriodType('custom')
                      }}
                    >
                      今週
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        // 月初〜今日
                        const now = new Date()
                        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                        setCustomStartDate(monthStart.toISOString().split('T')[0])
                        setCustomEndDate(now.toISOString().split('T')[0])
                        setPeriodType('custom')
                      }}
                    >
                      月初〜今日
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="ml-auto">
            <Badge className="bg-violet-100 text-violet-700 px-3 py-1 text-sm">
              {getPeriodLabel()}
            </Badge>
          </div>
        </div>

        {/* 目標数値の前提条件（実績＝営業進捗の集計から算出） */}
        <Card className="bg-white border-slate-200 shadow-sm mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-500" />
              目標数値の前提条件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {/* 担当→初回（登録→初回） */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <PhoneCall className="w-5 h-5 text-purple-600" />
                  <p className="text-sm font-medium text-purple-700">担当→初回率</p>
                </div>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold text-purple-600">
                    {(targetRates.firstContactRate * 100).toFixed(0)}%
                  </p>
                  <p className="text-sm text-slate-500 mb-1">目標</p>
                </div>
                <div className="mt-2 pt-2 border-t border-purple-200">
                  <div className="flex items-end gap-2">
                    <p
                      className={`text-2xl font-bold ${
                        totalFirstContactRate >= targetRates.firstContactRate * 100
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {totalProgress.totalCount > 0 ? totalFirstContactRate.toFixed(1) : '-'}%
                    </p>
                    <p className="text-sm text-slate-500 mb-1">実績</p>
                  </div>
                  <p className="text-lg text-slate-500 mt-1">
                    {totalProgress.totalCount > 0
                      ? `${totalProgress.firstContactCount}件 / ${totalProgress.totalCount}件`
                      : '-'}
                  </p>
                </div>
              </div>
              {/* 初回→面接 */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-cyan-600" />
                  <p className="text-sm font-medium text-cyan-700">初回→面接率</p>
                </div>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold text-cyan-600">
                    {(targetRates.interviewRate * 100).toFixed(0)}%
                  </p>
                  <p className="text-sm text-slate-500 mb-1">目標</p>
                </div>
                <div className="mt-2 pt-2 border-t border-cyan-200">
                  <div className="flex items-end gap-2">
                    <p
                      className={`text-2xl font-bold ${
                        totalInterviewRate >= targetRates.interviewRate * 100
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {totalProgress.firstContactCount > 0 ? totalInterviewRate.toFixed(1) : '-'}%
                    </p>
                    <p className="text-sm text-slate-500 mb-1">実績</p>
                  </div>
                  <p className="text-lg text-slate-500 mt-1">
                    {totalProgress.firstContactCount > 0
                      ? `${totalProgress.interviewCount}件 / ${totalProgress.firstContactCount}件`
                      : '-'}
                  </p>
                </div>
              </div>
              {/* 面接→成約 */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-700">面接→成約率</p>
                </div>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold text-emerald-600">
                    {(targetRates.closedRate * 100).toFixed(0)}%
                  </p>
                  <p className="text-sm text-slate-500 mb-1">目標</p>
                </div>
                <div className="mt-2 pt-2 border-t border-emerald-200">
                  <div className="flex items-end gap-2">
                    <p
                      className={`text-2xl font-bold ${
                        totalClosedRate >= targetRates.closedRate * 100
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {totalProgress.interviewCount > 0 ? totalClosedRate.toFixed(1) : '-'}%
                    </p>
                    <p className="text-sm text-slate-500 mb-1">実績</p>
                  </div>
                  <p className="text-lg text-slate-500 mt-1">
                    {totalProgress.interviewCount > 0
                      ? `${totalProgress.closedCount}件 / ${totalProgress.interviewCount}件`
                      : '-'}
                  </p>
                </div>
              </div>
              {/* 成約単価 */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                  <p className="text-sm font-medium text-amber-700">成約単価</p>
                </div>
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold text-amber-600">
                    ¥{(kpiAssumptions.revenuePerClosed / 10000).toFixed(0)}万
                  </p>
                  <p className="text-sm text-slate-500 mb-1">/人</p>
                </div>
                <div className="mt-2 pt-2 border-t border-amber-200">
                  <div className="flex items-end gap-2">
                    <p
                      className={`text-2xl font-bold ${
                        actualRevenuePerClosed >= kpiAssumptions.revenuePerClosed
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {totalProgress.closedCount > 0
                        ? `¥${(actualRevenuePerClosed / 10000).toFixed(0)}万`
                        : '-'}
                    </p>
                    <p className="text-sm text-slate-500 mb-1">実績</p>
                  </div>
                  <p className="text-lg text-slate-500 mt-1">
                    {totalProgress.closedCount > 0
                      ? `${totalProgress.closedCount}件`
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 営業進捗状況 */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-500" />
              営業進捗状況
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-slate-700 font-semibold">担当者</TableHead>
                    <TableHead className="text-slate-700 font-semibold">担当</TableHead>
                    <TableHead className="text-slate-700 font-semibold">初回</TableHead>
                    <TableHead className="text-slate-700 font-semibold">面接</TableHead>
                    <TableHead className="text-slate-700 font-semibold">成約</TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-orange-50">
                      面談率 (担当→初回)
                      <br />
                      <span className="text-red-600 font-normal text-xs">
                        目標: {(targetRates.firstContactRate * 100).toFixed(0)}%
                      </span>
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-cyan-50">
                      設定率 (初回→面接)
                      <br />
                      <span className="text-red-600 font-normal text-xs">
                        目標: {(targetRates.interviewRate * 100).toFixed(0)}%
                      </span>
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-emerald-50">
                      成約率 (面接→成約)
                      <br />
                      <span className="text-red-600 font-normal text-xs">
                        目標: {(targetRates.closedRate * 100).toFixed(0)}%
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesProgress.map((progress) => {
                    const firstContactRate =
                      progress.totalCount > 0
                        ? (progress.firstContactCount / progress.totalCount) * 100
                        : NaN
                    const interviewRate =
                      progress.firstContactCount > 0
                        ? (progress.interviewCount / progress.firstContactCount) * 100
                        : NaN
                    const closedRate =
                      progress.interviewCount > 0
                        ? (progress.closedCount / progress.interviewCount) * 100
                        : NaN

                    // デバッグ用（開発環境のみ、吉田の場合）
                    if (process.env.NODE_ENV === 'development' && progress.userName === '吉田') {
                      console.log('営業進捗表示（吉田）:', {
                        userName: progress.userName,
                        totalCount: progress.totalCount,
                        firstContactCount: progress.firstContactCount,
                        interviewCount: progress.interviewCount,
                        closedCount: progress.closedCount,
                        firstContactRate,
                        interviewRate,
                        closedRate,
                        calculatedFirstContactRate: progress.totalCount > 0 ? (progress.firstContactCount / progress.totalCount) * 100 : NaN,
                        calculatedInterviewRate: progress.firstContactCount > 0 ? (progress.interviewCount / progress.firstContactCount) * 100 : NaN,
                        calculatedClosedRate: progress.interviewCount > 0 ? (progress.closedCount / progress.interviewCount) * 100 : NaN
                      })
                    }

                    return (
                      <TableRow key={progress.userId} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-800">
                          {progress.userName}
                        </TableCell>
                        <TableCell className="text-center">{progress.totalCount}</TableCell>
                        <TableCell className="text-center">
                          {progress.firstContactCount}
                        </TableCell>
                        <TableCell className="text-center">{progress.interviewCount}</TableCell>
                        <TableCell className="text-center">{progress.closedCount}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span
                              className={
                                firstContactRate >= targetRates.firstContactRate * 100
                                  ? 'text-emerald-600 font-bold'
                                  : 'text-amber-600 font-bold'
                              }
                            >
                              {formatRate(firstContactRate)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span
                              className={
                                interviewRate >= targetRates.interviewRate * 100
                                  ? 'text-emerald-600 font-bold'
                                  : 'text-amber-600 font-bold'
                              }
                            >
                              {formatRate(interviewRate)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span
                              className={
                                closedRate >= targetRates.closedRate * 100
                                  ? 'text-emerald-600 font-bold'
                                  : 'text-amber-600 font-bold'
                              }
                            >
                              {formatRate(closedRate)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {/* 合計行 */}
                  <TableRow className="bg-slate-100 font-bold">
                    <TableCell className="font-bold text-slate-800">合計</TableCell>
                    <TableCell className="text-center">{totalProgress.totalCount}</TableCell>
                    <TableCell className="text-center">{totalProgress.firstContactCount}</TableCell>
                    <TableCell className="text-center">{totalProgress.interviewCount}</TableCell>
                    <TableCell className="text-center">{totalProgress.closedCount}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          totalFirstContactRate >= targetRates.firstContactRate * 100
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }
                      >
                        {formatRate(totalFirstContactRate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          totalInterviewRate >= targetRates.interviewRate * 100
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }
                      >
                        {formatRate(totalInterviewRate)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={
                          totalClosedRate >= targetRates.closedRate * 100
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                        }
                      >
                        {formatRate(totalClosedRate)}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 面接状況 */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-violet-500" />
              面接状況
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-slate-700 font-semibold">担当者</TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-orange-50">
                      調整中
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-blue-50">
                      面接確定済
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-green-50">
                      面接実施済（結果待ち）
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-pink-50">
                      内定獲得（返事待ち）
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesProgress.map((progress) => {
                    // CRM データ（DB）から面接状況を取得（candidate.status ベースで面接一覧と統一）
                    const cases = getStatusCases[progress.userId] || {
                      adjusting: [],
                      scheduled: [],
                      completed: [],
                      offer: [],
                    }

                    return (
                      <TableRow key={progress.userId} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-800">
                          {progress.userName}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {cases.adjusting.length > 0 ? (
                            <div className="space-y-1">
                              {cases.adjusting.map((case_, idx) => (
                                <div key={idx}>
                                  {case_.name} {case_.yomi} {formatAmount(case_.amount)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {cases.scheduled.length > 0 ? (
                            <div className="space-y-1">
                              {cases.scheduled.map((case_, idx) => (
                                <div key={idx}>
                                  {case_.name} {case_.yomi} {formatAmount(case_.amount)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {cases.completed.length > 0 ? (
                            <div className="space-y-1">
                              {cases.completed.map((case_, idx) => (
                                <div key={idx}>
                                  {case_.name} {case_.yomi} {formatAmount(case_.amount)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {cases.offer.length > 0 ? (
                            <div className="space-y-1">
                              {cases.offer.map((case_, idx) => (
                                <div key={idx}>
                                  {case_.name} {case_.yomi} {formatAmount(case_.amount)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 売上数字 */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-violet-500" />
              売上数字
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-slate-700 font-semibold">社員名</TableHead>
                    <TableHead className="text-slate-700 font-semibold">売上予算</TableHead>
                    <TableHead className="text-slate-700 font-semibold">成約額</TableHead>
                    <TableHead className="text-slate-700 font-semibold">対予算(%)</TableHead>
                    <TableHead className="text-slate-700 font-semibold">面接設定目標</TableHead>
                    <TableHead className="text-slate-700 font-semibold">面接設定数</TableHead>
                    <TableHead className="text-slate-700 font-semibold">対面接設定(%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesProgress.map((progress) => {
                      const user = users.find((u) => u.id === progress.userId)
                      // 期間内の成約金額を計算
                      const periodSales = periodContracts
                        .filter((c) => {
                          const candidate = candidates.find((ca) => ca.id === c.candidate_id)
                          return candidate && candidate.consultant_id === progress.userId
                        })
                        .reduce((sum, c) => sum + (c.revenue_excluding_tax || 0), 0)
                      
                      // 個人別月次目標から予算と面接設定目標を取得（DBから取得）
                      const userTarget = userTargets[progress.userId]
                      const budget = userTarget?.sales_budget || 0
                      const meetingTarget = userTarget?.interview_target || 0
                      
                      // フォールバック: DBにデータがない場合はmockデータを使用
                      const stats = mockMemberStats.find((s) => s.userId === progress.userId)
                      const finalBudget = budget > 0 ? budget : (stats?.budget || 0)
                      const finalMeetingTarget = meetingTarget > 0 ? meetingTarget : (stats?.meetingTarget || 0)
                      
                      const budgetRate = finalBudget > 0 ? (periodSales / finalBudget) * 100 : 0
                      const meetingRate = finalMeetingTarget > 0
                        ? (progress.interviewCount / finalMeetingTarget) * 100
                        : 0

                      return (
                        <TableRow key={progress.userId} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-800">
                            {user?.name || progress.userName || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(finalBudget)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-semibold">
                            {formatAmount(periodSales)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                budgetRate >= 100
                                  ? 'text-emerald-600 font-bold'
                                  : budgetRate >= 50
                                  ? 'text-amber-600 font-bold'
                                  : 'text-red-600 font-bold'
                              }
                            >
                              {budgetRate.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{finalMeetingTarget}</TableCell>
                          <TableCell className="text-center">{progress.interviewCount}</TableCell>
                          <TableCell className="text-right">
                            <span
                              className={
                                meetingRate >= 100
                                  ? 'text-emerald-600 font-bold'
                                  : meetingRate >= 50
                                  ? 'text-amber-600 font-bold'
                                  : 'text-red-600 font-bold'
                              }
                            >
                              {meetingRate.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ヨミ数字（当月） */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-500" />
              ヨミ数字（当月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-slate-700 font-semibold">社員名</TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-red-50">
                      成約MIN Aヨミ (80%)
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-orange-50">
                      成約MIN Bヨミ (50%)
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-yellow-50">
                      成約MIN Cヨミ (30%)
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-slate-50">
                      成約MIN Dヨミ (10%)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users
                    .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
                    .map((user) => {
                      const progress = salesProgress.find((p) => p.userId === user.id)
                      const totalCount = progress?.totalCount || 0
                      return { user, totalCount }
                    })
                    .sort((a, b) => b.totalCount - a.totalCount)
                    .map(({ user }) => {
                      const stats = memberYomiStats[user.id] || { yomiA: 0, yomiB: 0, yomiC: 0, yomiD: 0 }
                      return (
                        <TableRow key={user.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-800">
                            {user.name || '-'}
                          </TableCell>
                          <TableCell className="text-right bg-red-50">
                            {stats.yomiA > 0 ? formatAmount(stats.yomiA) : '-'}
                          </TableCell>
                          <TableCell className="text-right bg-orange-50">
                            {stats.yomiB > 0 ? formatAmount(stats.yomiB) : '-'}
                          </TableCell>
                          <TableCell className="text-right bg-yellow-50">
                            {stats.yomiC > 0 ? formatAmount(stats.yomiC) : '-'}
                          </TableCell>
                          <TableCell className="text-right bg-slate-50">
                            {stats.yomiD > 0 ? formatAmount(stats.yomiD) : '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ヨミ数字（翌月） */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-500" />
              ヨミ数字（翌月）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-slate-700 font-semibold">社員名</TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-red-50">
                      成約MIN Aヨミ (80%)
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-orange-50">
                      成約MIN Bヨミ (50%)
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-yellow-50">
                      成約MIN Cヨミ (30%)
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-slate-50">
                      成約MIN Dヨミ (10%)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users
                    .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
                    .map((user) => {
                      const progress = salesProgress.find((p) => p.userId === user.id)
                      const totalCount = progress?.totalCount || 0
                      return { user, totalCount }
                    })
                    .sort((a, b) => b.totalCount - a.totalCount)
                    .map(({ user }) => {
                      const yomiStats = memberYomiStatsNext[user.id] || { yomiA: 0, yomiB: 0, yomiC: 0, yomiD: 0 }
                      return (
                        <TableRow key={user.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-800">
                            {user.name}
                          </TableCell>
                          <TableCell className="text-right bg-red-50">
                            {yomiStats.yomiA > 0 ? formatAmount(yomiStats.yomiA) : '-'}
                          </TableCell>
                          <TableCell className="text-right bg-orange-50">
                            {yomiStats.yomiB > 0 ? formatAmount(yomiStats.yomiB) : '-'}
                          </TableCell>
                          <TableCell className="text-right bg-yellow-50">
                            {yomiStats.yomiC > 0 ? formatAmount(yomiStats.yomiC) : '-'}
                          </TableCell>
                          <TableCell className="text-right bg-slate-50">
                            {yomiStats.yomiD > 0 ? formatAmount(yomiStats.yomiD) : '-'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}

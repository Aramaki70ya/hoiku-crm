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
} from '@/lib/supabase/queries-client-with-fallback'
import type { Candidate, Project, Interview, User, Contract } from '@/types/database'

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
      const [candidatesData, projectsData, contractsData, interviewsData, usersData] = await Promise.all([
        getCandidates(),
        getProjects(),
        getContracts(),
        getInterviews(),
        getUsers(),
      ])
      setCandidates(candidatesData)
      setProjects(projectsData)
      setContracts(contractsData)
      setInterviews(interviewsData)
      setUsers(usersData)
    } catch (error) {
      console.error('Error fetching data:', error)
      setCandidates([])
      setProjects([])
      setContracts([])
      setInterviews([])
      setUsers([])
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

  // 実際のデータから各ステータスの案件を集計
  const getStatusCases = useMemo(() => {
    const statusCases: Record<
      string,
      {
        adjusting: Array<{ name: string; yomi: string; amount: number }>
        beforeInterview: Array<{ name: string; yomi: string; amount: number }>
        waitingResult: Array<{ name: string; yomi: string; amount: number }>
        waitingReply: Array<{ name: string; yomi: string; amount: number }>
      }
    > = {}

    // 各担当者ごとに集計
    users
      .filter((u) => u.role !== 'admin')
      .forEach((user) => {
        const userCandidates = candidates.filter((c) => c.consultant_id === user.id)
        const userProjects = projects.filter((p) =>
          userCandidates.some((c) => c.id === p.candidate_id)
        )

        // 同一求職者は最新のヨミ（project.updated_at）1件だけ表示するため Map で保持
        const adjustingMap = new Map<string, { caseInfo: { name: string; yomi: string; amount: number }; updated_at: string }>()
        const beforeInterviewMap = new Map<string, { caseInfo: { name: string; yomi: string; amount: number }; updated_at: string }>()
        const waitingResultMap = new Map<string, { caseInfo: { name: string; yomi: string; amount: number }; updated_at: string }>()
        const waitingReplyMap = new Map<string, { caseInfo: { name: string; yomi: string; amount: number }; updated_at: string }>()

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

        userProjects.forEach((project) => {
          const candidate = userCandidates.find((c) => c.id === project.candidate_id)
          if (!candidate) return

          // 選択期間内の面接のみ使用（面接一覧と同じ期間で集計）
          const projectInterviews = periodInterviews.filter((i) => i.project_id === project.id)
          if (projectInterviews.length === 0) return

          // 各ステータスごとにフィルタ
          const reschedulingInterviews = projectInterviews.filter((i) => i.status === 'rescheduling')
          const scheduledInterviews = projectInterviews.filter((i) => i.status === 'scheduled')
          const completedInterviews = projectInterviews.filter((i) => i.status === 'completed')

          // ヨミの表示用フォーマット
          const yomiLabel = project.probability
            ? `${project.probability}ヨミ(${
                project.probability === 'A'
                  ? '80%'
                  : project.probability === 'B'
                  ? '50%'
                  : project.probability === 'C'
                  ? '30%'
                  : '10%'
              })`
            : ''

          const caseInfo = {
            name: candidate.name,
            yomi: yomiLabel,
            amount: project.expected_amount || 0,
          }
          const updated_at = project.updated_at || project.created_at || ''

          // 調整中: 面接日程を調整している案件（reschedulingステータスの面接がある）
          if (reschedulingInterviews.length > 0) {
            setIfNewer(adjustingMap, candidate.id, caseInfo, updated_at)
          }
          // 面接前: 面接が予定されているが、まだ実施されていない案件
          else if (scheduledInterviews.length > 0 && completedInterviews.length === 0) {
            setIfNewer(beforeInterviewMap, candidate.id, caseInfo, updated_at)
          }
          // 結果待ち: 面接が終了し、結果を待っている案件
          else if (completedInterviews.length > 0 && candidate.status !== 'offer') {
            setIfNewer(waitingResultMap, candidate.id, caseInfo, updated_at)
          }
          // 本人返事待ち: 内定が出て、本人からの返事を待っている案件
          if (project.phase === 'offer' || candidate.status === 'offer') {
            setIfNewer(waitingReplyMap, candidate.id, caseInfo, updated_at)
          }
        })

        statusCases[user.id] = {
          adjusting: Array.from(adjustingMap.values()).map((v) => v.caseInfo),
          beforeInterview: Array.from(beforeInterviewMap.values()).map((v) => v.caseInfo),
          waitingResult: Array.from(waitingResultMap.values()).map((v) => v.caseInfo),
          waitingReply: Array.from(waitingReplyMap.values()).map((v) => v.caseInfo),
        }
      })

    return statusCases
  }, [users, candidates, projects, periodInterviews])

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

  // 月次マージシートから営業進捗を計算（期間対応）
  // 月次マージシートのデータが利用可能な場合はそれを使用、そうでない場合は従来のロジックにフォールバック
  const salesProgress = useMemo(() => {
    // ローディング中は古いデータを表示しない（空配列を返す）
    if (monthlyMetricsLoading) {
      return []
    }
    
    // 月次マージシートのデータが利用可能な場合
    if (monthlyMetrics.length > 0) {
      return users
        .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
        .map((user) => {
          // 月次マージシートから該当ユーザーのデータを取得
          const metric = monthlyMetrics.find((m) => m.consultant === user.name)
          
          if (metric) {
            return {
              userId: user.id,
              userName: user.name,
              totalCount: metric.assigned,
              firstContactCount: metric.firstContact,
              interviewCount: metric.interview,
              closedCount: metric.closed,
            }
          }
          
          // 月次マージシートにデータがない場合は0を返す
          return {
            userId: user.id,
            userName: user.name,
            totalCount: 0,
            firstContactCount: 0,
            interviewCount: 0,
            closedCount: 0,
          }
        })
        .filter((p) => p.totalCount > 0) // 担当数が0のメンバーを除外
        .sort((a, b) => b.totalCount - a.totalCount)
    }
    
    // フォールバック: 従来のロジック（月次マージシートのデータが利用できない場合）
    const progress = users
      .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
      .map((user) => {
        // 期間内に登録された求職者（担当件数）
        const userPeriodCandidates = periodCandidates.filter((c) => c.consultant_id === user.id)
        const totalCount = userPeriodCandidates.length

        // 初回連絡済み（ステータスがfirst_contact_done以降）
        const firstContactCount = userPeriodCandidates.filter(
          (c) => !['new', 'contacting'].includes(c.status)
        ).length

        // 期間内に面接を設定したユニークな求職者数（start_atで判定）
        const interviewCandidateIds = new Set<string>()
        periodInterviews.forEach((i) => {
          const project = projects.find((p) => p.id === i.project_id)
          if (project) {
            const candidate = candidates.find((c) => c.id === project.candidate_id)
            if (candidate && candidate.consultant_id === user.id) {
              interviewCandidateIds.add(candidate.id)
            }
          }
        })
        const interviewCount = interviewCandidateIds.size

        // 期間内に成約を設定した数（contracted_at/accepted_dateで判定）
        const closedCount = periodContracts.filter((c) => {
          const candidate = candidates.find((ca) => ca.id === c.candidate_id)
          return candidate && candidate.consultant_id === user.id
        }).length

        return {
          userId: user.id,
          userName: user.name,
          totalCount,
          firstContactCount,
          interviewCount,
          closedCount,
        }
      })
    
    // 担当が多い順（totalCount降順）でソートし、担当数が0のメンバーを除外
    return progress
      .filter((p) => p.totalCount > 0) // 担当数が0のメンバーを除外
      .sort((a, b) => b.totalCount - a.totalCount)
  }, [users, periodCandidates, periodInterviews, periodContracts, projects, candidates, periodType, monthlyMetrics, monthlyMetricsLoading, isUserActiveInPeriod])

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
                    <TableHead className="text-slate-700 font-semibold bg-orange-50">
                      面接前
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-orange-50">
                      結果待ち
                    </TableHead>
                    <TableHead className="text-slate-700 font-semibold bg-orange-50">
                      本人返事待ち
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesProgress.map((progress) => {
                    // CRM データ（DB）から面接状況を取得（月次マージシートではなくリアルタイムのデータを表示）
                    const cases = getStatusCases[progress.userId] || {
                      adjusting: [],
                      beforeInterview: [],
                      waitingResult: [],
                      waitingReply: [],
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
                          {cases.beforeInterview.length > 0 ? (
                            <div className="space-y-1">
                              {cases.beforeInterview.map((case_, idx) => (
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
                          {cases.waitingResult.length > 0 ? (
                            <div className="space-y-1">
                              {cases.waitingResult.map((case_, idx) => (
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
                          {cases.waitingReply.length > 0 ? (
                            <div className="space-y-1">
                              {cases.waitingReply.map((case_, idx) => (
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

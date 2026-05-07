'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  PhoneCall,
  UserCheck,
  XCircle,
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
  getMemosClient as getMemos,
} from '@/lib/supabase/queries-client-with-fallback'
import { INTERVIEW_SET_STATUSES } from '@/lib/status-mapping'
import type { Candidate, Project, Interview, User, Contract, StatusHistory, Memo } from '@/types/database'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts'

function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getPreviousYearMonth(baseYearMonth: string): string {
  const [y, m] = baseYearMonth.split('-').map(Number)
  const prev = new Date(y, m - 2, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
}

function formatYearMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number)
  return `${y}年${m}月`
}

type ClosedModalItem = {
  candidateId: string
  candidateName: string
  acceptedDate: string | null
  closedAt: string | null
  revenueExcludingTax: number | null
  placementName: string | null
  status: string
}

type YomiModalItem = {
  candidateId: string
  candidateName: string
  candidateStatus: string
  projectId: string
  clientName: string
  expectedAmount: number
  probability: 'A' | 'B' | 'C'
}

// 同一求職者の案件を1件に絞る（最新更新日時を優先）
function dedupeByCandidate(projectList: Project[]): Project[] {
  const map = new Map<string, Project>()
  for (const p of projectList) {
    const existing = map.get(p.candidate_id)
    if (!existing) {
      map.set(p.candidate_id, p)
      continue
    }
    const pTime = p.updated_at || p.created_at || ''
    const eTime = existing.updated_at || existing.created_at || ''
    if (pTime > eTime) map.set(p.candidate_id, p)
  }
  return Array.from(map.values())
}

type SalesProgressRow = {
  userId: string
  userName: string
  totalCount: number
  firstContactCount: number
  interviewCount: number
  closedCount: number
}

type ProgressTotals = {
  totalCount: number
  firstContactCount: number
  interviewCount: number
  closedCount: number
}

const TEAM2_USER_IDS = ['3', '4', '7', '8', '9'] as const // 西田、鈴木、後藤、小畦、吉田

function SalesProgressMetricsTable({
  title,
  description,
  rows,
  totals,
  kpiTargetRates,
  formatRate,
  cohort,
  onOpenInterview,
  onOpenClosed,
}: {
  title: string
  description?: string
  rows: SalesProgressRow[]
  totals: ProgressTotals
  kpiTargetRates: { firstContactRate: number; interviewRate: number; closedRate: number }
  formatRate: (rate: number) => string
  cohort: 'current' | 'prior'
  onOpenInterview: (userId: string, cohort: 'current' | 'prior') => void
  onOpenClosed: (userId: string, cohort: 'current' | 'prior') => void
}) {
  const totalFirstContactRate =
    totals.totalCount > 0 ? (totals.firstContactCount / totals.totalCount) * 100 : 0
  const totalInterviewRate =
    totals.firstContactCount > 0 ? (totals.interviewCount / totals.firstContactCount) * 100 : 0
  const totalClosedRate =
    totals.interviewCount > 0 ? (totals.closedCount / totals.interviewCount) * 100 : 0

  return (
    <div className="space-y-2 mb-8 last:mb-0">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description ? <p className="text-xs text-slate-500 mt-1">{description}</p> : null}
      </div>
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
                目標: {(kpiTargetRates.firstContactRate * 100).toFixed(0)}%
              </span>
            </TableHead>
            <TableHead className="text-slate-700 font-semibold bg-cyan-50">
              設定率 (初回→面接)
              <br />
              <span className="text-red-600 font-normal text-xs">
                目標: {(kpiTargetRates.interviewRate * 100).toFixed(0)}%
              </span>
            </TableHead>
            <TableHead className="text-slate-700 font-semibold bg-emerald-50">
              成約率 (面接→成約)
              <br />
              <span className="text-red-600 font-normal text-xs">
                目標: {(kpiTargetRates.closedRate * 100).toFixed(0)}%
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((progress) => {
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

            if (process.env.NODE_ENV === 'development' && progress.userName === '吉田') {
              console.log(`営業進捗表示（吉田/${cohort}）:`, {
                cohort,
                userName: progress.userName,
                totalCount: progress.totalCount,
                firstContactCount: progress.firstContactCount,
                interviewCount: progress.interviewCount,
                closedCount: progress.closedCount,
                firstContactRate,
                interviewRate,
                closedRate,
              })
            }

            return (
              <TableRow key={`${cohort}-${progress.userId}`} className="hover:bg-slate-50">
                <TableCell className="font-medium text-slate-800">{progress.userName}</TableCell>
                <TableCell className="text-center">{progress.totalCount}</TableCell>
                <TableCell className="text-center">{progress.firstContactCount}</TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 font-normal hover:bg-cyan-50"
                    onClick={() => onOpenInterview(progress.userId, cohort)}
                    disabled={progress.interviewCount === 0}
                    data-testid={`interview-count-${cohort}-${progress.userId}`}
                  >
                    <span
                      className={progress.interviewCount > 0 ? 'text-cyan-600 underline cursor-pointer' : ''}
                    >
                      {progress.interviewCount}
                    </span>
                  </Button>
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-1 font-normal hover:bg-emerald-50"
                    onClick={() => onOpenClosed(progress.userId, cohort)}
                    disabled={progress.closedCount === 0}
                  >
                    <span
                      className={progress.closedCount > 0 ? 'text-emerald-600 underline cursor-pointer' : ''}
                    >
                      {progress.closedCount}
                    </span>
                  </Button>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span
                      className={
                        firstContactRate >= kpiTargetRates.firstContactRate * 100
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
                        interviewRate >= kpiTargetRates.interviewRate * 100
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
                        closedRate >= kpiTargetRates.closedRate * 100
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
          <TableRow className="bg-slate-100 font-bold">
            <TableCell className="font-bold text-slate-800">合計</TableCell>
            <TableCell className="text-center">{totals.totalCount}</TableCell>
            <TableCell className="text-center">{totals.firstContactCount}</TableCell>
            <TableCell className="text-center">{totals.interviewCount}</TableCell>
            <TableCell className="text-center">{totals.closedCount}</TableCell>
            <TableCell className="text-center">
              <span
                className={
                  totalFirstContactRate >= kpiTargetRates.firstContactRate * 100
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
                  totalInterviewRate >= kpiTargetRates.interviewRate * 100
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
                  totalClosedRate >= kpiTargetRates.closedRate * 100
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
  )
}

export default function DashboardSummaryPage() {
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(() => getCurrentYearMonth())
  const [selectedPriorYearMonth, setSelectedPriorYearMonth] = useState<string>(() =>
    getPreviousYearMonth(getCurrentYearMonth())
  )
  
  // 面接詳細モーダル用 state
  const [interviewModalOpen, setInterviewModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedInterviewCohort, setSelectedInterviewCohort] = useState<'current' | 'prior'>('current')
  const [interviewModalData, setInterviewModalData] = useState<Array<{
    candidateId: string
    candidateName: string
    interviewDate: string | null
    status: string
    hasInterview: boolean
    interviewId?: string
    projectId?: string
  }>>([])
  const [voidingKey, setVoidingKey] = useState<string | null>(null)

  // 成約詳細モーダル用 state
  const [closedModalOpen, setClosedModalOpen] = useState(false)
  const [closedModalUserId, setClosedModalUserId] = useState<string | null>(null)
  const [closedModalData, setClosedModalData] = useState<ClosedModalItem[]>([])

  // ヨミ内訳モーダル用 state
  const [yomiModalOpen, setYomiModalOpen] = useState(false)
  const [yomiModalTitle, setYomiModalTitle] = useState('')
  const [yomiModalData, setYomiModalData] = useState<YomiModalItem[]>([])
  
  // Supabaseデータ取得
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([])
  const [memos, setMemos] = useState<Memo[]>([])
  const [timelineEvents, setTimelineEvents] = useState<Array<{
    id: string
    candidate_id: string
    event_type: string
    title: string
    metadata: Record<string, unknown> | null
    created_at: string
  }>>([])
  const [loading, setLoading] = useState(true)
  
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
      const [candidatesData, projectsData, contractsData, interviewsData, usersData, statusHistoryData, memosData] = await Promise.all([
        getCandidates(),
        getProjects(),
        getContracts(),
        getInterviews(),
        getUsers(),
        getStatusHistory(),
        getMemos(),
      ])
      setCandidates(candidatesData)
      setProjects(projectsData)
      setContracts(contractsData)
      setInterviews(interviewsData)
      setUsers(usersData)
      setStatusHistory(statusHistoryData)
      setMemos(memosData)
    } catch (error) {
      console.error('Error fetching data:', error)
      setCandidates([])
      setProjects([])
      setContracts([])
      setInterviews([])
      setUsers([])
      setStatusHistory([])
      setMemos([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 初回読み込み
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 選択年月から month_text（YYYY_MM）を返す
  const getMonthText = useCallback(() => selectedYearMonth.replace('-', '_'), [selectedYearMonth])

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

  // 個人別月次目標を取得（画面上の選択年月に合わせる）
  const fetchUserTargets = useCallback(async () => {
    setUserTargetsLoading(true)
    try {
      const qs = new URLSearchParams({
        year_month: selectedYearMonth,
        _t: String(Date.now()),
      })
      const response = await fetch(`/api/user-targets?${qs.toString()}`)
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
      const msg = error instanceof Error ? error.message : String(error)
      const isNetworkFailure =
        (error instanceof TypeError && msg.includes('fetch')) ||
        msg === 'Failed to fetch' ||
        (typeof navigator !== 'undefined' && !navigator.onLine)
      if (isNetworkFailure) {
        console.warn('個人別目標: 取得をスキップ（ネットワークまたはサーバー未応答）', msg)
      } else {
        console.error('Error fetching user targets:', error)
      }
      setUserTargets({})
    } finally {
      setUserTargetsLoading(false)
    }
  }, [selectedYearMonth])

  // 期間変更時に月次データを再取得
  useEffect(() => {
    fetchMonthlyStatusCases()
  }, [fetchMonthlyStatusCases])

  useEffect(() => {
    fetchUserTargets()
  }, [fetchUserTargets])

  // すべてのデータを再取得
  const refetchAll = useCallback(() => {
    fetchData()
    fetchMonthlyStatusCases()
    fetchUserTargets()
  }, [fetchData, fetchMonthlyStatusCases, fetchUserTargets])

  // ページ復帰時・bfcache 復元時に再取得（連打で fetch が失敗しやすいのでデバウンス）
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debounceTimer = null
        refetchAll()
      }, 500)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        scheduleRefetch()
      }
    }
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        scheduleRefetch()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [refetchAll])

  // 期間表示用テキスト
  const getPeriodLabel = () => {
    const [y, m] = selectedYearMonth.split('-').map(Number)
    const now = new Date()
    const isCurrent = now.getFullYear() === y && now.getMonth() + 1 === m
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const isPrev = prev.getFullYear() === y && prev.getMonth() + 1 === m
    if (isCurrent) return `${y}年${m}月（今月）`
    if (isPrev) return `${y}年${m}月（先月）`
    return `${y}年${m}月`
  }

  // 選択年月の開始日・終了日を計算
  const periodDates = useMemo(() => {
    const [y, m] = selectedYearMonth.split('-').map(Number)
    const startDate = new Date(y, m - 1, 1)
    const endDate = new Date(y, m, 0, 23, 59, 59)
    return { startDate, endDate }
  }, [selectedYearMonth])

  const priorRegistrationOptions = useMemo(() => {
    const monthSet = new Set<string>()
    candidates.forEach((c) => {
      if (!c.registered_at) return
      const d = new Date(c.registered_at)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (ym < selectedYearMonth) monthSet.add(ym)
    })
    return Array.from(monthSet).sort((a, b) => (a < b ? 1 : -1))
  }, [candidates, selectedYearMonth])

  useEffect(() => {
    if (priorRegistrationOptions.length === 0) return
    if (!priorRegistrationOptions.includes(selectedPriorYearMonth)) {
      setSelectedPriorYearMonth(priorRegistrationOptions[0])
    }
  }, [priorRegistrationOptions, selectedPriorYearMonth])

  const priorPeriodDates = useMemo(() => {
    const [y, m] = selectedPriorYearMonth.split('-').map(Number)
    const startDate = new Date(y, m - 1, 1)
    const endDate = new Date(y, m, 0, 23, 59, 59)
    return { startDate, endDate }
  }, [selectedPriorYearMonth])
  // 期間内のデータをフィルタリング
  const periodCandidates = useMemo(() => {
    const { startDate, endDate } = periodDates
    return candidates.filter(c => {
      if (!c.registered_at) return false
      const registeredDate = new Date(c.registered_at)
      return registeredDate >= startDate && registeredDate <= endDate
    })
  }, [candidates, periodDates])

  /** 前月以前登録ベースの母集団（選択した過去月に登録された求職者） */
  const priorRegistrationCandidates = useMemo(() => {
    const { startDate, endDate } = priorPeriodDates
    return candidates.filter((c) => {
      if (!c.registered_at) return false
      const registeredDate = new Date(c.registered_at)
      return registeredDate >= startDate && registeredDate <= endDate
    })
  }, [candidates, priorPeriodDates])

  const candidateById = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates])

  const periodCandidateIdSet = useMemo(
    () => new Set(periodCandidates.map((c) => c.id)),
    [periodCandidates]
  )
  const priorRegistrationCandidateIdSet = useMemo(
    () => new Set(priorRegistrationCandidates.map((c) => c.id)),
    [priorRegistrationCandidates]
  )

  // 期間内に成約を設定した数（created_atで判定）
  const periodContracts = useMemo(() => {
    const { startDate, endDate } = periodDates
    return contracts.filter(c => {
      // contracted_at（成約確定日時）、accepted_date（承諾日）、created_at の順で判定
      const dateStr = c.contracted_at || c.accepted_date || c.created_at
      if (!dateStr) return false
      const contractDate = new Date(dateStr)
      return contractDate >= startDate && contractDate <= endDate
    })
  }, [contracts, periodDates])

  // 期間内成約の売上合計（目標数値・成約単価実績用）
  const periodTotalSales = useMemo(() => {
    return periodContracts.reduce(
      (sum, c) => sum + (c.revenue_including_tax ?? c.revenue_excluding_tax ?? 0),
      0
    )
  }, [periodContracts])

  // 期間内に面接を設定した数（start_atで判定）
  const periodInterviews = useMemo(() => {
    const { startDate, endDate } = periodDates
    return interviews.filter(i => {
      if (!i.start_at) return false
      const interviewDate = new Date(i.start_at)
      return interviewDate >= startDate && interviewDate <= endDate
    })
  }, [interviews, periodDates])

  // 期間内に「面接のステータス」になった求職者（面接数カウント用）
  // ※成約のみその月の人は含めない（例: 1月面接→2月成約なら、2月の面接数には含めず成約のみ）
  // ※ INTERVIEW_PHASE_STATUSES, INTERVIEW_SET_STATUSES は @/lib/status-mapping からインポート
  // ※ 無効化された面接（is_voided=true）は除外
  // ※ 面接確定済・実施済のみカウント（調整中は除外）
  const buildInterviewCandidateIds = useCallback((startDate: Date, endDate: Date) => {
    const candidateIds = new Set<string>()
    const statusBasedCandidateIdsInPeriod = new Set<string>()
    
    // 過去に面接経験がある candidate_id を集める（初回面接のみカウントするため）
    // ※ 面接確定済以降のステータスを「面接経験あり」とする（面接日程調整中のみは除外しない）
    // ※ API（マージシート）側の INTERVIEW_SET_STATUSES と統一
    const previouslyInterviewedIds = new Set<string>()
    statusHistory.forEach(h => {
      if (!(INTERVIEW_SET_STATUSES as string[]).includes(h.new_status) || !h.changed_at) return
      const changedDate = new Date(h.changed_at)
      if (changedDate < startDate) {
        previouslyInterviewedIds.add(h.candidate_id)
      }
    })

    // 面接レコード基準でも「初回のみ」を担保するため、
    // 期間開始前に有効な面接レコードがある candidate_id は除外対象にする
    const projectById = new Map(projects.map((p) => [p.id, p]))
    interviews.forEach((iv) => {
      if (!iv.start_at || iv.is_voided) return
      const interviewDate = new Date(iv.start_at)
      if (interviewDate >= startDate) return
      const project = projectById.get(iv.project_id)
      if (!project?.candidate_id) return
      previouslyInterviewedIds.add(project.candidate_id)
    })
    
    // status_historyから集計: 期間内に面接確定済・実施済のステータスに変わった人
    // ※ 面接日程調整中は除外（調整段階辞退・未成立を除外）
    // ※ 設定後キャンセルはカウントする（一度確定した時点でカウント。渡邊・新井など）
    // ※ 無効化（is_voided）した面接のみ除外（ダッシュボードで手動無効化した人）
    // ※ 過去に面接経験がある求職者は除外（初回面接のみカウント）
    const INTERVIEW_CONFIRMED_STATUSES = ['面接確定済', '面接実施済（結果待ち）'] as const
    statusHistory.forEach(h => {
      if (!INTERVIEW_CONFIRMED_STATUSES.includes(h.new_status as typeof INTERVIEW_CONFIRMED_STATUSES[number]) || !h.changed_at) return
      const changedDate = new Date(h.changed_at)
      if (changedDate >= startDate && changedDate <= endDate) {
        statusBasedCandidateIdsInPeriod.add(h.candidate_id)
        if (!previouslyInterviewedIds.has(h.candidate_id)) {
          // 期間内の面接が1件以上あって、かつ全部手動無効化（is_voided）されている場合のみ除外
          // ※ 面接レコードがない（未登録）場合は status_history を根拠にカウントする
          const candidateProjects = projects.filter(p => p.candidate_id === h.candidate_id)
          const periodInterviewsForCandidate = candidateProjects.flatMap(project =>
            interviews.filter(i =>
              i.project_id === project.id &&
              new Date(i.start_at) >= startDate &&
              new Date(i.start_at) <= endDate
            )
          )
          const allVoided =
            periodInterviewsForCandidate.length > 0 &&
            periodInterviewsForCandidate.every(iv => (iv as { is_voided?: boolean }).is_voided === true)
          if (!allVoided) {
            candidateIds.add(h.candidate_id)
          }
        }
      }
    })

    // 面接追加レコード（interviews）もカウント対象にする
    // ただし初回のみ: 期間開始前に面接済み扱いの候補者は除外
    interviews.forEach((iv) => {
      if (!iv.start_at || iv.is_voided) return
      const interviewDate = new Date(iv.start_at)
      if (interviewDate < startDate || interviewDate > endDate) return
      const project = projectById.get(iv.project_id)
      if (!project?.candidate_id) return
      if (previouslyInterviewedIds.has(project.candidate_id)) return
      if (statusBasedCandidateIdsInPeriod.has(project.candidate_id)) return
      candidateIds.add(project.candidate_id)
    })
    
    // フォールバック: status_historyが空の場合のみ、candidatesテーブルで補完
    if (candidateIds.size === 0 && statusHistory.length === 0) {
      candidates.forEach(c => {
        if (!INTERVIEW_CONFIRMED_STATUSES.includes(c.status as typeof INTERVIEW_CONFIRMED_STATUSES[number]) || !c.updated_at) return
        const updatedDate = new Date(c.updated_at)
        if (updatedDate >= startDate && updatedDate <= endDate) {
          candidateIds.add(c.id)
        }
      })
    }
    
    return candidateIds
  }, [statusHistory, candidates, projects, interviews])

  const periodInterviewStatusCandidateIds = useMemo(
    () => buildInterviewCandidateIds(periodDates.startDate, periodDates.endDate),
    [buildInterviewCandidateIds, periodDates]
  )
  // 前月以前登録ベース用: 面接日時は問わず「面接経験あり」の候補者を集計
  const interviewedCandidateIdsAnytime = useMemo(() => {
    const candidateIds = new Set<string>()
    const INTERVIEW_CONFIRMED_STATUSES = new Set<string>(['面接確定済', '面接実施済（結果待ち）'])
    const projectById = new Map(projects.map((p) => [p.id, p]))

    statusHistory.forEach((h) => {
      if (INTERVIEW_CONFIRMED_STATUSES.has(h.new_status)) {
        candidateIds.add(h.candidate_id)
      }
    })

    interviews.forEach((iv) => {
      if (iv.is_voided) return
      const project = projectById.get(iv.project_id)
      if (!project?.candidate_id) return
      candidateIds.add(project.candidate_id)
    })

    return candidateIds
  }, [statusHistory, interviews, projects])

  // 成約済み求職者（履歴に成約または契約レコードあり、成約日時は問わない。営業進捗の成約列・成約モーダル用）
  const closedStatusCandidateIds = useMemo(() => {
    const candidateIds = new Set<string>()
    statusHistory.forEach((h) => {
      if (h.new_status === '内定承諾（成約）') {
        candidateIds.add(h.candidate_id)
      }
    })
    contracts.forEach((c) => {
      if (c.candidate_id) candidateIds.add(c.candidate_id)
    })
    return candidateIds
  }, [statusHistory, contracts])

  // 期間内に成約した求職者（画面上部の選択月。グラフ・担当者別面接/成約サマリー等の月次表示用）
  const periodClosedStatusCandidateIds = useMemo(() => {
    const candidateIds = new Set<string>()
    const { startDate, endDate } = periodDates

    statusHistory.forEach((h) => {
      if (h.new_status !== '内定承諾（成約）' || !h.changed_at) return
      const changedDate = new Date(h.changed_at)
      if (changedDate >= startDate && changedDate <= endDate) {
        candidateIds.add(h.candidate_id)
      }
    })

    contracts.forEach((c) => {
      if (!c.candidate_id) return
      const dateStr = c.contracted_at || c.accepted_date || c.created_at
      if (!dateStr) return
      const contractDate = new Date(dateStr)
      if (contractDate >= startDate && contractDate <= endDate) {
        candidateIds.add(c.candidate_id)
      }
    })

    return candidateIds
  }, [statusHistory, contracts, periodDates])

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
          const candidateProjects = projects.filter((p) => p.candidate_id === candidate.id)

          const sortedByUpdated = candidateProjects.length > 0
            ? [...candidateProjects].sort((a, b) => {
                const aTime = a.updated_at || a.created_at || ''
                const bTime = b.updated_at || b.created_at || ''
                return bTime.localeCompare(aTime)
              })
            : []

          // ヨミ情報（probability + expected_amount）があるプロジェクトを優先
          const yomiProject = sortedByUpdated.find(
            (p) => p.probability && p.expected_amount
          )
          const latestProject = yomiProject || sortedByUpdated[0] || null

          const yomiLabel = latestProject?.probability
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
            amount: latestProject?.expected_amount || 0,
          }
          const updated_at = latestProject?.updated_at || latestProject?.created_at || candidate.updated_at || ''

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
    const periodStart = new Date(periodDates.startDate)
    periodStart.setHours(0, 0, 0, 0)
    // 選択期間の開始日より前に退職した場合は非表示（退職日が期間開始日より前なら非表示）
    return retiredDate >= periodStart
  }, [periodDates])

  // 期間内に活動したユーザーID（ステータス変更 or メモ作成）
  const periodActiveUserIds = useMemo(() => {
    const ids = new Set<string>()
    const { startDate, endDate } = periodDates

    statusHistory.forEach((h) => {
      if (!h.changed_by || !h.changed_at) return
      const d = new Date(h.changed_at)
      if (d >= startDate && d <= endDate) ids.add(h.changed_by)
    })

    memos.forEach((m) => {
      if (!m.created_by || !m.created_at) return
      const d = new Date(m.created_at)
      if (d >= startDate && d <= endDate) ids.add(m.created_by)
    })

    return ids
  }, [statusHistory, memos, periodDates])

  // 前月以前登録ベース（選択した過去月）で活動したユーザーID
  const priorPeriodActiveUserIds = useMemo(() => {
    const ids = new Set<string>()
    const { startDate, endDate } = priorPeriodDates

    statusHistory.forEach((h) => {
      if (!h.changed_by || !h.changed_at) return
      const d = new Date(h.changed_at)
      if (d >= startDate && d <= endDate) ids.add(h.changed_by)
    })

    memos.forEach((m) => {
      if (!m.created_by || !m.created_at) return
      const d = new Date(m.created_at)
      if (d >= startDate && d <= endDate) ids.add(m.created_by)
    })

    return ids
  }, [statusHistory, memos, priorPeriodDates])

  // 営業進捗を計算（当月登録ベース / 前月以前登録ベースの二表）
  // 母集団は registered_at のみ。面接・成約ともに日時不問で、母集団内の実績件数を集計
  // 【詳細】docs/DASHBOARD_面接・成約の集計ロジック.md
  const { salesProgressCurrent, salesProgressPrior } = useMemo(() => {
    if (loading) {
      return { salesProgressCurrent: [] as SalesProgressRow[], salesProgressPrior: [] as SalesProgressRow[] }
    }

    const firstContactCountFor = (list: Candidate[]) =>
      list.filter((c) => !['初回連絡中', '連絡つかず（初回未接触）'].includes(c.status)).length

    /** 前月以前登録ベースの「担当」「初回」から除外する終了・ロスト系ステータス */
    const priorProgressExcludedStatuses = new Set<string>([
      'クローズ（終了）',
      '音信不通',
      '内定辞退',
      '連絡つかず（初回未接触）',
    ])

    const countInterviewByConsultant = (cohort: 'current' | 'prior') => {
      const counts = new Map<string, number>()
      for (const candidateId of interviewedCandidateIdsAnytime) {
        const c = candidateById.get(candidateId)
        if (!c || !c.consultant_id) continue
        if (cohort === 'current') {
          if (!periodCandidateIdSet.has(candidateId)) continue
        } else if (!priorRegistrationCandidateIdSet.has(candidateId)) continue
        counts.set(c.consultant_id, (counts.get(c.consultant_id) ?? 0) + 1)
      }
      return counts
    }

    const countClosedByConsultant = (cohort: 'current' | 'prior') => {
      const counts = new Map<string, number>()
      for (const candidateId of closedStatusCandidateIds) {
        const c = candidateById.get(candidateId)
        if (!c || !c.consultant_id) continue
        if (cohort === 'current') {
          if (!periodCandidateIdSet.has(candidateId)) continue
        } else if (!priorRegistrationCandidateIdSet.has(candidateId)) continue
        counts.set(c.consultant_id, (counts.get(c.consultant_id) ?? 0) + 1)
      }
      return counts
    }

    const currentInterviewCounts = countInterviewByConsultant('current')
    const priorInterviewCounts = countInterviewByConsultant('prior')
    const currentClosedCounts = countClosedByConsultant('current')
    const priorClosedCounts = countClosedByConsultant('prior')

    const base = users
      .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
      .map((user) => {
        const userPeriod = periodCandidates.filter((c) => c.consultant_id === user.id)
        const userPreRaw = priorRegistrationCandidates.filter((c) => c.consultant_id === user.id)
        const userPre = userPreRaw.filter((c) => !priorProgressExcludedStatuses.has(c.status))
        return {
          current: {
            userId: user.id,
            userName: user.name,
            totalCount: userPeriod.length,
            firstContactCount: firstContactCountFor(userPeriod),
            interviewCount: currentInterviewCounts.get(user.id) ?? 0,
            closedCount: currentClosedCounts.get(user.id) ?? 0,
          } satisfies SalesProgressRow,
          prior: {
            userId: user.id,
            userName: user.name,
            totalCount: userPre.length,
            firstContactCount: firstContactCountFor(userPre),
            interviewCount: priorInterviewCounts.get(user.id) ?? 0,
            closedCount: priorClosedCounts.get(user.id) ?? 0,
          } satisfies SalesProgressRow,
        }
      })

    const filterCurrent = (p: SalesProgressRow) =>
      p.totalCount > 0 ||
      periodActiveUserIds.has(p.userId) ||
      candidates.some((c) => c.consultant_id === p.userId)

    const filterPrior = (p: SalesProgressRow) =>
      p.totalCount > 0 ||
      p.interviewCount > 0 ||
      p.closedCount > 0 ||
      priorPeriodActiveUserIds.has(p.userId) ||
      candidates.some(
        (c) =>
          c.consultant_id === p.userId &&
          !!c.registered_at &&
          new Date(c.registered_at) >= priorPeriodDates.startDate &&
          new Date(c.registered_at) <= priorPeriodDates.endDate
      )

    const salesProgressCurrent = base
      .map((x) => x.current)
      .filter(filterCurrent)
      .sort((a, b) => b.totalCount - a.totalCount)

    const salesProgressPrior = base
      .map((x) => x.prior)
      .filter(filterPrior)
      .sort((a, b) => b.totalCount - a.totalCount)

    return { salesProgressCurrent, salesProgressPrior }
  }, [
    loading,
    users,
    periodCandidates,
    priorRegistrationCandidates,
    candidates,
    interviewedCandidateIdsAnytime,
    closedStatusCandidateIds,
    candidateById,
    periodCandidateIdSet,
    priorRegistrationCandidateIdSet,
    isUserActiveInPeriod,
    periodActiveUserIds,
    priorPeriodActiveUserIds,
    priorPeriodDates,
  ])

  /** 面接状況・売上数字などの行順（当月表・前月以前表の和集合） */
  const dashboardConsultantOrder = useMemo(() => {
    const ids = new Set<string>()
    salesProgressCurrent.forEach((p) => ids.add(p.userId))
    salesProgressPrior.forEach((p) => ids.add(p.userId))
    return Array.from(ids).sort((a, b) => {
      const ca = salesProgressCurrent.find((p) => p.userId === a)?.totalCount ?? 0
      const cb = salesProgressCurrent.find((p) => p.userId === b)?.totalCount ?? 0
      if (cb !== ca) return cb - ca
      const pa = salesProgressPrior.find((p) => p.userId === a)?.totalCount ?? 0
      const pb = salesProgressPrior.find((p) => p.userId === b)?.totalCount ?? 0
      return pb - pa
    })
  }, [salesProgressCurrent, salesProgressPrior])

  const totalProgressCurrent = useMemo(
    () =>
      salesProgressCurrent.reduce<ProgressTotals>(
        (acc, progress) => ({
          totalCount: acc.totalCount + progress.totalCount,
          firstContactCount: acc.firstContactCount + progress.firstContactCount,
          interviewCount: acc.interviewCount + progress.interviewCount,
          closedCount: acc.closedCount + progress.closedCount,
        }),
        { totalCount: 0, firstContactCount: 0, interviewCount: 0, closedCount: 0 }
      ),
    [salesProgressCurrent]
  )

  const totalProgressPrior = useMemo(
    () =>
      salesProgressPrior.reduce<ProgressTotals>(
        (acc, progress) => ({
          totalCount: acc.totalCount + progress.totalCount,
          firstContactCount: acc.firstContactCount + progress.firstContactCount,
          interviewCount: acc.interviewCount + progress.interviewCount,
          closedCount: acc.closedCount + progress.closedCount,
        }),
        { totalCount: 0, firstContactCount: 0, interviewCount: 0, closedCount: 0 }
      ),
    [salesProgressPrior]
  )

  // 目標数値カード・成約単価: 当月登録ベースで算出
  const totalFirstContactRate =
    totalProgressCurrent.totalCount > 0
      ? (totalProgressCurrent.firstContactCount / totalProgressCurrent.totalCount) * 100
      : 0
  const totalInterviewRate =
    totalProgressCurrent.firstContactCount > 0
      ? (totalProgressCurrent.interviewCount / totalProgressCurrent.firstContactCount) * 100
      : 0
  const totalClosedRate =
    totalProgressCurrent.interviewCount > 0
      ? (totalProgressCurrent.closedCount / totalProgressCurrent.interviewCount) * 100
      : 0

  const actualRevenuePerClosed =
    totalProgressCurrent.closedCount > 0
      ? periodTotalSales / totalProgressCurrent.closedCount
      : 0

  // 担当者別「面接→成約」サマリー（登録月コホート非依存で、選択月の実績のみを集計）
  const interviewClosedSummaryOrder = useMemo(
    () => ['吉田', '小畦', '西田', '瀧澤', '鈴木', '戸部', '後藤', '石井'],
    []
  )

  // 担当者別 面接・成約サマリー用:
  // 1) ステータス変遷日を優先 2) 変遷がない場合のみ面接追加日で補完（いずれも初回のみ）
  const periodInterviewPriorityCandidateIds = useMemo(() => {
    const candidateIds = new Set<string>()
    const previouslyInterviewedIds = new Set<string>()
    const statusBasedCandidateIdsInPeriod = new Set<string>()
    const { startDate, endDate } = periodDates

    const projectById = new Map(projects.map((p) => [p.id, p]))
    const INTERVIEW_SET_STATUSES = new Set<string>([
      '面接確定済',
      '面接実施済（結果待ち）',
      '内定獲得（承諾確認中）',
      '内定承諾（成約）',
      '内定辞退',
    ])
    const INTERVIEW_CONFIRMED_STATUSES = new Set<string>(['面接確定済', '面接実施済（結果待ち）'])

    // 期間開始前に面接フェーズ到達済み or 面接追加済みなら「初回済み」とみなす
    statusHistory.forEach((h) => {
      if (!h.changed_at || !INTERVIEW_SET_STATUSES.has(h.new_status)) return
      if (new Date(h.changed_at) < startDate) {
        previouslyInterviewedIds.add(h.candidate_id)
      }
    })
    interviews.forEach((iv) => {
      if (!iv.created_at || iv.is_voided) return
      if (new Date(iv.created_at) >= startDate) return
      const project = projectById.get(iv.project_id)
      if (!project?.candidate_id) return
      previouslyInterviewedIds.add(project.candidate_id)
    })

    // まずステータス変遷ベースでカウント（優先）
    statusHistory.forEach((h) => {
      if (!h.changed_at || !INTERVIEW_CONFIRMED_STATUSES.has(h.new_status)) return
      const changedDate = new Date(h.changed_at)
      if (changedDate < startDate || changedDate > endDate) return
      statusBasedCandidateIdsInPeriod.add(h.candidate_id)
      if (previouslyInterviewedIds.has(h.candidate_id)) return

      const candidateProjects = projects.filter((p) => p.candidate_id === h.candidate_id)
      const periodInterviewsForCandidate = candidateProjects.flatMap((project) =>
        interviews.filter((i) => {
          if (!i.start_at) return false
          const t = new Date(i.start_at)
          return i.project_id === project.id && t >= startDate && t <= endDate
        })
      )
      const allVoided =
        periodInterviewsForCandidate.length > 0 &&
        periodInterviewsForCandidate.every((iv) => iv.is_voided === true)
      if (!allVoided) {
        candidateIds.add(h.candidate_id)
      }
    })

    // ステータス変遷がない候補者のみ、面接追加日（created_at）で補完
    interviews.forEach((iv) => {
      if (!iv.created_at || iv.is_voided) return
      const createdDate = new Date(iv.created_at)
      if (createdDate < startDate || createdDate > endDate) return
      const project = projectById.get(iv.project_id)
      if (!project?.candidate_id) return
      if (previouslyInterviewedIds.has(project.candidate_id)) return
      if (statusBasedCandidateIdsInPeriod.has(project.candidate_id)) return
      candidateIds.add(project.candidate_id)
    })

    return candidateIds
  }, [periodDates, statusHistory, projects, interviews])

  const interviewClosedSummary = useMemo(() => {
    const interviewCounts = new Map<string, number>()
    for (const candidateId of periodInterviewPriorityCandidateIds) {
      const c = candidateById.get(candidateId)
      if (!c?.consultant_id) continue
      interviewCounts.set(c.consultant_id, (interviewCounts.get(c.consultant_id) ?? 0) + 1)
    }

    const closedCounts = new Map<string, number>()
    for (const candidateId of periodClosedStatusCandidateIds) {
      const c = candidateById.get(candidateId)
      if (!c?.consultant_id) continue
      closedCounts.set(c.consultant_id, (closedCounts.get(c.consultant_id) ?? 0) + 1)
    }

    const closedAmounts = new Map<string, number>()
    for (const contract of periodContracts) {
      const c = candidateById.get(contract.candidate_id)
      if (!c?.consultant_id) continue
      closedAmounts.set(
        c.consultant_id,
        (closedAmounts.get(c.consultant_id) ?? 0) + (contract.revenue_excluding_tax ?? 0)
      )
    }

    return users
      .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
      .map((u) => {
        const interviewCount = interviewCounts.get(u.id) ?? 0
        const closedCount = closedCounts.get(u.id) ?? 0
        return {
          userId: u.id,
          userName: u.name,
          interviewCount,
          closedCount,
          closedRate: interviewCount > 0 ? (closedCount / interviewCount) * 100 : 0,
          closedAmount: closedAmounts.get(u.id) ?? 0,
        }
      })
      .sort((a, b) => {
        const indexA = interviewClosedSummaryOrder.indexOf(a.userName)
        const indexB = interviewClosedSummaryOrder.indexOf(b.userName)
        const rankA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA
        const rankB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB

        if (rankA !== rankB) return rankA - rankB
        return a.userName.localeCompare(b.userName, 'ja')
      })
  }, [
    users,
    isUserActiveInPeriod,
    periodInterviewPriorityCandidateIds,
    periodClosedStatusCandidateIds,
    candidateById,
    interviewClosedSummaryOrder,
    periodContracts,
  ])

  const interviewClosedChartData = useMemo(() => {
    return interviewClosedSummary.map((row) => ({
      ...row,
    }))
  }, [interviewClosedSummary])

  // 2課の売上実績集計
  const team2Sales = useMemo(() => {
    return mockMemberStats
      .filter((stats) => TEAM2_USER_IDS.includes(stats.userId as (typeof TEAM2_USER_IDS)[number]))
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

  // 選択中の翌暦月の month_text（YYYY_MM）。m は YYYY-MM の暦月 1–12 を Date の第2引数に渡すと翌月の月初になる
  const nextMonthText = useMemo(() => {
    const [y, m] = selectedYearMonth.split('-').map(Number)
    const d = new Date(y, m, 1)
    return `${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [selectedYearMonth])

  // 実データからメンバーごとのヨミ金額を計算（当月）
  const memberYomiStats = useMemo(() => {
    const stats: Record<string, { yomiA: number; yomiB: number; yomiC: number; yomiD: number }> = {}
    const currentMonthText = getMonthText()

    users
      .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
      .forEach((user) => {
        // このユーザーの担当求職者に紐づく案件からヨミ金額を集計
        const userCandidates = candidates.filter((c) => c.consultant_id === user.id)
        const userCandidateIds = new Set(userCandidates.map((c) => c.id))
        
        // 当月のヨミのみ（probability_monthがcurrentまたは未設定、かつ month_text が当月または未設定）
        const userProjects = projects.filter((p) =>
          userCandidateIds.has(p.candidate_id) &&
          (p.probability_month === 'current' || !p.probability_month) &&
          (p.month_text === currentMonthText || !p.month_text)
        )

        // 求職者ごとに最新1案件に絞る（重複計上防止）
        const deduped = dedupeByCandidate(userProjects)
        
        stats[user.id] = {
          yomiA: deduped
            .filter((p) => p.probability === 'A' && p.expected_amount)
            .reduce((sum, p) => sum + (p.expected_amount || 0), 0),
          yomiB: deduped
            .filter((p) => p.probability === 'B' && p.expected_amount)
            .reduce((sum, p) => sum + (p.expected_amount || 0), 0),
          yomiC: deduped
            .filter((p) => p.probability === 'C' && p.expected_amount)
            .reduce((sum, p) => sum + (p.expected_amount || 0), 0),
          yomiD: 0, // Dヨミは現状DBに存在しないため0
        }
      })
    
    return stats
  }, [users, candidates, projects, getMonthText, isUserActiveInPeriod])

  // 実データからメンバーごとのヨミ金額を計算（翌月）
  const memberYomiStatsNext = useMemo(() => {
    const stats: Record<string, { yomiA: number; yomiB: number; yomiC: number; yomiD: number }> = {}
    
    users
      .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
      .forEach((user) => {
        // このユーザーの担当求職者に紐づく案件からヨミ金額を集計
        const userCandidates = candidates.filter((c) => c.consultant_id === user.id)
        const userCandidateIds = new Set(userCandidates.map((c) => c.id))
        
        // 翌月のヨミのみ（probability_monthがnext、かつ month_text が翌月または未設定）
        const userProjects = projects.filter((p) =>
          userCandidateIds.has(p.candidate_id) &&
          p.probability_month === 'next' &&
          (p.month_text === nextMonthText || !p.month_text)
        )

        // 求職者ごとに最新1案件に絞る（重複計上防止）
        const deduped = dedupeByCandidate(userProjects)
        
        stats[user.id] = {
          yomiA: deduped
            .filter((p) => p.probability === 'A' && p.expected_amount)
            .reduce((sum, p) => sum + (p.expected_amount || 0), 0),
          yomiB: deduped
            .filter((p) => p.probability === 'B' && p.expected_amount)
            .reduce((sum, p) => sum + (p.expected_amount || 0), 0),
          yomiC: deduped
            .filter((p) => p.probability === 'C' && p.expected_amount)
            .reduce((sum, p) => sum + (p.expected_amount || 0), 0),
          yomiD: 0, // Dヨミは現状DBに存在しないため0
        }
      })
    
    return stats
  }, [users, candidates, projects, nextMonthText, isUserActiveInPeriod])

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
  }, [users, memberYomiStats, isUserActiveInPeriod])

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
  }, [users, memberYomiStatsNext, isUserActiveInPeriod])

  // 転換率の表示用フォーマット
  const formatRate = (rate: number) => {
    if (isNaN(rate) || !isFinite(rate)) return '-'
    return `${rate.toFixed(0)}%`
  }

  // 金額の表示用フォーマット
  const formatAmount = (amount: number) => {
    return `¥${(amount / 10000).toFixed(0)}万`
  }

  // 面接詳細モーダルを開く（cohort: 当月登録 / 前月以前登録で候補者を絞り込む）
  const handleOpenInterviewModal = useCallback((userId: string, cohort: 'current' | 'prior') => {
    setSelectedUserId(userId)
    setSelectedInterviewCohort(cohort)

    const sourceIds = interviewedCandidateIdsAnytime

    const inCohort = (candidateId: string) =>
      cohort === 'current'
        ? periodCandidateIdSet.has(candidateId)
        : priorRegistrationCandidateIdSet.has(candidateId)

    const userCandidateIds = Array.from(sourceIds).filter((candidateId) => {
      const candidate = candidateById.get(candidateId)
      if (candidate?.consultant_id !== userId) return false
      return inCohort(candidateId)
    })
    
    // 候補者ごとに面接情報を集める
    const modalData = userCandidateIds.map(candidateId => {
      const candidate = candidates.find(c => c.id === candidateId)
      if (!candidate) return null
      
      // この候補者の案件を取得
      const candidateProjects = projects.filter(p => p.candidate_id === candidateId)
      
      // この候補者の面接を取得（日時不問）
      const candidateInterviews = candidateProjects.flatMap(project => 
        interviews.filter(i => 
          i.project_id === project.id &&
          !i.is_voided
        )
      )
      
      // 最新の面接を取得
      const latestInterview = candidateInterviews.sort((a, b) => 
        new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
      )[0]
      
      return {
        candidateId: candidate.id,
        candidateName: candidate.name,
        interviewDate: latestInterview?.start_at || null,
        status: candidate.status,
        hasInterview: !!latestInterview,
        interviewId: latestInterview?.id,
        projectId: candidateProjects[0]?.id
      }
    }).filter((item): item is NonNullable<typeof item> => item !== null)
    
    setInterviewModalData(modalData)
    setInterviewModalOpen(true)
  }, [
    interviewedCandidateIdsAnytime,
    candidateById,
    candidates,
    projects,
    interviews,
    periodCandidateIdSet,
    priorRegistrationCandidateIdSet,
  ])

  // 成約詳細モーダルを開く
  const handleOpenClosedModal = useCallback((userId: string, cohort: 'current' | 'prior') => {
    setClosedModalUserId(userId)

    const inCohort = (candidateId: string) =>
      cohort === 'current'
        ? periodCandidateIdSet.has(candidateId)
        : priorRegistrationCandidateIdSet.has(candidateId)

    const userCandidateIds = Array.from(closedStatusCandidateIds).filter((candidateId) => {
      const candidate = candidateById.get(candidateId)
      if (candidate?.consultant_id !== userId) return false
      return inCohort(candidateId)
    })

    const modalData = userCandidateIds.map(candidateId => {
      const candidate = candidates.find(c => c.id === candidateId)
      if (!candidate) return null

      const contract = contracts.find(c => c.candidate_id === candidateId)

      // status_history から成約日を取得
      const closedHistory = statusHistory
        .filter(h => h.candidate_id === candidateId && h.new_status === '内定承諾（成約）' && h.changed_at)
        .sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())[0]

      return {
        candidateId: candidate.id,
        candidateName: candidate.name,
        acceptedDate: contract?.accepted_date ?? null,
        closedAt: closedHistory?.changed_at ?? null,
        revenueExcludingTax: contract?.revenue_excluding_tax ?? null,
        placementName: contract?.placement_facility_name ?? contract?.placement_company_name ?? contract?.placement_company ?? null,
        status: candidate.status,
      }
    }).filter((item): item is NonNullable<typeof item> => item !== null)

    setClosedModalData(modalData)
    setClosedModalOpen(true)
  }, [
    closedStatusCandidateIds,
    candidateById,
    candidates,
    contracts,
    statusHistory,
    periodCandidateIdSet,
    priorRegistrationCandidateIdSet,
  ])

  // ヨミ内訳モーダルを開く（当月 / 翌月 × A/B/C）
  // memberYomiStats / memberYomiStatsNext と同じ手順にすること：
  // 「確度で先に絞ってから dedupe」だと、別案件がより新しい A/C のとき古い B がモーダルだけ残り表と不一致になる。
  const handleOpenYomiModal = useCallback(
    (userId: string, rank: 'A' | 'B' | 'C', isCurrent: boolean) => {
      const currentMonthText = getMonthText()
      const userCandidates = candidates.filter((c) => c.consultant_id === userId)
      const userCandidateIds = new Set(userCandidates.map((c) => c.id))

      const monthMatched = projects.filter((p) => {
        if (!userCandidateIds.has(p.candidate_id)) return false
        if (isCurrent) {
          return (
            (p.probability_month === 'current' || !p.probability_month) &&
            (p.month_text === currentMonthText || !p.month_text)
          )
        }
        return (
          p.probability_month === 'next' &&
          (p.month_text === nextMonthText || !p.month_text)
        )
      })

      // テーブル集計と同じく、確度を問わず求職者ごとに最新1件だけ残してからランクで絞る
      const deduped = dedupeByCandidate(monthMatched)

      const items: YomiModalItem[] = deduped
        .filter((p) => p.probability === rank && p.expected_amount)
        .map((p) => {
          const candidate = candidates.find((c) => c.id === p.candidate_id)
          return {
            candidateId: p.candidate_id,
            candidateName: candidate?.name ?? '（不明）',
            candidateStatus: candidate?.status ?? '',
            projectId: p.id,
            clientName: p.client_name ?? '',
            expectedAmount: p.expected_amount ?? 0,
            probability: rank,
          }
        })

      const user = users.find((u) => u.id === userId)
      const rankLabel = { A: 'Aヨミ(80%)', B: 'Bヨミ(50%)', C: 'Cヨミ(30%)' }[rank]
      const monthLabel = isCurrent ? '当月' : '翌月'
      setYomiModalTitle(`${user?.name ?? ''} / ${monthLabel} ${rankLabel} 内訳`)
      setYomiModalData(items)
      setYomiModalOpen(true)
    },
    [candidates, projects, users, getMonthText, nextMonthText]
  )

  // 面接フラグを削除（面接レコードあり・なし両対応）
  const handleVoidInterview = useCallback(async (
    candidateName: string,
    candidateId: string,
    interviewId?: string,
    projectId?: string,
  ) => {
    if (!confirm(`${candidateName}さんの面接フラグを削除（件数から除外）しますか？\n\n候補者ステータスは「提案求人選定中」へ戻ります。`)) {
      return
    }
    
    const key = interviewId ?? candidateId
    setVoidingKey(key)
    
    try {
      if (interviewId) {
        // 面接レコードがある場合：既存レコードを無効化（APIが候補者ステータスも更新）
        const response = await fetch(`/api/interviews/${interviewId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            is_voided: true,
            void_reason: '面接設定件数から除外（ダッシュボードから削除）'
          })
        })
        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}))
          throw new Error(errBody?.error ?? '面接フラグ削除に失敗しました')
        }
      } else {
        // 面接レコードがない場合：ダミーの無効化面接を作成 ＋ 候補者ステータスを更新
        const now = new Date().toISOString()
        if (projectId) {
          const createRes = await fetch('/api/interviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: projectId,
              start_at: now,
              status: '実施済',
              is_voided: true,
              void_reason: '面接設定件数から除外（面接未登録・ダッシュボードから削除）'
            })
          })
          if (!createRes.ok) {
            const errBody = await createRes.json().catch(() => ({}))
            throw new Error(errBody?.error ?? '面接フラグ作成に失敗しました')
          }
        }
        // 候補者ステータスを「提案求人選定中」へ戻す
        const candidateRes = await fetch(`/api/candidates/${candidateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: '提案求人選定中' })
        })
        if (!candidateRes.ok) throw new Error('候補者ステータス更新に失敗しました')
      }
      
      // モーダルからその候補者を即時除去（モーダルは閉じない）
      setInterviewModalData(prev => prev.filter(item => item.candidateId !== candidateId))
      
      // バックグラウンドでデータを再取得（ダッシュボードの件数を更新）
      const [candidatesData, projectsData, interviewsData, statusHistoryData, memosData] = await Promise.all([
        getCandidates(),
        getProjects(),
        getInterviews(),
        getStatusHistory(),
        getMemos(),
      ])
      setCandidates(candidatesData)
      setProjects(projectsData)
      setInterviews(interviewsData)
      setStatusHistory(statusHistoryData)
      setMemos(memosData)
      
    } catch (error) {
      console.error('Error voiding interview:', error)
      alert(`面接フラグの削除に失敗しました。\n${error instanceof Error ? error.message : ''}`)
    } finally {
      setVoidingKey(null)
    }
  }, [])

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
        {/* 集計期間: 年月で選択 */}
        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <CalendarDays className="w-5 h-5 text-violet-500" />
            <span className="font-medium">集計期間:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedYearMonth.split('-')[0]}
              onChange={(e) => {
                const y = e.target.value
                const m = selectedYearMonth.split('-')[1]
                setSelectedYearMonth(`${y}-${m}`)
              }}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 3 + i).map((y) => (
                <option key={y} value={String(y)}>{y}年</option>
              ))}
            </select>
            <select
              value={selectedYearMonth.split('-')[1]}
              onChange={(e) => {
                const y = selectedYearMonth.split('-')[0]
                const m = e.target.value
                setSelectedYearMonth(`${y}-${m}`)
              }}
              className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m).padStart(2, '0')}>{m}月</option>
              ))}
            </select>
            <Button
              variant={selectedYearMonth === getCurrentYearMonth() ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedYearMonth(getCurrentYearMonth())}
              className={selectedYearMonth === getCurrentYearMonth()
                ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'}
            >
              今月
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date()
                const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                setSelectedYearMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`)
              }}
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              先月
            </Button>
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
              目標数値と実績
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
                      {totalProgressCurrent.totalCount > 0 ? totalFirstContactRate.toFixed(1) : '-'}%
                    </p>
                    <p className="text-sm text-slate-500 mb-1">実績</p>
                  </div>
                  <p className="text-lg text-slate-500 mt-1">
                    {totalProgressCurrent.totalCount > 0
                      ? `${totalProgressCurrent.firstContactCount}件 / ${totalProgressCurrent.totalCount}件`
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
                      {totalProgressCurrent.firstContactCount > 0 ? totalInterviewRate.toFixed(1) : '-'}%
                    </p>
                    <p className="text-sm text-slate-500 mb-1">実績</p>
                  </div>
                  <p className="text-lg text-slate-500 mt-1">
                    {totalProgressCurrent.firstContactCount > 0
                      ? `${totalProgressCurrent.interviewCount}件 / ${totalProgressCurrent.firstContactCount}件`
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
                      {totalProgressCurrent.interviewCount > 0 ? totalClosedRate.toFixed(1) : '-'}%
                    </p>
                    <p className="text-sm text-slate-500 mb-1">実績</p>
                  </div>
                  <p className="text-lg text-slate-500 mt-1">
                    {totalProgressCurrent.interviewCount > 0
                      ? `${totalProgressCurrent.closedCount}件 / ${totalProgressCurrent.interviewCount}件`
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
                      {totalProgressCurrent.closedCount > 0
                        ? `¥${(actualRevenuePerClosed / 10000).toFixed(0)}万`
                        : '-'}
                    </p>
                    <p className="text-sm text-slate-500 mb-1">実績</p>
                  </div>
                  <p className="text-lg text-slate-500 mt-1">
                    {totalProgressCurrent.closedCount > 0
                      ? `${totalProgressCurrent.closedCount}件`
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 担当者別 面接→成約サマリー */}
        <Card className="bg-white border-slate-200 shadow-sm mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-violet-500" />
              担当者別 面接・成約サマリー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 mb-3">
              {getPeriodLabel()}の集計。各担当者の面接実績と成約件数を一目で確認できます。
            </p>
            {interviewClosedChartData.length === 0 ? (
              <div className="text-center text-slate-500 py-8">該当データがありません</div>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={interviewClosedChartData}
                    margin={{ top: 20, right: 16, left: 0, bottom: 48 }}
                    barCategoryGap="45%"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="userName"
                      tick={(props) => {
                        const { x, y, payload } = props
                        const row = interviewClosedChartData.find((r) => r.userName === payload.value)
                        const amount = row?.closedAmount ?? 0
                        const amountLabel = amount > 0
                          ? `${Math.round(amount / 10000)}万円`
                          : '0円'
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={0} y={0} dy={14} textAnchor="middle" fill="#475569" fontSize={12}>
                              {payload.value}
                            </text>
                            <text x={0} y={0} dy={30} textAnchor="middle" fill="#059669" fontSize={11} fontWeight={600}>
                              {amountLabel}
                            </text>
                          </g>
                        )
                      }}
                      height={56}
                    />
                    <YAxis allowDecimals={false} domain={[0, 12]} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value}件`,
                        name === 'interviewCount'
                          ? '面接実績'
                          : '成約',
                      ]}
                      labelFormatter={(label) => {
                        const row = interviewClosedChartData.find((r) => r.userName === label)
                        const rate = row ? `${row.closedRate.toFixed(1)}%` : '-'
                        const amount = row?.closedAmount ?? 0
                        const amountLabel = amount > 0 ? `${Math.round(amount / 10000)}万円` : '0円'
                        return `${label}（成約率: ${rate}・${amountLabel}）`
                      }}
                    />
                    <Legend
                      formatter={(value) => {
                        if (value === 'interviewCount') return '面接実績'
                        if (value === 'closedCount') return '成約'
                        return value
                      }}
                    />
                    <Bar dataKey="interviewCount" fill="#fb923c" radius={[4, 4, 0, 0]} barSize={12}>
                      <LabelList
                        dataKey="interviewCount"
                        position="top"
                        formatter={(label) => {
                          const n = typeof label === 'number' ? label : Number(label)
                          return Number.isFinite(n) && n > 0 ? `${n}件` : ''
                        }}
                        style={{ fontSize: 11, fill: '#92400e' }}
                      />
                    </Bar>
                    <Bar dataKey="closedCount" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={12}>
                      <LabelList
                        dataKey="closedCount"
                        position="top"
                        formatter={(label) => {
                          const n = typeof label === 'number' ? label : Number(label)
                          return Number.isFinite(n) && n > 0 ? `${n}件` : ''
                        }}
                        style={{ fontSize: 11, fill: '#991b1b' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
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
              <SalesProgressMetricsTable
                title="当月登録ベース"
                description={`${getPeriodLabel()}に登録した求職者を母集団とし、面接・成約ともに日時を問わず母集団内の実績件数を表示します。`}
                rows={salesProgressCurrent}
                totals={totalProgressCurrent}
                kpiTargetRates={targetRates}
                formatRate={formatRate}
                cohort="current"
                onOpenInterview={handleOpenInterviewModal}
                onOpenClosed={handleOpenClosedModal}
              />
              <div className="mb-6 p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">前月以前登録ベースの集計月:</span>
                <select
                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
                  value={selectedPriorYearMonth}
                  onChange={(e) => setSelectedPriorYearMonth(e.target.value)}
                  disabled={priorRegistrationOptions.length === 0}
                >
                  {priorRegistrationOptions.length === 0 ? (
                    <option value={selectedPriorYearMonth}>選択可能な過去月がありません</option>
                  ) : (
                    priorRegistrationOptions.map((ym) => (
                      <option key={ym} value={ym}>
                        {formatYearMonthLabel(ym)}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <SalesProgressMetricsTable
                title="前月以前登録ベース"
                description={`${formatYearMonthLabel(selectedPriorYearMonth)}に登録した求職者を母集団とし、面接・成約ともに日時を問わず母集団内の実績件数を表示します。`}
                rows={salesProgressPrior}
                totals={totalProgressPrior}
                kpiTargetRates={targetRates}
                formatRate={formatRate}
                cohort="prior"
                onOpenInterview={handleOpenInterviewModal}
                onOpenClosed={handleOpenClosedModal}
              />
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
                  {dashboardConsultantOrder.map((userId) => {
                    // CRM データ（DB）から面接状況を取得（candidate.status ベースで面接一覧と統一）
                    const user = users.find((u) => u.id === userId)
                    const cases = getStatusCases[userId] || {
                      adjusting: [],
                      scheduled: [],
                      completed: [],
                      offer: [],
                    }

                    return (
                      <TableRow key={userId} className="hover:bg-slate-50">
                        <TableCell className="font-medium text-slate-800">
                          {user?.name ?? '-'}
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
                  {dashboardConsultantOrder.map((userId) => {
                      const progress = salesProgressCurrent.find((p) => p.userId === userId)
                      const user = users.find((u) => u.id === userId)
                      // 期間内の成約金額を計算
                      const periodSales = periodContracts
                        .filter((c) => {
                          const candidate = candidates.find((ca) => ca.id === c.candidate_id)
                          return candidate && candidate.consultant_id === userId
                        })
                        .reduce((sum, c) => sum + (c.revenue_excluding_tax || 0), 0)
                      
                      // 個人別月次目標から予算と面接設定目標を取得（DBから取得）
                      const userTarget = userTargets[userId]
                      const budget = userTarget?.sales_budget || 0
                      const meetingTarget = userTarget?.interview_target || 0
                      
                      // フォールバック: DBにデータがない場合はmockデータを使用
                      const stats = mockMemberStats.find((s) => s.userId === userId)
                      const finalBudget = budget > 0 ? budget : (stats?.budget || 0)
                      const finalMeetingTarget = meetingTarget > 0 ? meetingTarget : (stats?.meetingTarget || 0)
                      
                      const budgetRate = finalBudget > 0 ? (periodSales / finalBudget) * 100 : 0
                      const interviewCountForTarget = progress?.interviewCount ?? 0
                      const meetingRate = finalMeetingTarget > 0
                        ? (interviewCountForTarget / finalMeetingTarget) * 100
                        : 0

                      return (
                        <TableRow key={userId} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-800">
                            {user?.name || '-'}
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
                          <TableCell className="text-center">{interviewCountForTarget}</TableCell>
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
                      const progress = salesProgressCurrent.find((p) => p.userId === user.id)
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
                            {stats.yomiA > 0 ? (
                              <button
                                type="button"
                                className="text-violet-700 font-semibold hover:underline cursor-pointer"
                                onClick={() => handleOpenYomiModal(user.id, 'A', true)}
                              >
                                {formatAmount(stats.yomiA)}
                              </button>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right bg-orange-50">
                            {stats.yomiB > 0 ? (
                              <button
                                type="button"
                                className="text-violet-700 font-semibold hover:underline cursor-pointer"
                                onClick={() => handleOpenYomiModal(user.id, 'B', true)}
                              >
                                {formatAmount(stats.yomiB)}
                              </button>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right bg-yellow-50">
                            {stats.yomiC > 0 ? (
                              <button
                                type="button"
                                className="text-violet-700 font-semibold hover:underline cursor-pointer"
                                onClick={() => handleOpenYomiModal(user.id, 'C', true)}
                              >
                                {formatAmount(stats.yomiC)}
                              </button>
                            ) : (
                              '-'
                            )}
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
                      const progress = salesProgressCurrent.find((p) => p.userId === user.id)
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
                            {yomiStats.yomiA > 0 ? (
                              <button
                                type="button"
                                className="text-violet-700 font-semibold hover:underline cursor-pointer"
                                onClick={() => handleOpenYomiModal(user.id, 'A', false)}
                              >
                                {formatAmount(yomiStats.yomiA)}
                              </button>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right bg-orange-50">
                            {yomiStats.yomiB > 0 ? (
                              <button
                                type="button"
                                className="text-violet-700 font-semibold hover:underline cursor-pointer"
                                onClick={() => handleOpenYomiModal(user.id, 'B', false)}
                              >
                                {formatAmount(yomiStats.yomiB)}
                              </button>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right bg-yellow-50">
                            {yomiStats.yomiC > 0 ? (
                              <button
                                type="button"
                                className="text-violet-700 font-semibold hover:underline cursor-pointer"
                                onClick={() => handleOpenYomiModal(user.id, 'C', false)}
                              >
                                {formatAmount(yomiStats.yomiC)}
                              </button>
                            ) : (
                              '-'
                            )}
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

      {/* 面接詳細モーダル */}
      <Dialog open={interviewModalOpen} onOpenChange={setInterviewModalOpen}>
        <DialogContent className="sm:max-w-[780px] w-[92vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedUserId && users.find(u => u.id === selectedUserId)?.name}さんの面接設定一覧
            </DialogTitle>
            <DialogDescription>
              期間: {selectedInterviewCohort === 'current' ? getPeriodLabel() : `${formatYearMonthLabel(selectedPriorYearMonth)}登録母集団（日時不問）`} | 合計 {interviewModalData.length}件
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            {interviewModalData.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                対象期間に面接設定された候補者はいません
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">候補者名</TableHead>
                    <TableHead className="min-w-[120px]">ステータス</TableHead>
                    <TableHead className="min-w-[160px]">面接日時</TableHead>
                    <TableHead className="text-center min-w-[130px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interviewModalData.map((item) => (
                    <TableRow key={item.candidateId}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/candidates/${item.candidateId}`}
                          className="text-violet-600 hover:text-violet-800 hover:underline"
                        >
                          {item.candidateName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {item.interviewDate ? (
                          <span className="text-sm">
                            {new Date(item.interviewDate).toLocaleString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-sm">（面接未登録）</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => handleVoidInterview(
                            item.candidateName,
                            item.candidateId,
                            item.interviewId,
                            item.projectId,
                          )}
                          disabled={voidingKey === (item.interviewId ?? item.candidateId)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          {voidingKey === (item.interviewId ?? item.candidateId) ? '処理中...' : '面接フラグ削除'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">
              <p className="font-medium mb-1">💡 面接フラグ削除について</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>面接フラグを削除すると、面接設定件数から除外されます</li>
                <li>候補者ステータスは「提案求人選定中」へ戻ります</li>
                <li>面接レコードは履歴として残ります（削除されません）</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 成約詳細モーダル */}
      <Dialog open={closedModalOpen} onOpenChange={setClosedModalOpen}>
        <DialogContent className="sm:max-w-[720px] w-[92vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {closedModalUserId && users.find(u => u.id === closedModalUserId)?.name}さんの成約一覧
            </DialogTitle>
            <DialogDescription>
              期間: {getPeriodLabel()} | 合計 {closedModalData.length}件
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {closedModalData.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                対象期間に成約した候補者はいません
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">候補者名</TableHead>
                    <TableHead className="min-w-[120px]">ステータス</TableHead>
                    <TableHead className="min-w-[110px]">承諾日</TableHead>
                    <TableHead className="min-w-[140px]">入職先</TableHead>
                    <TableHead className="text-right min-w-[100px]">売上（税抜）</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closedModalData.map((item) => (
                    <TableRow key={item.candidateId}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/candidates/${item.candidateId}`}
                          className="text-violet-600 hover:text-violet-800 hover:underline"
                        >
                          {item.candidateName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.acceptedDate
                          ? new Date(item.acceptedDate).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
                          : item.closedAt
                            ? new Date(item.closedAt).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
                            : <span className="text-slate-400">-</span>
                        }
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.placementName ?? <span className="text-slate-400">-</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.revenueExcludingTax != null
                          ? `¥${(item.revenueExcludingTax / 10000).toFixed(0)}万`
                          : <span className="text-slate-400">-</span>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ヨミ内訳モーダル */}
      <Dialog open={yomiModalOpen} onOpenChange={setYomiModalOpen}>
        <DialogContent className="sm:max-w-[640px] w-[92vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{yomiModalTitle}</DialogTitle>
            <DialogDescription>合計 {yomiModalData.length}件</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {yomiModalData.length === 0 ? (
              <div className="text-center py-8 text-slate-500">対象案件はありません</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[100px]">候補者名</TableHead>
                    <TableHead className="min-w-[120px]">ステータス</TableHead>
                    <TableHead className="min-w-[140px]">応募先</TableHead>
                    <TableHead className="text-right min-w-[90px]">金額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yomiModalData.map((item) => (
                    <TableRow key={item.projectId}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/candidates/${item.candidateId}`}
                          className="text-violet-600 hover:text-violet-800 hover:underline"
                          onClick={() => setYomiModalOpen(false)}
                        >
                          {item.candidateName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.candidateStatus || '-'}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 text-sm">
                        {item.clientName || '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatAmount(item.expectedAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

'use client'

import { useState, useEffect, useMemo } from 'react'
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
} from 'lucide-react'
import {
  mockMemberStats,
  mockUsers,
  mockCandidates,
  mockProjects,
  mockInterviews,
  targetRates,
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

  useEffect(() => {
    async function fetchData() {
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
        // エラー時は空配列を設定
        setCandidates([])
        setProjects([])
        setContracts([])
        setInterviews([])
        setUsers([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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

  // 期間内に面接を設定した数（created_atで判定）
  const periodInterviews = useMemo(() => {
    const { startDate, endDate } = getPeriodDates
    return interviews.filter(i => {
      if (!i.created_at) return false
      const createdDate = new Date(i.created_at)
      return createdDate >= startDate && createdDate <= endDate
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

        const adjusting: Array<{ name: string; yomi: string; amount: number }> = []
        const beforeInterview: Array<{ name: string; yomi: string; amount: number }> = []
        const waitingResult: Array<{ name: string; yomi: string; amount: number }> = []
        const waitingReply: Array<{ name: string; yomi: string; amount: number }> = []

        userProjects.forEach((project) => {
          const candidate = userCandidates.find((c) => c.id === project.candidate_id)
          if (!candidate) return

          const projectInterviews = interviews.filter((i) => i.project_id === project.id)
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

          // 調整中: 面接日程を調整している案件（面接予定があるが、リスケ中または調整中）
          if (
            project.phase === 'interview_scheduled' &&
            scheduledInterviews.some((i) => i.status === 'rescheduling')
          ) {
            adjusting.push(caseInfo)
          }
          // 面接前: 面接が予定されているが、まだ実施されていない案件
          else if (
            project.phase === 'interview_scheduled' &&
            scheduledInterviews.length > 0 &&
            completedInterviews.length === 0
          ) {
            beforeInterview.push(caseInfo)
          }
          // 結果待ち: 面接が終了し、結果を待っている案件
          else if (
            project.phase === 'interviewing' &&
            completedInterviews.length > 0
          ) {
            waitingResult.push(caseInfo)
          }
          // 本人返事待ち: 内定が出て、本人からの返事を待っている案件
          else if (project.phase === 'offer' || candidate.status === 'offer') {
            waitingReply.push(caseInfo)
          }
        })

        statusCases[user.id] = {
          adjusting,
          beforeInterview,
          waitingResult,
          waitingReply,
        }
      })

    return statusCases
  }, [users, candidates, projects, interviews])

  // 退職者フィルタリング用ヘルパー（選択期間に応じて退職者を含める/除外する）
  const isUserActiveInPeriod = (user: User) => {
    if (!user.retired_at) return true // 退職日が設定されていない場合は現役
    const retiredDate = new Date(user.retired_at)
    // 選択期間の開始月より前に退職した場合は非表示
    return retiredDate >= getPeriodDates.startDate
  }

  // 実際のデータから営業進捗を計算（期間対応）
  const salesProgress = useMemo(() => {
    return users
      .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
      .map((user) => {
        // 期間内に登録された求職者（担当件数）
        const userPeriodCandidates = periodCandidates.filter((c) => c.consultant_id === user.id)
        const totalCount = userPeriodCandidates.length

        // 初回連絡済み（ステータスがfirst_contact_done以降）
        const firstContactCount = userPeriodCandidates.filter(
          (c) => !['new', 'contacting'].includes(c.status)
        ).length

        // 期間内に面接を設定したユニークな求職者数（created_atで判定）
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

        // 期間内に成約を設定した数（created_atで判定）
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
  }, [users, periodCandidates, periodInterviews, periodContracts, projects, candidates])

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

  // 実データからメンバーごとのヨミ金額を計算
  const memberYomiStats = useMemo(() => {
    const stats: Record<string, { yomiA: number; yomiB: number; yomiC: number; yomiD: number }> = {}
    
    users
      .filter((u) => u.role !== 'admin' && isUserActiveInPeriod(u))
      .forEach((user) => {
        // このユーザーの担当求職者に紐づく案件からヨミ金額を集計
        const userCandidates = candidates.filter((c) => c.consultant_id === user.id)
        const userCandidateIds = new Set(userCandidates.map((c) => c.id))
        
        const userProjects = projects.filter((p) => userCandidateIds.has(p.candidate_id))
        
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

  // 2課のヨミ数字（翌月）- 翌月は現状計算ロジックがないためモック使用
  const team2YomiNext = useMemo(() => {
    return mockMemberStats
      .filter((stats) => team2UserIds.includes(stats.userId))
      .reduce(
        (acc, stats) => ({
          yomiA: acc.yomiA + stats.yomiANext,
          yomiB: acc.yomiB + stats.yomiBNext,
          yomiC: acc.yomiC + stats.yomiCNext,
          yomiD: acc.yomiD + stats.yomiDNext,
        }),
        { yomiA: 0, yomiB: 0, yomiC: 0, yomiD: 0 }
      )
  }, [])

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
                    <TableHead className="text-slate-700 font-semibold">担当</TableHead>
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
                        <TableCell className="text-sm text-slate-600">
                          {(() => {
                            const cases = getStatusCases[progress.userId]?.adjusting || []
                            return cases.length > 0 ? (
                              <div className="space-y-1">
                                {cases.map((case_, idx) => (
                                  <div key={idx}>
                                    {case_.name} {case_.yomi} {formatAmount(case_.amount)}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              '-'
                            )
                          })()}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {(() => {
                            const cases = getStatusCases[progress.userId]?.beforeInterview || []
                            return cases.length > 0 ? (
                              <div className="space-y-1">
                                {cases.map((case_, idx) => (
                                  <div key={idx}>
                                    {case_.name} {case_.yomi} {formatAmount(case_.amount)}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              '-'
                            )
                          })()}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {(() => {
                            const cases = getStatusCases[progress.userId]?.waitingResult || []
                            return cases.length > 0 ? (
                              <div className="space-y-1">
                                {cases.map((case_, idx) => (
                                  <div key={idx}>
                                    {case_.name} {case_.yomi} {formatAmount(case_.amount)}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              '-'
                            )
                          })()}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {(() => {
                            const cases = getStatusCases[progress.userId]?.waitingReply || []
                            return cases.length > 0 ? (
                              <div className="space-y-1">
                                {cases.map((case_, idx) => (
                                  <div key={idx}>
                                    {case_.name} {case_.yomi} {formatAmount(case_.amount)}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              '-'
                            )
                          })()}
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
                    <TableCell colSpan={4}></TableCell>
                  </TableRow>
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
                    <TableHead className="text-slate-700 font-semibold">面談設定目標</TableHead>
                    <TableHead className="text-slate-700 font-semibold">面談設定数</TableHead>
                    <TableHead className="text-slate-700 font-semibold">対面談設定(%)</TableHead>
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
                      
                      // mockから予算と面談設定目標を取得（設定ページができたら実データに変更）
                      const stats = mockMemberStats.find((s) => s.userId === progress.userId)
                      const budget = stats?.budget || 0
                      const meetingTarget = stats?.meetingTarget || 0
                      
                      const budgetRate = budget > 0 ? (periodSales / budget) * 100 : 0
                      const meetingRate = meetingTarget > 0
                        ? (progress.interviewCount / meetingTarget) * 100
                        : 0

                      return (
                        <TableRow key={progress.userId} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-800">
                            {user?.name || progress.userName || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(budget)}
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
                          <TableCell className="text-center">{meetingTarget}</TableCell>
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
                  {mockMemberStats
                    .filter((stats) => team2UserIds.includes(stats.userId))
                    .map((stats) => {
                      const user = mockUsers.find((u) => u.id === stats.userId)
                      return (
                        <TableRow key={stats.userId} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-800">
                            {user?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right bg-red-50">
                            {stats.yomiANext > 0 ? formatAmount(stats.yomiANext) : '-'}
                          </TableCell>
                          <TableCell className="text-right bg-orange-50">
                            {stats.yomiBNext > 0 ? formatAmount(stats.yomiBNext) : '-'}
                          </TableCell>
                          <TableCell className="text-right bg-yellow-50">
                            {stats.yomiCNext > 0 ? formatAmount(stats.yomiCNext) : '-'}
                          </TableCell>
                          <TableCell className="text-right bg-slate-50">
                            {stats.yomiDNext > 0 ? formatAmount(stats.yomiDNext) : '-'}
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

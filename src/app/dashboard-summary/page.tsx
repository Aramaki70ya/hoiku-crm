'use client'

import { useMemo } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  AlertCircle,
} from 'lucide-react'
import {
  mockSalesProgress,
  mockMemberStats,
  mockUsers,
  mockCandidates,
  mockProjects,
  mockInterviews,
  targetRates,
} from '@/lib/mock-data'

export default function DashboardSummaryPage() {
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
    mockUsers
      .filter((u) => u.role !== 'admin')
      .forEach((user) => {
        const userCandidates = mockCandidates.filter((c) => c.consultant_id === user.id)
        const userProjects = mockProjects.filter((p) =>
          userCandidates.some((c) => c.id === p.candidate_id)
        )

        const adjusting: Array<{ name: string; yomi: string; amount: number }> = []
        const beforeInterview: Array<{ name: string; yomi: string; amount: number }> = []
        const waitingResult: Array<{ name: string; yomi: string; amount: number }> = []
        const waitingReply: Array<{ name: string; yomi: string; amount: number }> = []

        userProjects.forEach((project) => {
          const candidate = userCandidates.find((c) => c.id === project.candidate_id)
          if (!candidate) return

          const interviews = mockInterviews.filter((i) => i.project_id === project.id)
          const scheduledInterviews = interviews.filter((i) => i.status === 'scheduled')
          const completedInterviews = interviews.filter((i) => i.status === 'completed')

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
            completedInterviews.length > 0 &&
            project.phase !== 'offer'
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
  }, [])

  // 全体集計
  const totalProgress = useMemo(() => {
    return mockSalesProgress.reduce(
      (acc, progress) => ({
        totalCount: acc.totalCount + progress.totalCount,
        firstContactCount: acc.firstContactCount + progress.firstContactCount,
        interviewCount: acc.interviewCount + progress.interviewCount,
        closedCount: acc.closedCount + progress.closedCount,
      }),
      { totalCount: 0, firstContactCount: 0, interviewCount: 0, closedCount: 0 }
    )
  }, [])

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

  // 2課のヨミ数字（当月）
  const team2YomiCurrent = useMemo(() => {
    return mockMemberStats
      .filter((stats) => team2UserIds.includes(stats.userId))
      .reduce(
        (acc, stats) => ({
          yomiA: acc.yomiA + stats.yomiA,
          yomiB: acc.yomiB + stats.yomiB,
          yomiC: acc.yomiC + stats.yomiC,
          yomiD: acc.yomiD + stats.yomiD,
        }),
        { yomiA: 0, yomiB: 0, yomiC: 0, yomiD: 0 }
      )
  }, [])

  // 2課のヨミ数字（翌月）
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

  return (
    <AppLayout title="ダッシュボード" description="営業進捗と売上実績のサマリー">
      <div className="space-y-6">
        {/* 日付表示 */}
        <div className="flex items-center gap-2 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Calendar className="w-5 h-5 text-violet-500" />
          <span className="font-medium text-slate-700">2026年1月14日時点</span>
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
                  {mockSalesProgress.map((progress) => {
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

        {/* 2課 売上数字 */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-violet-500" />
              2課 売上数字
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
                  {mockMemberStats
                    .filter((stats) => team2UserIds.includes(stats.userId))
                    .map((stats) => {
                      const user = mockUsers.find((u) => u.id === stats.userId)
                      const budgetRate =
                        stats.budget > 0 ? (stats.sales / stats.budget) * 100 : 0
                      const meetingRate =
                        stats.meetingTarget > 0
                          ? (stats.meetingCount / stats.meetingTarget) * 100
                          : 0

                      return (
                        <TableRow key={stats.userId} className="hover:bg-slate-50">
                          <TableCell className="font-medium text-slate-800">
                            {user?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatAmount(stats.budget)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600 font-semibold">
                            {formatAmount(stats.sales)}
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
                          <TableCell className="text-center">{stats.meetingTarget}</TableCell>
                          <TableCell className="text-center">{stats.meetingCount}</TableCell>
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

        {/* 2課 ヨミ数字（当月） */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-500" />
              2課 ヨミ数字（当月）
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

        {/* 2課 ヨミ数字（翌月） */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-500" />
              2課 ヨミ数字（翌月）
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

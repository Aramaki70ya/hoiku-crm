'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import {
  Calendar,
  TrendingUp,
  Target,
  Users,
  Briefcase,
  Clock,
  ArrowUpRight,
  AlertCircle,
  Percent,
  DollarSign,
  UserCheck,
  PhoneCall,
  CalendarDays,
  ChevronDown,
} from 'lucide-react'
import {
  mockCandidates,
  mockProjects,
  mockInterviews,
  mockUsers,
  mockMemberStats,
  team1Members,
  team2Members,
  totalBudget,
  statusLabels,
  statusColors,
  processStatusLabels,
  kpiAssumptions,
} from '@/lib/mock-data'

type PeriodType = 'current_month' | 'previous_month' | 'custom'

export default function DashboardPage() {
  const [periodType, setPeriodType] = useState<PeriodType>('current_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

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
  // 残り営業日（仮）
  const remainingDays = 2

  // 全体統計
  const totalSales = mockMemberStats.reduce((sum, s) => sum + s.sales, 0)
  const totalYomiA = mockMemberStats.reduce((sum, s) => sum + s.yomiA, 0)
  const totalYomiB = mockMemberStats.reduce((sum, s) => sum + s.yomiB, 0)
  const shortfall = totalBudget - totalSales - totalYomiA - totalYomiB

  // 1課統計
  const team1Stats = mockMemberStats.filter(s => team1Members.includes(s.userId))
  const team1Budget = team1Stats.reduce((sum, s) => sum + s.budget, 0)
  const team1Sales = team1Stats.reduce((sum, s) => sum + s.sales, 0)
  const team1YomiA = team1Stats.reduce((sum, s) => sum + s.yomiA, 0)
  const team1YomiB = team1Stats.reduce((sum, s) => sum + s.yomiB, 0)

  // 2課統計
  const team2Stats = mockMemberStats.filter(s => team2Members.includes(s.userId))
  const team2Budget = team2Stats.reduce((sum, s) => sum + s.budget, 0)
  const team2Sales = team2Stats.reduce((sum, s) => sum + s.sales, 0)
  const team2YomiA = team2Stats.reduce((sum, s) => sum + s.yomiA, 0)
  const team2YomiB = team2Stats.reduce((sum, s) => sum + s.yomiB, 0)

  // プロセス別集計
  const processCounts: Record<string, number> = {}
  mockCandidates.forEach(c => {
    const process = processStatusLabels[c.status] || c.status
    processCounts[process] = (processCounts[process] || 0) + 1
  })
  const totalCandidates = mockCandidates.length

  // 実績からの転換率計算
  const registrations = mockCandidates.length
  const firstContacts = mockCandidates.filter(c => 
    !['new', 'contacting'].includes(c.status)
  ).length
  const interviewCount = mockCandidates.filter(c => 
    ['interviewing', 'offer', 'closed_won'].includes(c.status)
  ).length
  const closedWonCount = mockCandidates.filter(c => c.status === 'closed_won').length

  // 実際の転換率
  const actualFirstContactRate = registrations > 0 ? (firstContacts / registrations) * 100 : 0
  const actualInterviewRate = firstContacts > 0 ? (interviewCount / firstContacts) * 100 : 0
  const actualClosedRate = interviewCount > 0 ? (closedWonCount / interviewCount) * 100 : 0

  // 今週の面接
  const upcomingInterviews = mockInterviews
    .filter((i) => i.status === 'scheduled')
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())

  return (
    <AppLayout title="ダッシュボード" description="保育事業部 採用管理">
      {/* 期間選択 */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
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

      {/* トップライン情報 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* 残り営業日 */}
        <Card className="bg-gradient-to-br from-slate-700 to-slate-800 text-white border-0 shadow-lg">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">残り営業日</p>
                <p className="text-4xl font-bold mt-1">{remainingDays}日</p>
              </div>
              <Clock className="w-12 h-12 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        {/* 予算達成状況 */}
        <Card className="bg-white border-slate-200 shadow-sm col-span-2">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500">予算達成状況（全体）</p>
              <Badge className="bg-violet-100 text-violet-700">
                {((totalSales / totalBudget) * 100).toFixed(1)}%
              </Badge>
            </div>
            <div className="flex items-end gap-4">
              <div>
                <p className="text-xs text-slate-400">予算</p>
                <p className="text-lg font-bold text-slate-800">¥{(totalBudget / 10000).toLocaleString()}万</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">売上</p>
                <p className="text-lg font-bold text-emerald-600">¥{(totalSales / 10000).toLocaleString()}万</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Aヨミ</p>
                <p className="text-lg font-bold text-red-600">¥{(totalYomiA / 10000).toLocaleString()}万</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Bヨミ</p>
                <p className="text-lg font-bold text-orange-600">¥{(totalYomiB / 10000).toLocaleString()}万</p>
              </div>
            </div>
            <Progress value={(totalSales / totalBudget) * 100} className="mt-3 h-2" />
          </CardContent>
        </Card>

        {/* 不足金額 */}
        <Card className="bg-gradient-to-br from-rose-500 to-pink-600 text-white border-0 shadow-lg">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-rose-200">不足金額（推定）</p>
                <p className="text-2xl font-bold mt-1">¥{shortfall > 0 ? (shortfall / 10000).toLocaleString() : 0}万</p>
              </div>
              <AlertCircle className="w-10 h-10 text-rose-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 目標数値の前提条件 */}
      <Card className="bg-white border-slate-200 shadow-sm mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
            <Target className="w-5 h-5 text-violet-500" />
            目標数値の前提条件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            {/* 登録→初回率 */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <PhoneCall className="w-5 h-5 text-purple-600" />
                <p className="text-sm font-medium text-purple-700">登録→初回率</p>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-purple-600">{(kpiAssumptions.registrationToFirstContactRate * 100).toFixed(0)}%</p>
                <p className="text-sm text-slate-500 mb-1">目標</p>
              </div>
              <div className="mt-2 pt-2 border-t border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">実績</span>
                  <Badge className={actualFirstContactRate >= kpiAssumptions.registrationToFirstContactRate * 100 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-amber-100 text-amber-700'}>
                    {actualFirstContactRate.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* 初回→面接率 */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-cyan-600" />
                <p className="text-sm font-medium text-cyan-700">初回→面接率</p>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-cyan-600">{(kpiAssumptions.firstContactToInterviewRate * 100).toFixed(0)}%</p>
                <p className="text-sm text-slate-500 mb-1">目標</p>
              </div>
              <div className="mt-2 pt-2 border-t border-cyan-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">実績</span>
                  <Badge className={actualInterviewRate >= kpiAssumptions.firstContactToInterviewRate * 100 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-amber-100 text-amber-700'}>
                    {actualInterviewRate.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* 面接→成約率 */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-700">面接→成約率</p>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-emerald-600">{(kpiAssumptions.interviewToClosedRate * 100).toFixed(0)}%</p>
                <p className="text-sm text-slate-500 mb-1">目標</p>
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">実績</span>
                  <Badge className={actualClosedRate >= kpiAssumptions.interviewToClosedRate * 100 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-amber-100 text-amber-700'}>
                    {actualClosedRate.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* 成約単価 */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <p className="text-sm font-medium text-amber-700">成約単価</p>
              </div>
              <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-amber-600">¥{(kpiAssumptions.revenuePerClosed / 10000).toFixed(0)}万</p>
                <p className="text-sm text-slate-500 mb-1">/人</p>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">今月成約</span>
                  <Badge className="bg-amber-100 text-amber-700">
                    {closedWonCount}人
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 課別予算進捗 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* 1課 */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-800 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500" />
              1課
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">予算</p>
                <p className="font-bold text-slate-800">¥{(team1Budget / 10000).toFixed(0)}万</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <p className="text-xs text-emerald-600">売上</p>
                <p className="font-bold text-emerald-700">¥{(team1Sales / 10000).toFixed(0)}万</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600">Aヨミ</p>
                <p className="font-bold text-red-700">¥{(team1YomiA / 10000).toFixed(0)}万</p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-600">Bヨミ</p>
                <p className="font-bold text-orange-700">¥{(team1YomiB / 10000).toFixed(0)}万</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Progress value={(team1Sales / team1Budget) * 100} className="h-2 flex-1" />
              <span className="text-sm font-medium text-slate-600">
                {((team1Sales / team1Budget) * 100).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 2課 */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-800 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              2課
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-2 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500">予算</p>
                <p className="font-bold text-slate-800">¥{(team2Budget / 10000).toFixed(0)}万</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <p className="text-xs text-emerald-600">売上</p>
                <p className="font-bold text-emerald-700">¥{(team2Sales / 10000).toFixed(0)}万</p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600">Aヨミ</p>
                <p className="font-bold text-red-700">¥{(team2YomiA / 10000).toFixed(0)}万</p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-600">Bヨミ</p>
                <p className="font-bold text-orange-700">¥{(team2YomiB / 10000).toFixed(0)}万</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Progress value={(team2Sales / team2Budget) * 100} className="h-2 flex-1" />
              <span className="text-sm font-medium text-slate-600">
                {((team2Sales / team2Budget) * 100).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* プロセス進捗 */}
      <Card className="bg-white border-slate-200 shadow-sm mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-violet-500" />
            全体プロセス進捗（ステータス）
            <Badge className="ml-2 bg-slate-100 text-slate-600">合計 {totalCandidates}件</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-3">
            {[
              { label: 'リード管理', color: 'bg-blue-500', lightColor: 'bg-blue-50 text-blue-700' },
              { label: '面談フェーズ', color: 'bg-emerald-500', lightColor: 'bg-emerald-50 text-emerald-700' },
              { label: '提案フェーズ', color: 'bg-purple-500', lightColor: 'bg-purple-50 text-purple-700' },
              { label: '面接フェーズ', color: 'bg-cyan-500', lightColor: 'bg-cyan-50 text-cyan-700' },
              { label: '内定確認中', color: 'bg-pink-500', lightColor: 'bg-pink-50 text-pink-700' },
              { label: '内定承諾', color: 'bg-green-500', lightColor: 'bg-green-50 text-green-700' },
              { label: '内定辞退', color: 'bg-amber-500', lightColor: 'bg-amber-50 text-amber-700' },
              { label: 'フォロー・ロスト', color: 'bg-slate-500', lightColor: 'bg-slate-100 text-slate-700' },
            ].map(({ label, lightColor }) => {
              const count = processCounts[label] || 0
              const percentage = totalCandidates > 0 ? ((count / totalCandidates) * 100).toFixed(1) : '0.0'
              return (
                <div key={label} className={`p-3 rounded-lg ${lightColor} text-center`}>
                  <p className="text-xs font-medium truncate">{label}</p>
                  <p className="text-2xl font-bold mt-1">{count}</p>
                  <p className="text-xs opacity-70">{percentage}%</p>
                </div>
              )
            })}
        </div>
        </CardContent>
      </Card>

      {/* 課別タブ */}
      <Tabs defaultValue="team1" className="mb-6">
        <TabsList className="bg-white border border-slate-200 shadow-sm">
          <TabsTrigger 
            value="team1" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
          >
            1課
          </TabsTrigger>
          <TabsTrigger 
            value="team2"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
          >
            2課
          </TabsTrigger>
        </TabsList>

        {/* 1課詳細 */}
        <TabsContent value="team1" className="mt-4">
          <TeamDetailSection teamMembers={team1Members} teamName="1課" />
        </TabsContent>

        {/* 2課詳細 */}
        <TabsContent value="team2" className="mt-4">
          <TeamDetailSection teamMembers={team2Members} teamName="2課" />
        </TabsContent>
      </Tabs>

      {/* 直近の面接予定 */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-500" />
            直近の面接予定
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingInterviews.length === 0 ? (
            <p className="text-slate-500 text-center py-8">
              予定されている面接はありません
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingInterviews.map((interview) => {
                const project = mockProjects.find((p) => p.id === interview.project_id)
                const candidate = mockCandidates.find(
                  (c) => c.id === project?.candidate_id
                )
                const consultant = mockUsers.find(c => c.id === candidate?.consultant_id)
                return (
                  <div
                    key={interview.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100"
                  >
                    <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white border border-violet-200 flex flex-col items-center justify-center shadow-sm">
                      <span className="text-lg font-bold text-violet-600">
                        {new Date(interview.start_at).getDate()}
                      </span>
                      <span className="text-xs text-violet-500">
                        {new Date(interview.start_at).toLocaleDateString('ja-JP', {
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">
                          {candidate?.name}
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{project?.client_name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        <span>
                          {new Date(interview.start_at).toLocaleTimeString('ja-JP', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>•</span>
                        <span>{interview.location}</span>
                        <span>•</span>
                        <span className="text-violet-600">担当: {consultant?.name}</span>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                      面接予定
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  )
}

// 課別詳細セクション
function TeamDetailSection({ teamMembers, teamName }: { teamMembers: string[], teamName: string }) {
  const teamStats = mockMemberStats.filter(s => teamMembers.includes(s.userId))
  
  // メンバー別ステータス集計
  const getMemberStatusCounts = (userId: string) => {
    const candidates = mockCandidates.filter(c => c.consultant_id === userId)
    const counts: Record<string, number> = {
      'リード管理': 0,
      '面談フェーズ': 0,
      '提案フェーズ': 0,
      '面接フェーズ': 0,
      '内定確認中': 0,
      '内定承諾': 0,
      '内定辞退': 0,
      'フォロー・ロスト': 0,
    }
    candidates.forEach(c => {
      const process = processStatusLabels[c.status] || c.status
      if (counts[process] !== undefined) {
        counts[process]++
      }
    })
    return counts
  }

  return (
    <div className="space-y-4">
      {/* 売上数字・行動目標 */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-2 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="text-base">{teamName} - 売上数字・行動目標</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 bg-slate-50">
                <TableHead className="text-slate-600">メンバー</TableHead>
                <TableHead className="text-slate-600 text-right">売上予算</TableHead>
                <TableHead className="text-slate-600 text-right">成約額</TableHead>
                <TableHead className="text-slate-600 text-right">対予算(%)</TableHead>
                <TableHead className="text-slate-600 text-right">面談設定目標</TableHead>
                <TableHead className="text-slate-600 text-right">面談設定数</TableHead>
                <TableHead className="text-slate-600 text-right">対面談設定(%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamStats.map(stats => {
                const user = mockUsers.find(u => u.id === stats.userId)
                const budgetRate = (stats.sales / stats.budget) * 100
                const meetingRate = (stats.meetingCount / stats.meetingTarget) * 100
                return (
                  <TableRow key={stats.userId} className="border-slate-100">
                    <TableCell className="font-medium text-slate-800">{user?.name}</TableCell>
                    <TableCell className="text-right text-slate-600">¥{(stats.budget / 10000).toFixed(0)}万</TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">¥{(stats.sales / 10000).toFixed(0)}万</TableCell>
                    <TableCell className="text-right">
                      <Badge className={budgetRate >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
                        {budgetRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-slate-600">{stats.meetingTarget}</TableCell>
                    <TableCell className="text-right text-slate-600">{stats.meetingCount}</TableCell>
                    <TableCell className="text-right">
                      <Badge className={meetingRate >= 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                        {meetingRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ヨミ数字 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 当月 */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-800">ヨミ数字（当月）</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50">
                  <TableHead className="text-slate-600">メンバー</TableHead>
                  <TableHead className="text-slate-600 text-right">Aヨミ(80%)</TableHead>
                  <TableHead className="text-slate-600 text-right">Bヨミ(50%)</TableHead>
                  <TableHead className="text-slate-600 text-right">Cヨミ(30%)</TableHead>
                  <TableHead className="text-slate-600 text-right">Dヨミ(10%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamStats.map(stats => {
                  const user = mockUsers.find(u => u.id === stats.userId)
                  return (
                    <TableRow key={stats.userId} className="border-slate-100">
                      <TableCell className="font-medium text-slate-800">{user?.name}</TableCell>
                      <TableCell className="text-right text-red-600">¥{(stats.yomiA / 10000).toFixed(0)}万</TableCell>
                      <TableCell className="text-right text-orange-600">¥{(stats.yomiB / 10000).toFixed(0)}万</TableCell>
                      <TableCell className="text-right text-yellow-600">¥{(stats.yomiC / 10000).toFixed(0)}万</TableCell>
                      <TableCell className="text-right text-slate-500">¥{(stats.yomiD / 10000).toFixed(0)}万</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* 翌月 */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-slate-800">ヨミ数字（翌月）</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50">
                  <TableHead className="text-slate-600">メンバー</TableHead>
                  <TableHead className="text-slate-600 text-right">Aヨミ(80%)</TableHead>
                  <TableHead className="text-slate-600 text-right">Bヨミ(50%)</TableHead>
                  <TableHead className="text-slate-600 text-right">Cヨミ(30%)</TableHead>
                  <TableHead className="text-slate-600 text-right">Dヨミ(10%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamStats.map(stats => {
                  const user = mockUsers.find(u => u.id === stats.userId)
                  return (
                    <TableRow key={stats.userId} className="border-slate-100">
                      <TableCell className="font-medium text-slate-800">{user?.name}</TableCell>
                      <TableCell className="text-right text-red-500">¥{(stats.yomiANext / 10000).toFixed(0)}万</TableCell>
                      <TableCell className="text-right text-orange-500">¥{(stats.yomiBNext / 10000).toFixed(0)}万</TableCell>
                      <TableCell className="text-right text-yellow-500">¥{(stats.yomiCNext / 10000).toFixed(0)}万</TableCell>
                      <TableCell className="text-right text-slate-400">¥{(stats.yomiDNext / 10000).toFixed(0)}万</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>

      {/* ステータス概況 */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-800">ステータス概況（個人別プロセス）</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-100 bg-slate-50">
                <TableHead className="text-slate-600">メンバー</TableHead>
                <TableHead className="text-slate-600 text-center">リード</TableHead>
                <TableHead className="text-slate-600 text-center">面談</TableHead>
                <TableHead className="text-slate-600 text-center">提案</TableHead>
                <TableHead className="text-slate-600 text-center">面接</TableHead>
                <TableHead className="text-slate-600 text-center">内定確認</TableHead>
                <TableHead className="text-slate-600 text-center">内定承諾</TableHead>
                <TableHead className="text-slate-600 text-center">内定辞退</TableHead>
                <TableHead className="text-slate-600 text-center">フォロー</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map(memberId => {
                const user = mockUsers.find(u => u.id === memberId)
                const counts = getMemberStatusCounts(memberId)
                return (
                  <TableRow key={memberId} className="border-slate-100">
                    <TableCell className="font-medium text-slate-800">{user?.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{counts['リード管理']}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{counts['面談フェーズ']}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{counts['提案フェーズ']}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">{counts['面接フェーズ']}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">{counts['内定確認中']}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{counts['内定承諾']}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{counts['内定辞退']}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">{counts['フォロー・ロスト']}</Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

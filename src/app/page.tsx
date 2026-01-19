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
  mockSources,
  mockMemberStats,
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

  // 課別表示は削除（一旦なし）

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
  
  // 実績の成約単価（成約額 / 成約人数）
  const actualRevenuePerClosed = closedWonCount > 0 ? totalSales / closedWonCount : 0

  // 今月の応募数
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const thisMonthCandidates = mockCandidates.filter(c => {
    if (!c.registered_at) return false
    const registeredDate = new Date(c.registered_at)
    return registeredDate >= currentMonthStart && registeredDate <= currentMonthEnd
  })

  // 流入経路ごとの集計（LINEを除く）
  const sourceStats: Record<string, { count: number; thisMonthCount: number }> = {}
  mockCandidates.forEach(c => {
    if (c.source_id && c.source_id !== '1') { // LINEを除く（source_id: '1'）
      const sourceName = mockSources.find(s => s.id === c.source_id)?.name || '不明'
      if (!sourceStats[sourceName]) {
        sourceStats[sourceName] = { count: 0, thisMonthCount: 0 }
      }
      sourceStats[sourceName].count++
      if (c.registered_at) {
        const registeredDate = new Date(c.registered_at)
        if (registeredDate >= currentMonthStart && registeredDate <= currentMonthEnd) {
          sourceStats[sourceName].thisMonthCount++
        }
      }
    }
  })

  // 全体の人数
  const totalCandidatesCount = mockCandidates.length

  // 流入経路割合の計算（LINEを除く）
  const candidatesWithoutLine = mockCandidates.filter(c => c.source_id !== '1')
  const totalWithoutLine = candidatesWithoutLine.length

  return (
    <AppLayout title="全体サマリー" description="保育事業部 採用管理">
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
        <Card className="bg-gradient-to-br from-rose-200 to-pink-200 text-slate-700 border-0 shadow-lg">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">不足金額（推定）</p>
                <p className="text-2xl font-bold mt-1 text-slate-800">¥{shortfall > 0 ? (shortfall / 10000).toLocaleString() : 0}万</p>
              </div>
              <AlertCircle className="w-10 h-10 text-rose-400" />
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
                <div className="flex items-end gap-2">
                  <p className={`text-3xl font-bold ${actualFirstContactRate >= kpiAssumptions.registrationToFirstContactRate * 100 
                    ? 'text-emerald-600' 
                    : 'text-amber-600'}`}>
                    {actualFirstContactRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-slate-500 mb-1">実績</p>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {firstContacts}件 / {registrations}件
                </p>
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
                <div className="flex items-end gap-2">
                  <p className={`text-3xl font-bold ${actualInterviewRate >= kpiAssumptions.firstContactToInterviewRate * 100 
                    ? 'text-emerald-600' 
                    : 'text-amber-600'}`}>
                    {actualInterviewRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-slate-500 mb-1">実績</p>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {interviewCount}件 / {firstContacts}件
                </p>
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
                <div className="flex items-end gap-2">
                  <p className={`text-3xl font-bold ${actualClosedRate >= kpiAssumptions.interviewToClosedRate * 100 
                    ? 'text-emerald-600' 
                    : 'text-amber-600'}`}>
                    {actualClosedRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-slate-500 mb-1">実績</p>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {closedWonCount}件 / {interviewCount}件
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
                <p className="text-3xl font-bold text-amber-600">¥{(kpiAssumptions.revenuePerClosed / 10000).toFixed(0)}万</p>
                <p className="text-sm text-slate-500 mb-1">/人</p>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-200">
                <div className="flex items-end gap-2">
                  <p className={`text-3xl font-bold ${actualRevenuePerClosed >= kpiAssumptions.revenuePerClosed 
                    ? 'text-emerald-600' 
                    : actualRevenuePerClosed > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {actualRevenuePerClosed > 0 ? `¥${(actualRevenuePerClosed / 10000).toFixed(0)}万` : '-'}
                  </p>
                  <p className="text-sm text-slate-500 mb-1">実績</p>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {closedWonCount}件
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 課別表示は削除（一旦なし） */}

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

      {/* 課別タブは削除（一旦なし） */}

      {/* 登録者数サマリー */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-500" />
            登録者数サマリー
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 今月の応募数と全体の人数 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-violet-600" />
                  <p className="text-sm font-medium text-violet-700">今月の応募</p>
                </div>
                <p className="text-3xl font-bold text-violet-600">{thisMonthCandidates.length}人</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-slate-600" />
                  <p className="text-sm font-medium text-slate-700">全体の人数</p>
                </div>
                <p className="text-3xl font-bold text-slate-800">{totalCandidatesCount}人</p>
              </div>
            </div>

            {/* 流入経路ごとの新規人数（LINEを除く） */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">流入経路ごとの新規人数（LINE除く）</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(sourceStats)
                  .sort((a, b) => b[1].thisMonthCount - a[1].thisMonthCount)
                  .map(([sourceName, stats]) => (
                    <div key={sourceName} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-700">{sourceName}</p>
                        <p className="text-xs text-slate-500">今月: {stats.thisMonthCount}人</p>
                      </div>
                      <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold text-slate-800">{stats.count}人</p>
                        <p className="text-xs text-slate-500 mb-1">全体</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* 流入経路割合 */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">流入経路割合（LINE除く）</h3>
              <div className="space-y-2">
                {Object.entries(sourceStats)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([sourceName, stats]) => {
                    const percentage = totalWithoutLine > 0 
                      ? ((stats.count / totalWithoutLine) * 100).toFixed(1) 
                      : '0.0'
                    return (
                      <div key={sourceName} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-700">{sourceName}</span>
                            <span className="text-sm font-medium text-slate-800">{percentage}%</span>
                          </div>
                          <Progress 
                            value={parseFloat(percentage)} 
                            className="h-2"
                          />
                        </div>
                        <span className="text-sm text-slate-600 w-16 text-right">{stats.count}人</span>
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  )
}

// 課別詳細セクション
// TeamDetailSectionコンポーネントは削除（課別表示なし）

'use client'

import { useState, useEffect, useMemo } from 'react'
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
  Edit,
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
  getCandidatesClient as getCandidates,
  getProjectsClient as getProjects,
  getContractsClient as getContracts,
  getUsersClient as getUsers,
  getSourcesClient as getSources,
  getInterviewsClient as getInterviews,
} from '@/lib/supabase/queries-client-with-fallback'
import type { Candidate, Project, User, Contract, Source, Interview } from '@/types/database'
import {
  totalBudget as defaultBudget,
  statusLabels,
  statusColors,
  processStatusLabels,
  kpiAssumptions as defaultKpiAssumptions,
} from '@/lib/mock-data'
import type { MonthlyTarget } from '@/types/database'

type PeriodType = 'current_month' | 'previous_month' | 'custom'

export default function DashboardPage() {
  const [periodType, setPeriodType] = useState<PeriodType>('current_month')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  // Supabaseデータ取得
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  
  // 予算・目標（編集可能）
  const [budget, setBudget] = useState(defaultBudget)
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  
  // KPI目標
  const [kpiAssumptions, setKpiAssumptions] = useState(defaultKpiAssumptions)
  const [isEditingKpi, setIsEditingKpi] = useState(false)
  const [kpiForm, setKpiForm] = useState({
    registrationToFirstContactRate: defaultKpiAssumptions.registrationToFirstContactRate * 100,
    firstContactToInterviewRate: defaultKpiAssumptions.firstContactToInterviewRate * 100,
    interviewToClosedRate: defaultKpiAssumptions.interviewToClosedRate * 100,
    revenuePerClosed: defaultKpiAssumptions.revenuePerClosed,
  })

  // 現在の年月を取得
  const getCurrentYearMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const [candidatesData, projectsData, contractsData, interviewsData, usersData, sourcesData] = await Promise.all([
          getCandidates(),
          getProjects(),
          getContracts(),
          getInterviews(),
          getUsers(),
          getSources(),
        ])
        setCandidates(candidatesData)
        setProjects(projectsData)
        setContracts(contractsData)
        setInterviews(interviewsData)
        setUsers(usersData)
        setSources(sourcesData)
        
        // 月次目標を取得
        try {
          const yearMonth = getCurrentYearMonth()
          const targetsRes = await fetch(`/api/targets?year_month=${yearMonth}`)
          if (targetsRes.ok) {
            const { data: targetsData } = await targetsRes.json()
            if (targetsData) {
              setBudget(targetsData.total_sales_budget || defaultBudget)
              setKpiAssumptions({
                registrationToFirstContactRate: Number(targetsData.registration_to_first_contact_rate) || defaultKpiAssumptions.registrationToFirstContactRate,
                firstContactToInterviewRate: Number(targetsData.first_contact_to_interview_rate) || defaultKpiAssumptions.firstContactToInterviewRate,
                interviewToClosedRate: Number(targetsData.interview_to_closed_rate) || defaultKpiAssumptions.interviewToClosedRate,
                revenuePerClosed: targetsData.closed_unit_price || defaultKpiAssumptions.revenuePerClosed,
              })
              setKpiForm({
                registrationToFirstContactRate: Number(targetsData.registration_to_first_contact_rate) * 100 || defaultKpiAssumptions.registrationToFirstContactRate * 100,
                firstContactToInterviewRate: Number(targetsData.first_contact_to_interview_rate) * 100 || defaultKpiAssumptions.firstContactToInterviewRate * 100,
                interviewToClosedRate: Number(targetsData.interview_to_closed_rate) * 100 || defaultKpiAssumptions.interviewToClosedRate * 100,
                revenuePerClosed: targetsData.closed_unit_price || defaultKpiAssumptions.revenuePerClosed,
              })
            }
          }
        } catch (err) {
          console.error('目標データ取得エラー:', err)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        // エラー時は空配列を設定（既存の動作を維持）
        setCandidates([])
        setProjects([])
        setContracts([])
        setInterviews([])
        setUsers([])
        setSources([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // 目標データを保存する関数
  const saveTargets = async (newBudget?: number, newKpi?: typeof kpiAssumptions) => {
    try {
      const yearMonth = getCurrentYearMonth()
      await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year_month: yearMonth,
          total_sales_budget: newBudget ?? budget,
          registration_to_first_contact_rate: (newKpi ?? kpiAssumptions).registrationToFirstContactRate,
          first_contact_to_interview_rate: (newKpi ?? kpiAssumptions).firstContactToInterviewRate,
          interview_to_closed_rate: (newKpi ?? kpiAssumptions).interviewToClosedRate,
          closed_unit_price: (newKpi ?? kpiAssumptions).revenuePerClosed,
        }),
      })
    } catch (err) {
      console.error('目標保存エラー:', err)
    }
  }

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
  // 残り営業日を計算（平日のみ）
  const remainingDays = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const today = now.getDate()
    const lastDay = new Date(year, month + 1, 0).getDate()
    
    let count = 0
    for (let day = today; day <= lastDay; day++) {
      const date = new Date(year, month, day)
      const dayOfWeek = date.getDay()
      // 土曜(6)・日曜(0)以外をカウント
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++
      }
    }
    return count
  }, [])

  // 全体統計（成約統計は既に計算済み）

  // 課別表示は削除（一旦なし）

  // 期間の開始日・終了日を計算（Hooksは早期リターンの前に配置）
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
    return candidates.filter(c => {
      if (!c.registered_at) return false
      const registeredDate = new Date(c.registered_at)
      return registeredDate >= getPeriodDates.startDate && registeredDate <= getPeriodDates.endDate
    })
  }, [candidates, getPeriodDates])

  const periodContracts = useMemo(() => {
    return contracts.filter(c => {
      // contracted_at（成約確定日時）、accepted_date（承諾日）、created_at の順で判定
      const dateStr = c.contracted_at || c.accepted_date || c.created_at
      if (!dateStr) return false
      const contractDate = new Date(dateStr)
      return contractDate >= getPeriodDates.startDate && contractDate <= getPeriodDates.endDate
    })
  }, [contracts, getPeriodDates])

  const periodInterviews = useMemo(() => {
    return interviews.filter(i => {
      if (!i.start_at) return false
      const interviewDate = new Date(i.start_at)
      return interviewDate >= getPeriodDates.startDate && interviewDate <= getPeriodDates.endDate
    })
  }, [interviews, getPeriodDates])

  // プロセス別集計（全期間）
  const processCounts: Record<string, number> = {}
  candidates.forEach(c => {
    const process = processStatusLabels[c.status] || c.status
    processCounts[process] = (processCounts[process] || 0) + 1
  })
  const totalCandidates = candidates.length

  // 期間内の実績計算
  const periodRegistrations = periodCandidates.length
  const periodFirstContacts = periodCandidates.filter(c => 
    !['new', 'contacting'].includes(c.status)
  ).length
  
  // 期間内に面接を設定したユニークな求職者数
  const periodInterviewCandidates = useMemo(() => {
    const candidateIds = new Set<string>()
    periodInterviews.forEach(i => {
      const project = projects.find(p => p.id === i.project_id)
      if (project) {
        candidateIds.add(project.candidate_id)
      }
    })
    return candidateIds.size
  }, [periodInterviews, projects])

  const periodClosedWonCount = periodContracts.length

  // 成約統計（期間内）
  const periodTotalSales = periodContracts.reduce((sum, c) => sum + (c.revenue_including_tax || 0), 0)

  // 実際の転換率（期間内のデータを使用）
  const actualFirstContactRate = periodRegistrations > 0 ? (periodFirstContacts / periodRegistrations) * 100 : 0
  const actualInterviewRate = periodFirstContacts > 0 ? (periodInterviewCandidates / periodFirstContacts) * 100 : 0
  const actualClosedRate = periodInterviewCandidates > 0 ? (periodClosedWonCount / periodInterviewCandidates) * 100 : 0
  
  // 実績の成約単価（期間内のデータを使用）
  const actualRevenuePerClosed = periodClosedWonCount > 0 ? periodTotalSales / periodClosedWonCount : 0

  // A/Bヨミの計算（projectsから）
  const totalYomiA = useMemo(() => {
    return projects
      .filter(p => p.probability === 'A' && p.expected_amount)
      .reduce((sum, p) => sum + (p.expected_amount || 0), 0)
  }, [projects])

  const totalYomiB = useMemo(() => {
    return projects
      .filter(p => p.probability === 'B' && p.expected_amount)
      .reduce((sum, p) => sum + (p.expected_amount || 0), 0)
  }, [projects])

  // 不足金額 = 予算 - 売上
  const shortfall = budget - periodTotalSales

  // 今月の応募数（表示用、当月固定）
  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const thisMonthCandidates = candidates.filter(c => {
    if (!c.registered_at) return false
    const registeredDate = new Date(c.registered_at)
    return registeredDate >= currentMonthStart && registeredDate <= currentMonthEnd
  })

  // 流入経路ごとの集計（LINEを除く）
  const sourceStats: Record<string, { count: number; thisMonthCount: number }> = {}
  candidates.forEach(c => {
    if (c.source_id && c.source_id !== '1') { // LINEを除く（source_id: '1'）
      const sourceName = sources.find(s => s.id === c.source_id)?.name || '不明'
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
  const totalCandidatesCount = candidates.length

  // 流入経路割合の計算（LINEを除く）
  const candidatesWithoutLine = candidates.filter(c => c.source_id !== '1')
  const totalWithoutLine = candidatesWithoutLine.length

  // ローディング中の処理（すべてのHooksの後に配置）
  if (loading) {
    return (
      <AppLayout title="ダッシュボード" description="データを読み込み中...">
        <div className="flex items-center justify-center h-64">
          <p>データを読み込み中...</p>
        </div>
      </AppLayout>
    )
  }

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
        {/* 残り営業日（当月のみ表示） */}
        {periodType === 'current_month' && (
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
        )}

        {/* 予算達成状況 */}
        <Card className={`bg-white border-slate-200 shadow-sm ${periodType === 'current_month' ? 'col-span-3' : 'col-span-4'}`}>
          <CardContent className="pt-4">
            <div className="flex gap-4">
              {/* 左側: 予算・売上・ヨミ情報 */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-sm text-slate-500">予算達成状況（全体）</p>
                  <Badge className="bg-violet-100 text-violet-700 text-base px-3 py-1 font-semibold">
                    {((periodTotalSales / budget) * 100).toFixed(1)}%
                  </Badge>
                </div>
                <div className="flex items-end gap-4">
                  <div>
                    <p className="text-xs text-slate-400">予算</p>
                    {isEditingBudget ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xl font-bold text-slate-800">¥</span>
                        <Input
                          type="number"
                          value={budgetInput}
                          onChange={(e) => setBudgetInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const value = parseInt(budgetInput) * 10000
                              if (!isNaN(value) && value > 0) {
                                setBudget(value)
                                saveTargets(value)
                              }
                              setIsEditingBudget(false)
                            } else if (e.key === 'Escape') {
                              setIsEditingBudget(false)
                            }
                          }}
                          onBlur={() => {
                            const value = parseInt(budgetInput) * 10000
                            if (!isNaN(value) && value > 0) {
                              setBudget(value)
                              saveTargets(value)
                            }
                            setIsEditingBudget(false)
                          }}
                          className="w-24 h-8 text-lg font-bold"
                          autoFocus
                        />
                        <span className="text-xl font-bold text-slate-800">万</span>
                      </div>
                    ) : (
                      <p 
                        className="text-xl font-bold text-slate-800 cursor-pointer hover:text-violet-600 transition-colors"
                        onClick={() => {
                          setBudgetInput(String(budget / 10000))
                          setIsEditingBudget(true)
                        }}
                        title="クリックして編集"
                      >
                        ¥{(budget / 10000).toLocaleString()}万
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">売上</p>
                    <p className="text-xl font-bold text-emerald-600">¥{(periodTotalSales / 10000).toLocaleString()}万</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Aヨミ</p>
                    <p className="text-xl font-bold text-red-600">¥{(totalYomiA / 10000).toLocaleString()}万</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Bヨミ</p>
                    <p className="text-xl font-bold text-orange-600">¥{(totalYomiB / 10000).toLocaleString()}万</p>
                  </div>
                </div>
                <Progress value={(periodTotalSales / budget) * 100} className="mt-3 h-2" />
              </div>
              
              {/* 右側: 不足金額カード */}
              <div className="flex items-center">
                <div className="bg-gradient-to-br from-rose-100 to-pink-100 rounded-xl px-4 py-3 text-center border border-rose-200">
                  <p className="text-xs text-slate-600 mb-1">不足金額</p>
                  <p className="text-xl font-bold text-slate-800">¥{shortfall > 0 ? (shortfall / 10000).toLocaleString() : 0}万</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 目標数値の前提条件 */}
      <Card className="bg-white border-slate-200 shadow-sm mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-500" />
              目標数値の前提条件
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isEditingKpi) {
                  // 保存
                  const newKpi = {
                    registrationToFirstContactRate: kpiForm.registrationToFirstContactRate / 100,
                    firstContactToInterviewRate: kpiForm.firstContactToInterviewRate / 100,
                    interviewToClosedRate: kpiForm.interviewToClosedRate / 100,
                    revenuePerClosed: kpiForm.revenuePerClosed,
                  }
                  setKpiAssumptions(newKpi)
                  saveTargets(undefined, newKpi)
                }
                setIsEditingKpi(!isEditingKpi)
              }}
              className="text-violet-600 hover:text-violet-700"
            >
              <Edit className="w-4 h-4 mr-1" />
              {isEditingKpi ? '保存' : '編集'}
            </Button>
          </div>
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
                {isEditingKpi ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={kpiForm.registrationToFirstContactRate}
                      onChange={(e) => setKpiForm(prev => ({ ...prev, registrationToFirstContactRate: Number(e.target.value) }))}
                      className="w-16 h-8 text-lg font-bold"
                    />
                    <span className="text-2xl font-bold text-purple-600">%</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-purple-600">{(kpiAssumptions.registrationToFirstContactRate * 100).toFixed(0)}%</p>
                )}
                <p className="text-sm text-slate-500 mb-1">目標</p>
              </div>
              <div className="mt-2 pt-2 border-t border-purple-200">
                <div className="flex items-end gap-2">
                  <p className={`text-2xl font-bold ${actualFirstContactRate >= kpiAssumptions.registrationToFirstContactRate * 100 
                    ? 'text-emerald-600' 
                    : 'text-amber-600'}`}>
                    {actualFirstContactRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-slate-500 mb-1">実績</p>
                </div>
                <p className="text-lg text-slate-500 mt-1">
                  {periodFirstContacts}件 / {periodRegistrations}件
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
                {isEditingKpi ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={kpiForm.firstContactToInterviewRate}
                      onChange={(e) => setKpiForm(prev => ({ ...prev, firstContactToInterviewRate: Number(e.target.value) }))}
                      className="w-16 h-8 text-lg font-bold"
                    />
                    <span className="text-2xl font-bold text-cyan-600">%</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-cyan-600">{(kpiAssumptions.firstContactToInterviewRate * 100).toFixed(0)}%</p>
                )}
                <p className="text-sm text-slate-500 mb-1">目標</p>
              </div>
              <div className="mt-2 pt-2 border-t border-cyan-200">
                <div className="flex items-end gap-2">
                  <p className={`text-2xl font-bold ${actualInterviewRate >= kpiAssumptions.firstContactToInterviewRate * 100 
                    ? 'text-emerald-600' 
                    : 'text-amber-600'}`}>
                    {actualInterviewRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-slate-500 mb-1">実績</p>
                </div>
                <p className="text-lg text-slate-500 mt-1">
                  {periodInterviewCandidates}件 / {periodFirstContacts}件
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
                {isEditingKpi ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={kpiForm.interviewToClosedRate}
                      onChange={(e) => setKpiForm(prev => ({ ...prev, interviewToClosedRate: Number(e.target.value) }))}
                      className="w-16 h-8 text-lg font-bold"
                    />
                    <span className="text-2xl font-bold text-emerald-600">%</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-emerald-600">{(kpiAssumptions.interviewToClosedRate * 100).toFixed(0)}%</p>
                )}
                <p className="text-sm text-slate-500 mb-1">目標</p>
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-200">
                <div className="flex items-end gap-2">
                  <p className={`text-2xl font-bold ${actualClosedRate >= kpiAssumptions.interviewToClosedRate * 100 
                    ? 'text-emerald-600' 
                    : 'text-amber-600'}`}>
                    {actualClosedRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-slate-500 mb-1">実績</p>
                </div>
                <p className="text-lg text-slate-500 mt-1">
                  {periodClosedWonCount}件 / {periodInterviewCandidates}件
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
                {isEditingKpi ? (
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-bold text-amber-600">¥</span>
                    <Input
                      type="number"
                      value={kpiForm.revenuePerClosed / 10000}
                      onChange={(e) => setKpiForm(prev => ({ ...prev, revenuePerClosed: Number(e.target.value) * 10000 }))}
                      className="w-16 h-8 text-lg font-bold"
                    />
                    <span className="text-2xl font-bold text-amber-600">万</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-amber-600">¥{(kpiAssumptions.revenuePerClosed / 10000).toFixed(0)}万</p>
                )}
                <p className="text-sm text-slate-500 mb-1">/人</p>
              </div>
              <div className="mt-2 pt-2 border-t border-amber-200">
                <div className="flex items-end gap-2">
                  <p className={`text-2xl font-bold ${actualRevenuePerClosed >= kpiAssumptions.revenuePerClosed 
                    ? 'text-emerald-600' 
                    : actualRevenuePerClosed > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                    {actualRevenuePerClosed > 0 ? `¥${(actualRevenuePerClosed / 10000).toFixed(0)}万` : '-'}
                  </p>
                  <p className="text-sm text-slate-500 mb-1">実績</p>
                </div>
                <p className="text-lg text-slate-500 mt-1">
                  {periodClosedWonCount}件
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

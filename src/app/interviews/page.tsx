'use client'

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Clock, MapPin, User as UserIcon, Building, CheckCircle, XCircle, Trash2, Gift } from 'lucide-react'
import {
  interviewStatusLabels,
  interviewStatusColors,
  statusColors,
} from '@/lib/status-mapping'
import { useInterviews } from '@/hooks/useInterviews'
import { useUsers } from '@/hooks/useUsers'
import { useCandidates } from '@/hooks/useCandidates'
import type { Candidate, User } from '@/types/database'

// 面接一覧に表示する求職者ステータス（この4つのいずれかのみ「面接レコードの全件」に含む）
const INTERVIEW_RELEVANT_STATUSES = [
  '面接日程調整中',
  '面接確定済',
  '面接実施済（結果待ち）',
  '内定獲得（承諾確認中）',
] as const

// 求職者ステータス → 面接一覧での表示ラベル
const CANDIDATE_STATUS_TO_DISPLAY: Record<string, { label: string; className: string }> = {
  '面接日程調整中': { label: '調整中', className: interviewStatusColors['調整中'] },
  '面接確定済': { label: '面接確定済み', className: interviewStatusColors['予定'] },
  '面接実施済（結果待ち）': { label: '面接実施済み', className: interviewStatusColors['実施済'] },
  '内定獲得（承諾確認中）': { label: '内定獲得', className: statusColors['内定獲得（承諾確認中）'] },
}

function getDisplayStatusFromCandidate(candidateStatus: string | undefined) {
  if (!candidateStatus) return null
  return CANDIDATE_STATUS_TO_DISPLAY[candidateStatus] || null
}

function isInterviewRelevant(candidateStatus: string | undefined) {
  return candidateStatus ? INTERVIEW_RELEVANT_STATUSES.includes(candidateStatus as (typeof INTERVIEW_RELEVANT_STATUSES)[number]) : false
}

// 年月の選択肢を生成
function generateMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`
    options.push({ value, label })
  }
  return options
}

const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/

function InterviewsPageContent() {
  const searchParams = useSearchParams()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [consultantFilter, setConsultantFilter] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const monthOptions = generateMonthOptions()
  const [localInterviewConsultants, setLocalInterviewConsultants] = useState<Record<string, string>>({})
  const [localCandidateConsultants, setLocalCandidateConsultants] = useState<Record<string, string>>({})

  // URL の ?month=YYYY-MM で開いたときにその月を表示する
  useEffect(() => {
    const monthFromUrl = searchParams.get('month')
    if (monthFromUrl && MONTH_REGEX.test(monthFromUrl)) {
      setSelectedMonth(monthFromUrl)
    }
  }, [searchParams])

  // API経由でデータを取得
  const { interviews: apiInterviews, isLoading, refetch } = useInterviews({
    month: selectedMonth,
    status: statusFilter,
    consultantId: consultantFilter,
  })
  const { users } = useUsers()
  const { updateCandidate, candidates: reschedulingCandidates } = useCandidates({
    status: '面接日程調整中',
    consultantId: consultantFilter !== 'all' ? consultantFilter : undefined,
    limit: 1000,
  })

  // ページ復帰時・タブ切り替え時に再取得（bfcache対策）
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refetch()
      }
    }
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        refetch()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [refetch])

  // 面接データを拡張（API経由で取得したデータにローカルの変更をマージ）
  const enrichedInterviews = useMemo(() => {
    return apiInterviews.map(interview => {
      const project = interview.project
      const candidate = project?.candidate
      const currentConsultantId = localInterviewConsultants[interview.id] || localCandidateConsultants[candidate?.id || ''] || candidate?.consultant_id || null
      const consultant = users.find(u => u.id === currentConsultantId) || candidate?.consultant
      return {
        ...interview,
        project,
        candidate: candidate || undefined,
        consultant,
      }
    }).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [apiInterviews, localInterviewConsultants, localCandidateConsultants, users])

  // 面接レコードの全件 = 求職者ステータスが「調整中」「面接確定済」「実施済」「内定獲得」のいずれかのみ
  const filteredInterviews = useMemo(
    () => enrichedInterviews.filter((i) => isInterviewRelevant(i.candidate?.status)),
    [enrichedInterviews]
  )

  // 調整中タブ用: candidate.status === '面接日程調整中' + 面接未登録の「面接日程調整中」候補
  const candidateIdsInInterviewsList = useMemo(
    () => new Set(enrichedInterviews.map((i) => i.candidate?.id).filter(Boolean) as string[]),
    [enrichedInterviews]
  )
  const reschedulingOnlyCandidates = useMemo(
    () => reschedulingCandidates.filter((c) => !candidateIdsInInterviewsList.has(c.id)),
    [reschedulingCandidates, candidateIdsInInterviewsList]
  )
  const reschedulingList = useMemo(() => {
    const withInterview = enrichedInterviews.filter((i) => i.candidate?.status === '面接日程調整中')
    const placeholders: typeof enrichedInterviews = reschedulingOnlyCandidates.map((c) => ({
      id: `rescheduling-candidate-${c.id}`,
      project_id: '',
      type: 'interview',
      start_at: '',
      end_at: null,
      location: null,
      status: '調整中',
      feedback: null,
      created_at: '',
      project: undefined,
      candidate: { ...c, consultant: c.consultant ?? undefined },
      consultant: c.consultant ?? undefined,
    }))
    return [...withInterview, ...placeholders]
  }, [enrichedInterviews, reschedulingOnlyCandidates])

  // ステータス別集計（candidate.status 基準）
  const reschedulingCount = reschedulingList.length
  const scheduledCount = enrichedInterviews.filter((i) => i.candidate?.status === '面接確定済').length
  const completedCount = enrichedInterviews.filter((i) => i.candidate?.status === '面接実施済（結果待ち）').length
  const offerCount = enrichedInterviews.filter((i) => i.candidate?.status === '内定獲得（承諾確認中）').length

  // 担当者変更ハンドラー
  const handleConsultantChange = useCallback(async (interviewId: string, candidateId: string, consultantId: string) => {
    if (consultantId === 'unassigned') {
      setLocalInterviewConsultants(prev => {
        const updated = { ...prev }
        delete updated[interviewId]
        return updated
      })
      setLocalCandidateConsultants(prev => {
        const updated = { ...prev }
        delete updated[candidateId]
        return updated
      })
      await updateCandidate(candidateId, { consultant_id: null })
    } else {
      setLocalInterviewConsultants(prev => ({ ...prev, [interviewId]: consultantId }))
      setLocalCandidateConsultants(prev => ({ ...prev, [candidateId]: consultantId }))
      await updateCandidate(candidateId, { consultant_id: consultantId })
    }
  }, [updateCandidate])

  // 面接削除ハンドラー
  const handleDeleteInterview = useCallback(async (interviewId: string) => {
    if (!confirm('この面接を削除してよいですか？')) return
    try {
      const res = await fetch(`/api/interviews/${interviewId}`, { method: 'DELETE' })
      if (res.ok) {
        await refetch()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.details || err.error || '削除に失敗しました')
      }
    } catch {
      alert('削除に失敗しました')
    }
  }, [refetch])

  // ローディング中の表示
  if (isLoading) {
    return (
      <AppLayout title="面接一覧" description="データを読み込み中...">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">読み込み中...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="面接一覧" description={`${filteredInterviews.length}件の面接`}>
      {/* サマリーカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">調整中</p>
                <p className="text-2xl font-bold text-slate-800">{reschedulingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">面接確定済み</p>
                <p className="text-2xl font-bold text-slate-800">{scheduledCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">面接実施済み</p>
                <p className="text-2xl font-bold text-slate-800">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                <Gift className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">内定獲得（返事待ち）</p>
                <p className="text-2xl font-bold text-slate-800">{offerCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <div className="flex items-center gap-4 mb-6">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-40 bg-white border-slate-200 shadow-sm">
            <SelectValue placeholder="年月" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {monthOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={consultantFilter} onValueChange={setConsultantFilter}>
          <SelectTrigger className="w-40 bg-white border-slate-200 shadow-sm">
            <SelectValue placeholder="担当者" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">すべて</SelectItem>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* タブ */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="bg-white border border-slate-200 shadow-sm">
          <TabsTrigger 
            value="all"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
          >
            すべて ({filteredInterviews.length})
          </TabsTrigger>
          <TabsTrigger 
            value="rescheduling"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white"
          >
            調整中 ({reschedulingCount})
          </TabsTrigger>
          <TabsTrigger 
            value="scheduled"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white"
          >
            面接確定済み ({scheduledCount})
          </TabsTrigger>
          <TabsTrigger 
            value="completed"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
          >
            面接実施済み ({completedCount})
          </TabsTrigger>
          <TabsTrigger 
            value="offer"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-600 data-[state=active]:text-white"
          >
            内定獲得（返事待ち） ({offerCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <InterviewTable 
            interviews={filteredInterviews}
            users={users}
            onConsultantChange={handleConsultantChange}
            onDelete={handleDeleteInterview}
          />
        </TabsContent>
        <TabsContent value="rescheduling">
          <InterviewTable 
            interviews={reschedulingList}
            users={users}
            onConsultantChange={handleConsultantChange}
            onDelete={handleDeleteInterview}
            isReschedulingTab
          />
        </TabsContent>
        <TabsContent value="scheduled">
          <InterviewTable 
            interviews={filteredInterviews.filter((i) => i.candidate?.status === '面接確定済')}
            users={users}
            onConsultantChange={handleConsultantChange}
            onDelete={handleDeleteInterview}
          />
        </TabsContent>
        <TabsContent value="completed">
          <InterviewTable 
            interviews={filteredInterviews.filter((i) => i.candidate?.status === '面接実施済（結果待ち）')}
            users={users}
            onConsultantChange={handleConsultantChange}
            onDelete={handleDeleteInterview}
          />
        </TabsContent>
        <TabsContent value="offer">
          <InterviewTable 
            interviews={filteredInterviews.filter((i) => i.candidate?.status === '内定獲得（承諾確認中）')}
            users={users}
            onConsultantChange={handleConsultantChange}
            onDelete={handleDeleteInterview}
          />
        </TabsContent>
      </Tabs>
    </AppLayout>
  )
}

export default function InterviewsPage() {
  return (
    <Suspense fallback={
      <AppLayout title="面接一覧" description="読み込み中...">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">読み込み中...</p>
        </div>
      </AppLayout>
    }>
      <InterviewsPageContent />
    </Suspense>
  )
}

interface EnrichedInterview {
  id: string
  project_id: string
  type: string
  start_at: string
  end_at: string | null
  location: string | null
  status: string
  feedback: string | null
  created_at: string
  project?: {
    id: string
    candidate_id: string
    client_name: string
    garden_name?: string | null
    corporation_name?: string | null
    phase: string
    expected_amount?: number | null
    probability?: string | null
    candidate?: {
      id: string
      name: string
      phone: string | null
      status: string
      consultant_id: string | null
      consultant?: {
        id: string
        name: string
      }
    }
  }
  candidate?: {
    id: string
    name: string
    phone: string | null
    status: string
    consultant_id?: string | null
  }
  consultant?: {
    id: string
    name: string
  }
}

interface InterviewTableProps {
  interviews: EnrichedInterview[]
  users: User[]
  onConsultantChange: (interviewId: string, candidateId: string, consultantId: string) => Promise<void>
  onDelete: (interviewId: string) => Promise<void>
  /** 調整中タブ用。面接未登録の候補行（プレースホルダー）を含む */
  isReschedulingTab?: boolean
}

function InterviewTable({ 
  interviews, 
  users,
  onConsultantChange,
  onDelete,
  isReschedulingTab = false,
}: InterviewTableProps) {
  const isPlaceholderRow = (interview: EnrichedInterview) =>
    interview.id.startsWith('rescheduling-candidate-') || !interview.start_at
  const getInterviewDestination = (project?: EnrichedInterview['project']) => {
    const gardenName = project?.garden_name?.trim() || ''
    const corporationName = project?.corporation_name?.trim() || ''
    const fallbackName = project?.client_name?.trim() || ''
    const title = gardenName || fallbackName || corporationName || '-'
    const subtitle = gardenName && corporationName ? corporationName : ''
    return { title, subtitle }
  }

  if (interviews.length === 0) {
    return (
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardContent className="py-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">面接データがありません</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 bg-slate-50">
              <TableHead className="text-slate-600 font-semibold">日時</TableHead>
              <TableHead className="text-slate-600 font-semibold">求職者</TableHead>
              <TableHead className="text-slate-600 font-semibold">面接先</TableHead>
              <TableHead className="text-slate-600 font-semibold">場所</TableHead>
              <TableHead className="text-slate-600 font-semibold">担当者</TableHead>
              <TableHead className="text-slate-600 font-semibold">ステータス</TableHead>
              <TableHead className="text-slate-600 font-semibold">フィードバック</TableHead>
              <TableHead className="text-slate-600 font-semibold w-16">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {interviews.map(interview => {
              const isPlaceholder = isReschedulingTab && isPlaceholderRow(interview)
              return (
              <TableRow key={interview.id} className="border-slate-100 hover:bg-violet-50/50">
                <TableCell>
                  {isPlaceholder ? (
                    <span className="text-slate-400 text-sm">未設定</span>
                  ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 border border-violet-200 flex flex-col items-center justify-center">
                      <span className="text-sm font-bold text-violet-600">
                        {new Date(interview.start_at).getDate()}
                      </span>
                      <span className="text-[10px] text-violet-500">
                        {new Date(interview.start_at).toLocaleDateString('ja-JP', { month: 'short' })}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {new Date(interview.start_at).toLocaleDateString('ja-JP', { weekday: 'short' })}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(interview.start_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-slate-800">{interview.candidate?.name || '-'}</p>
                    <p className="text-xs text-slate-500">{interview.candidate?.id}</p>
                  </div>
                </TableCell>
                <TableCell>
                  {(() => {
                    const destination = getInterviewDestination(interview.project)
                    return (
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-slate-400" />
                        <div className="flex flex-col">
                          <span className="text-slate-700">{destination.title}</span>
                          {destination.subtitle && (
                            <span className="text-xs text-slate-500">法人: {destination.subtitle}</span>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 text-sm">{interview.location || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {isPlaceholder ? (
                    <span className="text-slate-600 text-sm">{interview.consultant?.name || '-'}</span>
                  ) : (
                  <Select
                    value={interview.consultant?.id || ((interview.candidate as Candidate | undefined)?.consultant_id ?? 'unassigned')}
                    onValueChange={(value) => {
                      if (interview.candidate?.id) {
                        onConsultantChange(interview.id, interview.candidate.id, value)
                      }
                    }}
                  >
                    <SelectTrigger className="w-32 h-7 p-0 border-0 bg-transparent hover:bg-slate-100">
                      <SelectValue>
                        <span className="text-slate-600">{interview.consultant?.name || '-'}</span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="unassigned">
                        <span className="text-slate-400">未割り当て</span>
                      </SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  )}
                </TableCell>
                <TableCell>
                  {isPlaceholder ? (
                    <Badge variant="outline" className={interviewStatusColors['調整中']}>
                      調整中
                    </Badge>
                  ) : (() => {
                    const displayStatus = getDisplayStatusFromCandidate(interview.candidate?.status)
                    if (displayStatus) {
                      return (
                        <Badge variant="outline" className={displayStatus.className}>
                          {displayStatus.label}
                        </Badge>
                      )
                    }
                    // 面接関連以外のステータスの場合は候補者ステータスをそのまま表示
                    return (
                      <Badge variant="outline" className={statusColors[interview.candidate?.status as keyof typeof statusColors] || 'bg-slate-100 text-slate-700 border-slate-200'}>
                        {interview.candidate?.status || '-'}
                      </Badge>
                    )
                  })()}
                </TableCell>
                <TableCell>
                  <p className="text-sm text-slate-600 max-w-[200px] truncate">
                    {interview.feedback || '-'}
                  </p>
                </TableCell>
                <TableCell>
                  {!isPlaceholder && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-rose-600"
                      title="この面接を削除"
                      onClick={() => onDelete(interview.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}


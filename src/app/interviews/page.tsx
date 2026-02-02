'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
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
import { Calendar, Clock, MapPin, User as UserIcon, Building, CheckCircle, XCircle } from 'lucide-react'
import {
  interviewStatusLabels,
  interviewStatusColors,
} from '@/lib/mock-data'
import { useInterviews } from '@/hooks/useInterviews'
import { useUsers } from '@/hooks/useUsers'
import { useCandidates } from '@/hooks/useCandidates'
import type { Candidate, User } from '@/types/database'

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

export default function InterviewsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [consultantFilter, setConsultantFilter] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const monthOptions = generateMonthOptions()
  const [localInterviewStatuses, setLocalInterviewStatuses] = useState<Record<string, string>>({})
  const [localInterviewConsultants, setLocalInterviewConsultants] = useState<Record<string, string>>({})
  const [localCandidateConsultants, setLocalCandidateConsultants] = useState<Record<string, string>>({})

  // API経由でデータを取得
  const { interviews: apiInterviews, isLoading, updateInterview, refetch } = useInterviews({
    month: selectedMonth,
    status: statusFilter,
    consultantId: consultantFilter,
  })
  const { users } = useUsers()
  const { updateCandidate } = useCandidates()

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
      const currentStatus = localInterviewStatuses[interview.id] || interview.status
      return {
        ...interview,
        status: currentStatus,
        project,
        candidate: candidate || undefined,
        consultant,
      }
    }).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [apiInterviews, localInterviewStatuses, localInterviewConsultants, localCandidateConsultants, users])

  // フィルタリング（API側で既にフィルタリングされている）
  const filteredInterviews = enrichedInterviews

  // ステータス別集計
  const reschedulingCount = enrichedInterviews.filter(i => i.status === 'rescheduling').length
  const scheduledCount = enrichedInterviews.filter(i => i.status === 'scheduled').length
  const completedCount = enrichedInterviews.filter(i => i.status === 'completed').length

  // ステータス変更ハンドラー
  const handleStatusChange = useCallback(async (interviewId: string, newStatus: string) => {
    setLocalInterviewStatuses(prev => ({ ...prev, [interviewId]: newStatus }))
    await updateInterview(interviewId, { status: newStatus as 'scheduled' | 'completed' | 'cancelled' | 'rescheduling' })
  }, [updateInterview])

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
      <div className="grid grid-cols-3 gap-4 mb-6">
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
                <p className="text-xs text-slate-500">実施中</p>
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
                <p className="text-xs text-slate-500">実施済</p>
                <p className="text-2xl font-bold text-slate-800">{completedCount}</p>
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
            調整中 ({filteredInterviews.filter(i => i.status === 'rescheduling').length})
          </TabsTrigger>
          <TabsTrigger 
            value="scheduled"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white"
          >
            実施中 ({filteredInterviews.filter(i => i.status === 'scheduled').length})
          </TabsTrigger>
          <TabsTrigger 
            value="completed"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
          >
            実施済 ({filteredInterviews.filter(i => i.status === 'completed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <InterviewTable 
            interviews={filteredInterviews}
            users={users}
            onStatusChange={handleStatusChange}
            onConsultantChange={handleConsultantChange}
          />
        </TabsContent>
        <TabsContent value="rescheduling">
          <InterviewTable 
            interviews={filteredInterviews.filter(i => i.status === 'rescheduling')}
            users={users}
            onStatusChange={handleStatusChange}
            onConsultantChange={handleConsultantChange}
          />
        </TabsContent>
        <TabsContent value="scheduled">
          <InterviewTable 
            interviews={filteredInterviews.filter(i => i.status === 'scheduled')}
            users={users}
            onStatusChange={handleStatusChange}
            onConsultantChange={handleConsultantChange}
          />
        </TabsContent>
        <TabsContent value="completed">
          <InterviewTable 
            interviews={filteredInterviews.filter(i => i.status === 'completed')}
            users={users}
            onStatusChange={handleStatusChange}
            onConsultantChange={handleConsultantChange}
          />
        </TabsContent>
      </Tabs>
    </AppLayout>
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
  onStatusChange: (interviewId: string, newStatus: string) => Promise<void>
  onConsultantChange: (interviewId: string, candidateId: string, consultantId: string) => Promise<void>
}

function InterviewTable({ 
  interviews, 
  users,
  onStatusChange,
  onConsultantChange,
}: InterviewTableProps) {
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {interviews.map(interview => (
              <TableRow key={interview.id} className="border-slate-100 hover:bg-violet-50/50">
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-slate-800">{interview.candidate?.name || '-'}</p>
                    <p className="text-xs text-slate-500">{interview.candidate?.id}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700">{interview.project?.client_name || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600 text-sm">{interview.location || '-'}</span>
                  </div>
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <Select
                    value={interview.status}
                    onValueChange={(value) => {
                      onStatusChange(interview.id, value)
                    }}
                  >
                    <SelectTrigger className="w-32 h-7 p-0 border-0 bg-transparent hover:bg-slate-100">
                      <SelectValue>
                        <Badge variant="outline" className={interviewStatusColors[interview.status]}>
                          {interviewStatusLabels[interview.status]}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {Object.entries(interviewStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          <Badge variant="outline" className={interviewStatusColors[value]}>
                            {label}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <p className="text-sm text-slate-600 max-w-[200px] truncate">
                    {interview.feedback || '-'}
                  </p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}


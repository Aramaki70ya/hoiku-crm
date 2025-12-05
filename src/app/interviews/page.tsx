'use client'

import { useState, useMemo } from 'react'
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
import { Calendar, Clock, MapPin, User, Building, CheckCircle, XCircle } from 'lucide-react'
import {
  mockInterviews,
  mockProjects,
  mockCandidates,
  mockUsers,
  interviewStatusLabels,
  interviewStatusColors,
} from '@/lib/mock-data'

export default function InterviewsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [consultantFilter, setConsultantFilter] = useState<string>('all')

  // 面接データを拡張
  const enrichedInterviews = useMemo(() => {
    return mockInterviews.map(interview => {
      const project = mockProjects.find(p => p.id === interview.project_id)
      const candidate = mockCandidates.find(c => c.id === project?.candidate_id)
      const consultant = mockUsers.find(u => u.id === candidate?.consultant_id)
      return {
        ...interview,
        project,
        candidate,
        consultant,
      }
    }).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }, [])

  // フィルタリング
  const filteredInterviews = useMemo(() => {
    return enrichedInterviews.filter(interview => {
      if (statusFilter !== 'all' && interview.status !== statusFilter) {
        return false
      }
      if (consultantFilter !== 'all' && interview.consultant?.id !== consultantFilter) {
        return false
      }
      return true
    })
  }, [enrichedInterviews, statusFilter, consultantFilter])

  // ステータス別集計
  const scheduledCount = enrichedInterviews.filter(i => i.status === 'scheduled').length
  const completedCount = enrichedInterviews.filter(i => i.status === 'completed').length

  return (
    <AppLayout title="面接一覧" description={`${filteredInterviews.length}件の面接`}>
      {/* サマリーカード */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">予定</p>
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
                <p className="text-xs text-slate-500">完了</p>
                <p className="text-2xl font-bold text-slate-800">{completedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">今月の成約</p>
                <p className="text-2xl font-bold text-emerald-600">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <User className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">面接→成約率</p>
                <p className="text-2xl font-bold text-violet-600">60%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <div className="flex items-center gap-4 mb-6">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white border-slate-200 shadow-sm">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">すべて</SelectItem>
            {Object.entries(interviewStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={consultantFilter} onValueChange={setConsultantFilter}>
          <SelectTrigger className="w-40 bg-white border-slate-200 shadow-sm">
            <SelectValue placeholder="担当者" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">すべて</SelectItem>
            {mockUsers.map(user => (
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
            value="scheduled"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600 data-[state=active]:text-white"
          >
            予定 ({filteredInterviews.filter(i => i.status === 'scheduled').length})
          </TabsTrigger>
          <TabsTrigger 
            value="completed"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white"
          >
            完了 ({filteredInterviews.filter(i => i.status === 'completed').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <InterviewTable interviews={filteredInterviews} />
        </TabsContent>
        <TabsContent value="scheduled">
          <InterviewTable interviews={filteredInterviews.filter(i => i.status === 'scheduled')} />
        </TabsContent>
        <TabsContent value="completed">
          <InterviewTable interviews={filteredInterviews.filter(i => i.status === 'completed')} />
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
    expected_amount: number | null
    probability: string | null
  }
  candidate?: {
    id: string
    name: string
    phone: string | null
    status: string
  }
  consultant?: {
    id: string
    name: string
  }
}

function InterviewTable({ interviews }: { interviews: EnrichedInterview[] }) {
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
                  <span className="text-slate-600">{interview.consultant?.name || '-'}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={interviewStatusColors[interview.status]}>
                    {interviewStatusLabels[interview.status]}
                  </Badge>
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


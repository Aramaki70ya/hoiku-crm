'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
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
import { 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  ChevronRight, 
  Users, 
  Star, 
  ClipboardList,
  AlertTriangle,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { 
  statusLabels, 
  statusColors, 
  priorityColors, 
  sourcePriorityRules
} from '@/lib/mock-data'
import { useCandidates } from '@/hooks/useCandidates'
import { useUsers } from '@/hooks/useUsers'
import type { Contract, CandidateWithRelations } from '@/types/database'

// アプローチ優先度を取得する関数（タスク画面用）
const getApproachPriority = (candidate: CandidateWithRelations) => {
  if (candidate.approach_priority) {
    return candidate.approach_priority
  }
  // 登録経路による自動判定
  const sourceId = candidate.source_id
  if (sourceId && sourcePriorityRules[sourceId]) {
    return sourcePriorityRules[sourceId] as 'S' | 'A' | 'B' | 'C'
  }
  return 'B' as const
}

// 優先度の順序
const priorityOrder: Record<string, number> = {
  'S': 0,
  'A': 1,
  'B': 2,
  'C': 3,
}

// アクティブなステータス（進行中の案件）
const activeStatuses = ['new', 'contacting', 'first_contact_done', 'proposing', 'interviewing', 'offer']

export default function CandidatesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [consultantFilter, setConsultantFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'tasks'>('all')
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({})
  const [localConsultants, setLocalConsultants] = useState<Record<string, string>>({})
  const [localPriorities, setLocalPriorities] = useState<Record<string, 'S' | 'A' | 'B' | 'C'>>({})
  const [localEmploymentTypes, setLocalEmploymentTypes] = useState<Record<string, string>>({})
  const [contracts, setContracts] = useState<Contract[]>([])

  // API経由でデータを取得
  const { candidates: rawCandidates, isLoading, updateCandidate } = useCandidates({
    search: searchQuery,
  })
  const { consultants, users } = useUsers()

  // ステータス変更ハンドラー
  const handleStatusChange = useCallback(async (candidateId: string, newStatus: string) => {
    setLocalStatuses(prev => ({ ...prev, [candidateId]: newStatus }))
    
    // API経由で更新
    await updateCandidate(candidateId, { status: newStatus as Contract['candidate_id'] extends string ? 'new' | 'contacting' | 'first_contact_done' | 'proposing' | 'interviewing' | 'offer' | 'closed_won' | 'closed_lost' | 'pending' | 'on_hold' : never })
    
    // ステータスが「成約」になった場合、成約データを作成
    if (newStatus === 'closed_won') {
      const existingContract = contracts.find(c => c.candidate_id === candidateId)
      if (!existingContract) {
        const newContract: Contract = {
          id: `c${Date.now()}`,
          candidate_id: candidateId,
          project_id: null,
          contracted_at: new Date().toISOString(),
          accepted_date: new Date().toISOString().split('T')[0],
          entry_date: null,
          employment_restriction_until: null,
          employment_type: null,
          job_type: null,
          revenue_excluding_tax: 0,
          revenue_including_tax: 0,
          payment_date: null,
          payment_scheduled_date: null,
          invoice_sent_date: null,
          calculation_basis: null,
          document_url: null,
          placement_company: null,
          placement_company_name: null,
          placement_facility_name: null,
          note: null,
          is_cancelled: null,
          refund_required: null,
          refund_date: null,
          refund_amount: null,
          cancellation_reason: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setContracts(prev => [...prev, newContract])
      }
    }
  }, [updateCandidate, contracts])

  // 担当者変更ハンドラー
  const handleConsultantChange = useCallback(async (candidateId: string, consultantId: string) => {
    if (consultantId === 'unassigned') {
      setLocalConsultants(prev => {
        const updated = { ...prev }
        delete updated[candidateId]
        return updated
      })
      await updateCandidate(candidateId, { consultant_id: null })
    } else {
      setLocalConsultants(prev => ({ ...prev, [candidateId]: consultantId }))
      await updateCandidate(candidateId, { consultant_id: consultantId })
    }
  }, [updateCandidate])

  // 優先度変更ハンドラー
  const handlePriorityChange = useCallback(async (candidateId: string, priority: 'S' | 'A' | 'B' | 'C') => {
    setLocalPriorities(prev => ({ ...prev, [candidateId]: priority }))
    await updateCandidate(candidateId, { approach_priority: priority })
  }, [updateCandidate])

  // 雇用形態変更ハンドラー
  const handleEmploymentTypeChange = useCallback(async (candidateId: string, employmentType: string) => {
    const value = employmentType === 'unset' ? null : employmentType
    setLocalEmploymentTypes(prev => ({ ...prev, [candidateId]: value || '' }))
    await updateCandidate(candidateId, { desired_employment_type: value })
  }, [updateCandidate])

  // 優先度別カウント（タスクタブ用）
  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0 }
    
    rawCandidates
      .filter(c => activeStatuses.includes(localStatuses[c.id] || c.status))
      .forEach(c => {
        const priority = localPriorities[c.id] || getApproachPriority(c)
        counts[priority]++
      })
    
    return counts
  }, [rawCandidates, localStatuses, localPriorities])

  // フィルタリング
  const filteredCandidates = useMemo(() => {
    let filtered = rawCandidates.filter((candidate) => {
      // 変更されたステータスを取得
      const currentStatus = localStatuses[candidate.id] || candidate.status
      
      // タブによるフィルタ
      if (activeTab === 'tasks' && !activeStatuses.includes(currentStatus)) {
        return false
      }

      // ステータスフィルタ
      if (statusFilter !== 'all' && currentStatus !== statusFilter) {
        return false
      }

      // 担当者フィルタ
      const currentConsultantIdForFilter = localConsultants[candidate.id] || candidate.consultant_id
      if (consultantFilter !== 'all' && currentConsultantIdForFilter !== consultantFilter) {
        return false
      }

      // 優先度フィルタ（タスクタブのみ）
      if (activeTab === 'tasks' && priorityFilter !== 'all') {
        const currentPriority = localPriorities[candidate.id] || getApproachPriority(candidate)
        if (currentPriority !== priorityFilter) return false
      }

      return true
    }).map(candidate => {
      const approachPriority = localPriorities[candidate.id] || getApproachPriority(candidate)
      return {
        ...candidate,
        status: localStatuses[candidate.id] || candidate.status,
        consultant_id: localConsultants[candidate.id] || candidate.consultant_id,
        approach_priority: approachPriority,
      }
    })

    // タスクタブの場合は優先度でソート
    if (activeTab === 'tasks') {
      filtered = filtered.sort((a, b) => {
        return priorityOrder[a.approach_priority || 'B'] - priorityOrder[b.approach_priority || 'B']
      })
    }

    return filtered
  }, [rawCandidates, statusFilter, consultantFilter, priorityFilter, activeTab, localStatuses, localConsultants, localPriorities])

  const allCount = rawCandidates.length
  const taskCount = rawCandidates.filter(c => activeStatuses.includes(localStatuses[c.id] || c.status)).length

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  // ローディング中の表示
  if (isLoading) {
    return (
      <AppLayout title="求職者管理" description="データを読み込み中...">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">読み込み中...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="求職者管理" description={`${filteredCandidates.length}件の求職者`}>
      {/* タブ */}
      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v as 'all' | 'tasks')
        // タブ切り替え時にフィルターをリセット
        if (v !== 'tasks') {
          setPriorityFilter('all')
        }
      }} className="mb-6">
        <TabsList className="bg-white border border-slate-200 shadow-sm">
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
          >
            <Users className="w-4 h-4 mr-2" />
            全体 ({allCount})
          </TabsTrigger>
          <TabsTrigger 
            value="tasks"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            今日のタスク ({taskCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* タスクタブの場合：優先度サマリーカード */}
      {activeTab === 'tasks' && (
        <>
          <div className="mb-4 text-sm text-slate-600">
            {today}
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card 
              className={`cursor-pointer transition-all ${priorityFilter === 'S' ? 'ring-2 ring-rose-400' : ''}`}
              onClick={() => setPriorityFilter(priorityFilter === 'S' ? 'all' : 'S')}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">最優先（S）</p>
                    <p className="text-3xl font-bold text-rose-600">{priorityCounts.S}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-rose-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${priorityFilter === 'A' ? 'ring-2 ring-orange-400' : ''}`}
              onClick={() => setPriorityFilter(priorityFilter === 'A' ? 'all' : 'A')}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">高優先度（A）</p>
                    <p className="text-3xl font-bold text-orange-600">{priorityCounts.A}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <Star className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${priorityFilter === 'B' ? 'ring-2 ring-blue-400' : ''}`}
              onClick={() => setPriorityFilter(priorityFilter === 'B' ? 'all' : 'B')}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">中優先度（B）</p>
                    <p className="text-3xl font-bold text-blue-600">{priorityCounts.B}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer transition-all ${priorityFilter === 'C' ? 'ring-2 ring-slate-400' : ''}`}
              onClick={() => setPriorityFilter(priorityFilter === 'C' ? 'all' : 'C')}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">低優先度（C）</p>
                    <p className="text-3xl font-bold text-slate-600">{priorityCounts.C}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-slate-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* フィルターバー */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="氏名、ID、電話番号で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white border-slate-200 text-slate-700 shadow-sm"
          />
        </div>

        {/* ステータスフィルター */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 font-medium">ステータス:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 bg-white border-slate-200 text-slate-700 shadow-sm">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="all">すべて</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 担当者フィルター */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 font-medium">担当者:</span>
          <Select value={consultantFilter} onValueChange={setConsultantFilter}>
            <SelectTrigger className="w-40 bg-white border-slate-200 text-slate-700 shadow-sm">
              <SelectValue placeholder="担当者" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="all">すべて</SelectItem>
              {consultants.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md ml-auto">
          <Plus className="w-4 h-4 mr-2" />
          新規登録
        </Button>
      </div>

      {/* テーブル */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-slate-600 font-semibold w-16">ランク</TableHead>
              <TableHead className="text-slate-600 font-semibold w-20">優先度</TableHead>
              <TableHead className="text-slate-600 font-semibold">氏名</TableHead>
              <TableHead className="text-slate-600 font-semibold">連絡先</TableHead>
              <TableHead className="text-slate-600 font-semibold">雇用形態</TableHead>
              <TableHead className="text-slate-600 font-semibold">ステータス</TableHead>
              <TableHead className="text-slate-600 font-semibold w-1/4">メモ</TableHead>
              <TableHead className="text-slate-600 font-semibold">希望職種</TableHead>
              <TableHead className="text-slate-600 font-semibold">担当者</TableHead>
              <TableHead className="text-slate-600 font-semibold">登録日</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCandidates.map((candidate) => {
              const currentConsultantId = localConsultants[candidate.id] || candidate.consultant_id
              const consultant = users.find((u) => u.id === currentConsultantId)
              const rank = candidate.rank
              const approachPriority = candidate.approach_priority || 'B'
              
              return (
                <TableRow
                  key={candidate.id}
                  className={`border-slate-100 transition-colors ${
                    activeTab === 'tasks' && approachPriority === 'S' 
                      ? 'bg-rose-50/50 hover:bg-rose-50' 
                      : activeTab === 'tasks' && approachPriority === 'A'
                      ? 'bg-orange-50/30 hover:bg-orange-50/50'
                      : 'hover:bg-violet-50/50'
                  } cursor-pointer`}
                >
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${rank ? priorityColors[rank] : 'bg-slate-100 text-slate-500 border-slate-200'} font-bold`}
                    >
                      {rank === 'S' && <Star className="w-3 h-3 mr-1 fill-current" />}
                      {rank || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={approachPriority}
                      onValueChange={(value: 'S' | 'A' | 'B' | 'C') => {
                        handlePriorityChange(candidate.id, value)
                      }}
                    >
                      <SelectTrigger className="w-20 h-7 p-0 border-0 bg-transparent hover:bg-slate-100">
                        <SelectValue>
                          <Badge
                            variant="outline"
                            className={`${priorityColors[approachPriority]} font-bold cursor-pointer`}
                          >
                            {approachPriority === 'S' && <Star className="w-3 h-3 mr-1 fill-current" />}
                            {approachPriority}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="S">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={priorityColors['S']}>
                              <Star className="w-3 h-3 mr-1 fill-current" />S
                            </Badge>
                            <span>最優先</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="A">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={priorityColors['A']}>A</Badge>
                            <span>高</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="B">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={priorityColors['B']}>B</Badge>
                            <span>中</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="C">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={priorityColors['C']}>C</Badge>
                            <span>低</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div>
                      <Link 
                        href={`/candidates/${candidate.id}`}
                        className="font-medium text-slate-800 hover:text-violet-600 hover:underline transition-colors"
                      >
                        {candidate.name}
                      </Link>
                      <div className="text-sm text-slate-500">
                        {candidate.age && `${candidate.age}歳`}
                        {candidate.prefecture && ` / ${candidate.prefecture}`}
                        {candidate.address && ` ${candidate.address}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {candidate.phone && (
                        <a 
                          href={`tel:${candidate.phone}`}
                          className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {candidate.phone}
                        </a>
                      )}
                      {candidate.email && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-500 truncate max-w-[200px]">
                          <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          {candidate.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={localEmploymentTypes[candidate.id] || candidate.desired_employment_type || 'unset'}
                      onValueChange={(value) => {
                        handleEmploymentTypeChange(candidate.id, value)
                      }}
                    >
                      <SelectTrigger className="w-32 h-7 p-0 border-0 bg-transparent hover:bg-slate-100">
                        <SelectValue>
                          <span className="text-slate-600 text-sm">
                            {(localEmploymentTypes[candidate.id] || candidate.desired_employment_type) || '-'}
                          </span>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="unset">未設定</SelectItem>
                        <SelectItem value="正社員">正社員</SelectItem>
                        <SelectItem value="パート">パート</SelectItem>
                        <SelectItem value="アルバイト">アルバイト</SelectItem>
                        <SelectItem value="契約社員">契約社員</SelectItem>
                        <SelectItem value="派遣">派遣</SelectItem>
                        <SelectItem value="業務委託">業務委託</SelectItem>
                        <SelectItem value="正社員, パート">正社員, パート</SelectItem>
                        <SelectItem value="パート, アルバイト">パート, アルバイト</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={candidate.status}
                      onValueChange={(value) => {
                        handleStatusChange(candidate.id, value)
                      }}
                    >
                      <SelectTrigger className="w-32 h-7 p-0 border-0 bg-transparent hover:bg-slate-100">
                        <SelectValue>
                          <Badge
                            variant="outline"
                            className={statusColors[candidate.status]}
                          >
                            {statusLabels[candidate.status]}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={statusColors[value]}>
                                {label}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {candidate.memo ? (
                      <div className="flex flex-col gap-1">
                        <div className="text-sm text-slate-700">
                          {candidate.memo}
                        </div>
                        {candidate.updated_at && (
                          <div className="text-xs text-slate-400">
                            {new Date(candidate.updated_at).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {candidate.desired_job_type || '-'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={currentConsultantId || 'unassigned'}
                      onValueChange={(value) => {
                        handleConsultantChange(candidate.id, value)
                      }}
                    >
                      <SelectTrigger className="w-32 h-7 p-0 border-0 bg-transparent hover:bg-slate-100">
                        <SelectValue>
                          <span className="text-slate-600">{consultant?.name || '-'}</span>
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
                  <TableCell className="text-slate-500 text-sm">
                    {candidate.registered_at}
                  </TableCell>
                  <TableCell>
                    <Link href={`/candidates/${candidate.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-violet-600 hover:bg-violet-100"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* タスクタブの場合：優先度の説明 */}
      {activeTab === 'tasks' && (
        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="font-medium text-slate-700 mb-3">優先度について</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={priorityColors['S']}>
                <Star className="w-3 h-3 mr-1 fill-current" />S
              </Badge>
              <span className="text-slate-600">最優先：本日中に対応必須</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={priorityColors['A']}>A</Badge>
              <span className="text-slate-600">高：できれば本日中に対応</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={priorityColors['B']}>B</Badge>
              <span className="text-slate-600">中：今週中に対応</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={priorityColors['C']}>C</Badge>
              <span className="text-slate-600">低：フォロー・定期連絡</span>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

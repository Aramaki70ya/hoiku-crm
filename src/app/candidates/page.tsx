'use client'

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { 
  priorityColors, 
  sourcePriorityRules
} from '@/lib/mock-data'
import {
  STATUS_LIST,
  statusLabels,
  statusColors,
  mapLegacyStatusToNewStatus,
  type StatusType
} from '@/lib/status-mapping'
import { useCandidates } from '@/hooks/useCandidates'
import { useUsers } from '@/hooks/useUsers'
import { useSources } from '@/hooks/useSources'
import type { CandidateWithRelations } from '@/types/database'

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
const activeStatuses: StatusType[] = [
  '初回連絡中',
  '連絡つかず（初回未接触）',
  '提案求人選定中',
  '求人提案済（返信待ち）',
  '書類選考中',
  '面接日程調整中',
  '面接確定済',
  '面接実施済（結果待ち）',
  '内定獲得（承諾確認中）',
  '見学提案~設定',
  '再ヒアリング・条件変更あり',
  '初回ヒアリング実施済',
]

function CandidatesPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchInputValue, setSearchInputValue] = useState('') // 入力欄の値（入力中）
  const [searchQuery, setSearchQuery] = useState('') // 実際に検索に使う値（Enterで適用）
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'tasks'>('all')
  const [sortBy, setSortBy] = useState<'registered_at' | 'priority' | 'name' | 'status'>('registered_at')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [localConsultants, setLocalConsultants] = useState<Record<string, string>>({})
  const [localPriorities, setLocalPriorities] = useState<Record<string, 'S' | 'A' | 'B' | 'C'>>({})
  const [localEmploymentTypes, setLocalEmploymentTypes] = useState<Record<string, string>>({})

  // 新規登録ダイアログ
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    kana: '',
    phone: '',
    email: '',
    birth_date: '',
    prefecture: '',
    address: '',
    qualification: '',
    desired_employment_type: '',
    desired_job_type: '',
    source_id: '',
    consultant_id: '',
    approach_priority: '' as '' | 'S' | 'A' | 'B' | 'C',
    memo: '',
  })

  const { consultants, users } = useUsers()

  const consultantFilter = useMemo(() => {
    const q = searchParams.get('consultant') ?? 'all'
    if (q === 'all') return 'all'
    if (consultants.some((u) => u.id === q)) return q
    return 'all'
  }, [searchParams, consultants])

  const { candidates: rawCandidates, total: apiTotal, isLoading, createCandidate, updateCandidate, refetch } = useCandidates({
    search: searchQuery,
    consultantId: consultantFilter,
    // 担当フィルタ時は全件出したいので上限を上げる（Supabase は 1000 までなので 1000）
    limit: consultantFilter !== 'all' ? 1000 : 100,
  })
  const { sources } = useSources()
  const consultantLabel = consultantFilter !== 'all' ? consultants.find((u) => u.id === consultantFilter)?.name : null

  // タブ復帰・bfcache 復元時に DB 最新を反映
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) refetch()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pageshow', onPageShow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [refetch])

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

  // 新規登録ハンドラー
  const handleCreateCandidate = async () => {
    if (!newCandidate.name.trim()) {
      alert('氏名は必須です')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createCandidate({
        name: newCandidate.name,
        kana: newCandidate.kana || null,
        phone: newCandidate.phone || null,
        email: newCandidate.email || null,
        birth_date: newCandidate.birth_date || null,
        prefecture: newCandidate.prefecture || null,
        address: newCandidate.address || null,
        qualification: newCandidate.qualification || null,
        desired_employment_type: newCandidate.desired_employment_type || null,
        desired_job_type: newCandidate.desired_job_type || null,
        source_id: newCandidate.source_id || null,
        consultant_id: newCandidate.consultant_id || null,
        approach_priority: newCandidate.approach_priority || null,
        memo: newCandidate.memo || null,
      })

      if (result) {
        // 成功したらダイアログを閉じてフォームをリセット
        setIsNewDialogOpen(false)
        setNewCandidate({
          name: '',
          kana: '',
          phone: '',
          email: '',
          birth_date: '',
          prefecture: '',
          address: '',
          qualification: '',
          desired_employment_type: '',
          desired_job_type: '',
          source_id: '',
          consultant_id: '',
          approach_priority: '',
          memo: '',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // ダイアログを開く
  const handleOpenNewDialog = () => {
    setNewCandidate({
      name: '',
      kana: '',
      phone: '',
      email: '',
      birth_date: '',
      prefecture: '',
      address: '',
      qualification: '',
      desired_employment_type: '',
      desired_job_type: '',
      source_id: '',
      consultant_id: '',
      approach_priority: '',
      memo: '',
    })
    setIsNewDialogOpen(true)
  }

  // 優先度別カウント（タスクタブ用）
  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0 }
    rawCandidates
      .filter(c => {
        const mappedStatus = mapLegacyStatusToNewStatus(c.status)
        return activeStatuses.includes(mappedStatus)
      })
      .forEach(c => {
        const priority = localPriorities[c.id] || getApproachPriority(c)
        counts[priority]++
      })
    return counts
  }, [rawCandidates, localPriorities])

  // フィルタリング（ステータスは DB のみ参照）
  const filteredCandidates = useMemo(() => {
    let filtered = rawCandidates.filter((candidate) => {
      const currentStatus = mapLegacyStatusToNewStatus(candidate.status)

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
        consultant_id: localConsultants[candidate.id] || candidate.consultant_id,
        approach_priority: approachPriority,
      }
    })

    // 並び替え
    filtered = filtered.sort((a, b) => {
      let compare = 0
      
      if (sortBy === 'registered_at') {
        const dateA = a.registered_at ? new Date(a.registered_at).getTime() : 0
        const dateB = b.registered_at ? new Date(b.registered_at).getTime() : 0
        compare = dateA - dateB
      } else if (sortBy === 'priority') {
        const priorityA = priorityOrder[a.approach_priority || 'B']
        const priorityB = priorityOrder[b.approach_priority || 'B']
        compare = priorityA - priorityB
      } else if (sortBy === 'name') {
        const nameA = (a.kana || a.name || '').toLowerCase()
        const nameB = (b.kana || b.name || '').toLowerCase()
        compare = nameA.localeCompare(nameB, 'ja')
      } else if (sortBy === 'status') {
        const statusA = mapLegacyStatusToNewStatus(a.status)
        const statusB = mapLegacyStatusToNewStatus(b.status)
        compare = statusA.localeCompare(statusB, 'ja')
      }
      
      return sortOrder === 'asc' ? compare : -compare
    })
    
    return filtered
  }, [rawCandidates, statusFilter, consultantFilter, priorityFilter, activeTab, sortBy, sortOrder, localConsultants, localPriorities])

  const allCount = rawCandidates.length
  const taskCount = rawCandidates.filter(c => {
    const mappedStatus = mapLegacyStatusToNewStatus(c.status)
    return activeStatuses.includes(mappedStatus)
  }).length

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

      {/* タスクタブの場合：優先度サマリーカード（コンパクト版） */}
      {activeTab === 'tasks' && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-slate-500">{today}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPriorityFilter(priorityFilter === 'S' ? 'all' : 'S')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                priorityFilter === 'S' 
                  ? 'bg-rose-500 text-white shadow-md' 
                  : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              S: {priorityCounts.S}
            </button>
            <button
              onClick={() => setPriorityFilter(priorityFilter === 'A' ? 'all' : 'A')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                priorityFilter === 'A' 
                  ? 'bg-orange-500 text-white shadow-md' 
                  : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              A: {priorityCounts.A}
            </button>
            <button
              onClick={() => setPriorityFilter(priorityFilter === 'B' ? 'all' : 'B')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                priorityFilter === 'B' 
                  ? 'bg-blue-500 text-white shadow-md' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              B: {priorityCounts.B}
            </button>
            <button
              onClick={() => setPriorityFilter(priorityFilter === 'C' ? 'all' : 'C')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                priorityFilter === 'C' 
                  ? 'bg-slate-500 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              C: {priorityCounts.C}
            </button>
          </div>
        </div>
      )}

      {/* フィルターバー */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="氏名、ID、電話番号で検索... (Enterで検索)"
            value={searchInputValue}
            onChange={(e) => setSearchInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                setSearchQuery(searchInputValue)
              }
            }}
            className="pl-9 bg-white border-slate-200 text-slate-700 shadow-sm"
          />
        </div>

        {/* ステータスフィルター */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 font-medium">ステータス:</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40 h-9 bg-white border-2 border-violet-300 text-slate-800 font-medium shadow-md rounded-md hover:border-violet-400 hover:bg-violet-50/50 focus:ring-2 focus:ring-violet-400/50">
              <SelectValue placeholder="ステータス" />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="all">すべて</SelectItem>
              {STATUS_LIST.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 担当者フィルター（URLで保持し、詳細→戻るで復元） */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 font-medium">担当者:</span>
          <Select
            value={consultantFilter}
            onValueChange={(v) => {
              const path = v === 'all' ? '/candidates' : `/candidates?consultant=${v}`
              router.replace(path)
            }}
          >
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

        {/* 並び替え */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 font-medium">並び替え:</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-36 bg-white border-slate-200 text-slate-700 shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200">
              <SelectItem value="registered_at">登録日</SelectItem>
              <SelectItem value="priority">優先度</SelectItem>
              <SelectItem value="name">名前</SelectItem>
              <SelectItem value="status">ステータス</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="bg-white border-slate-200 text-slate-700 shadow-sm"
            title={sortOrder === 'asc' ? '昇順' : '降順'}
          >
            {sortOrder === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
          </Button>
        </div>

        <Button 
          onClick={handleOpenNewDialog}
          className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md ml-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          新規登録
        </Button>
      </div>

      {/* 担当・検索の絞り込み状況（原因調査用） */}
      {(consultantLabel || searchQuery) && (
        <div className="mb-3 px-1 text-sm text-slate-500">
          {consultantLabel && <span>担当者「{consultantLabel}」で絞り込み中。</span>}
          {searchQuery && <span>{consultantLabel ? ' さらに検索「' : '検索「'}{searchQuery}」を適用しています。検索欄を空にすると該当担当の全員が表示されます。</span>}
        </div>
      )}
      {consultantFilter !== 'all' && apiTotal > rawCandidates.length && (
        <div className="mb-3 px-1 text-sm text-amber-600">
          該当は全{apiTotal}件あります。表示は最大1000件までです。検索で絞ると一覧しやすくなります。
        </div>
      )}

      {/* テーブル */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-slate-600 font-semibold w-16">ランク</TableHead>
              <TableHead className="text-slate-600 font-semibold w-20">優先度</TableHead>
              <TableHead className="text-slate-600 font-semibold w-40">氏名</TableHead>
              <TableHead className="text-slate-600 font-semibold">連絡先</TableHead>
              <TableHead className="text-slate-600 font-semibold">雇用形態</TableHead>
              <TableHead className="text-slate-600 font-semibold">ステータス</TableHead>
              <TableHead className="text-slate-600 font-semibold w-[200px] max-w-[200px]">メモ</TableHead>
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
                  <TableCell className="max-w-40">
                    <div className="truncate">
                      <Link 
                        href={consultantFilter !== 'all' ? `/candidates/${candidate.id}?consultant=${consultantFilter}` : `/candidates/${candidate.id}`}
                        className="font-medium text-slate-800 hover:text-violet-600 hover:underline transition-colors"
                      >
                        {candidate.name}
                      </Link>
                      <div className="text-sm text-slate-500 truncate">
                        {candidate.age != null && candidate.age < 120 ? `${candidate.age}歳` : '—'}
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
                    {(() => {
                      const currentStatus = mapLegacyStatusToNewStatus(candidate.status)
                      return (
                        <Badge
                          variant="outline"
                          className={statusColors[currentStatus] || 'bg-slate-100 text-slate-700 border-slate-200'}
                        >
                          {statusLabels[currentStatus] || currentStatus}
                        </Badge>
                      )
                    })()}
                  </TableCell>
                  <TableCell className="w-[200px] max-w-[200px] p-2 align-middle">
                    {candidate.memo ? (
                      <div className="flex flex-col gap-1 max-w-full">
                        <div className="text-sm text-slate-700 overflow-x-auto overflow-y-hidden whitespace-nowrap max-w-[200px]">
                          {candidate.memo}
                        </div>
                        {candidate.updated_at && (
                          <div className="text-xs text-slate-400 shrink-0">
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
                  <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                    {candidate.registered_at
                      ? candidate.registered_at.replace(/^(\d{4})-(\d{2})-(\d{2}).*/, '$1/$2/$3')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Link href={consultantFilter !== 'all' ? `/candidates/${candidate.id}?consultant=${consultantFilter}` : `/candidates/${candidate.id}`}>
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

      {/* 新規登録ダイアログ */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">求職者 新規登録</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">基本情報</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700">
                    氏名 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={newCandidate.name}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="山田 太郎"
                    className="border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="kana" className="text-slate-700">フリガナ</Label>
                  <Input
                    id="kana"
                    value={newCandidate.kana}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, kana: e.target.value }))}
                    placeholder="ヤマダ タロウ"
                    className="border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-700">電話番号</Label>
                  <Input
                    id="phone"
                    value={newCandidate.phone}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="090-1234-5678"
                    className="border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCandidate.email}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="example@email.com"
                    className="border-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date" className="text-slate-700">生年月日</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={newCandidate.birth_date}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, birth_date: e.target.value }))}
                    className="border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prefecture" className="text-slate-700">都道府県</Label>
                  <Select
                    value={newCandidate.prefecture}
                    onValueChange={(value) => setNewCandidate(prev => ({ ...prev, prefecture: value }))}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 max-h-60">
                      <SelectItem value="北海道">北海道</SelectItem>
                      <SelectItem value="青森県">青森県</SelectItem>
                      <SelectItem value="岩手県">岩手県</SelectItem>
                      <SelectItem value="宮城県">宮城県</SelectItem>
                      <SelectItem value="秋田県">秋田県</SelectItem>
                      <SelectItem value="山形県">山形県</SelectItem>
                      <SelectItem value="福島県">福島県</SelectItem>
                      <SelectItem value="茨城県">茨城県</SelectItem>
                      <SelectItem value="栃木県">栃木県</SelectItem>
                      <SelectItem value="群馬県">群馬県</SelectItem>
                      <SelectItem value="埼玉県">埼玉県</SelectItem>
                      <SelectItem value="千葉県">千葉県</SelectItem>
                      <SelectItem value="東京都">東京都</SelectItem>
                      <SelectItem value="神奈川県">神奈川県</SelectItem>
                      <SelectItem value="新潟県">新潟県</SelectItem>
                      <SelectItem value="富山県">富山県</SelectItem>
                      <SelectItem value="石川県">石川県</SelectItem>
                      <SelectItem value="福井県">福井県</SelectItem>
                      <SelectItem value="山梨県">山梨県</SelectItem>
                      <SelectItem value="長野県">長野県</SelectItem>
                      <SelectItem value="岐阜県">岐阜県</SelectItem>
                      <SelectItem value="静岡県">静岡県</SelectItem>
                      <SelectItem value="愛知県">愛知県</SelectItem>
                      <SelectItem value="三重県">三重県</SelectItem>
                      <SelectItem value="滋賀県">滋賀県</SelectItem>
                      <SelectItem value="京都府">京都府</SelectItem>
                      <SelectItem value="大阪府">大阪府</SelectItem>
                      <SelectItem value="兵庫県">兵庫県</SelectItem>
                      <SelectItem value="奈良県">奈良県</SelectItem>
                      <SelectItem value="和歌山県">和歌山県</SelectItem>
                      <SelectItem value="鳥取県">鳥取県</SelectItem>
                      <SelectItem value="島根県">島根県</SelectItem>
                      <SelectItem value="岡山県">岡山県</SelectItem>
                      <SelectItem value="広島県">広島県</SelectItem>
                      <SelectItem value="山口県">山口県</SelectItem>
                      <SelectItem value="徳島県">徳島県</SelectItem>
                      <SelectItem value="香川県">香川県</SelectItem>
                      <SelectItem value="愛媛県">愛媛県</SelectItem>
                      <SelectItem value="高知県">高知県</SelectItem>
                      <SelectItem value="福岡県">福岡県</SelectItem>
                      <SelectItem value="佐賀県">佐賀県</SelectItem>
                      <SelectItem value="長崎県">長崎県</SelectItem>
                      <SelectItem value="熊本県">熊本県</SelectItem>
                      <SelectItem value="大分県">大分県</SelectItem>
                      <SelectItem value="宮崎県">宮崎県</SelectItem>
                      <SelectItem value="鹿児島県">鹿児島県</SelectItem>
                      <SelectItem value="沖縄県">沖縄県</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-slate-700">市区町村以降</Label>
                <Input
                  id="address"
                  value={newCandidate.address}
                  onChange={(e) => setNewCandidate(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="渋谷区道玄坂1-2-3"
                  className="border-slate-200"
                />
              </div>
            </div>

            {/* 希望条件 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">希望条件・資格</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="qualification" className="text-slate-700">保有資格</Label>
                  <Input
                    id="qualification"
                    value={newCandidate.qualification}
                    onChange={(e) => setNewCandidate(prev => ({ ...prev, qualification: e.target.value }))}
                    placeholder="保育士, 幼稚園教諭"
                    className="border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desired_job_type" className="text-slate-700">希望職種</Label>
                  <Select
                    value={newCandidate.desired_job_type}
                    onValueChange={(value) => setNewCandidate(prev => ({ ...prev, desired_job_type: value }))}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="保育士">保育士</SelectItem>
                      <SelectItem value="幼稚園教諭">幼稚園教諭</SelectItem>
                      <SelectItem value="栄養士">栄養士</SelectItem>
                      <SelectItem value="調理師">調理師</SelectItem>
                      <SelectItem value="看護師">看護師</SelectItem>
                      <SelectItem value="その他">その他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desired_employment_type" className="text-slate-700">希望雇用形態</Label>
                <Select
                  value={newCandidate.desired_employment_type}
                  onValueChange={(value) => setNewCandidate(prev => ({ ...prev, desired_employment_type: value }))}
                >
                  <SelectTrigger className="border-slate-200">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
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
              </div>
            </div>

            {/* 管理情報 */}
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">管理情報</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source_id" className="text-slate-700">登録経路</Label>
                  <Select
                    value={newCandidate.source_id}
                    onValueChange={(value) => setNewCandidate(prev => ({ ...prev, source_id: value }))}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {sources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultant_id" className="text-slate-700">担当者</Label>
                  <Select
                    value={newCandidate.consultant_id}
                    onValueChange={(value) => setNewCandidate(prev => ({ ...prev, consultant_id: value }))}
                  >
                    <SelectTrigger className="border-slate-200">
                      <SelectValue placeholder="選択してください" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {consultants.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* メモ */}
            <div className="space-y-2">
              <Label htmlFor="memo" className="text-slate-700">メモ</Label>
              <Textarea
                id="memo"
                value={newCandidate.memo}
                onChange={(e) => setNewCandidate(prev => ({ ...prev, memo: e.target.value }))}
                placeholder="備考を入力してください"
                className="border-slate-200 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsNewDialogOpen(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleCreateCandidate}
              disabled={isSubmitting || !newCandidate.name.trim()}
              className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
            >
              {isSubmitting ? '登録中...' : '登録する'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

export default function CandidatesPage() {
  return (
    <Suspense fallback={
      <AppLayout title="求職者管理" description="読み込み中...">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">読み込み中...</p>
        </div>
      </AppLayout>
    }>
      <CandidatesPageContent />
    </Suspense>
  )
}

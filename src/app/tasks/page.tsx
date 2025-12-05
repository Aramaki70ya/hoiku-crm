'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  CheckCircle2, 
  Clock, 
  Star, 
  Phone, 
  ChevronRight, 
  AlertTriangle,
  Filter,
  Calendar
} from 'lucide-react'
import { 
  mockCandidates, 
  mockUsers, 
  statusLabels, 
  statusColors,
  mockCandidatePriorities,
  priorityLabels,
  priorityColors,
  sourcePriorityRules,
} from '@/lib/mock-data'

// 優先度の順序
const priorityOrder: Record<string, number> = {
  'S': 0,
  'A': 1,
  'B': 2,
  'C': 3,
}

// 優先度を取得する関数
const getPriority = (candidateId: string, sourceId: string | null) => {
  const priorityData = mockCandidatePriorities.find(p => p.candidateId === candidateId)
  if (priorityData) return priorityData
  // 登録経路による自動判定
  const autoPriority = sourceId && sourcePriorityRules[sourceId] 
    ? sourcePriorityRules[sourceId] as 'S' | 'A' | 'B' | 'C'
    : 'B' as const
  return {
    candidateId,
    priority: autoPriority,
    taskComment: null,
    lastUpdated: new Date().toISOString().split('T')[0],
  }
}

export default function TasksPage() {
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [consultantFilter, setConsultantFilter] = useState<string>('all')

  // タスク一覧を作成（優先度でソート）
  const tasks = useMemo(() => {
    // アクティブなステータスの求職者のみ
    const activeStatuses = ['new', 'contacting', 'first_contact_done', 'proposing', 'interviewing', 'offer']
    
    const activeCandidates = mockCandidates
      .filter(c => activeStatuses.includes(c.status))
      .map(candidate => {
        const priorityData = getPriority(candidate.id, candidate.source_id)
        const consultant = mockUsers.find(u => u.id === candidate.consultant_id)
        return {
          ...candidate,
          priority: priorityData.priority,
          taskComment: priorityData.taskComment,
          lastUpdated: priorityData.lastUpdated,
          consultantName: consultant?.name || '-',
        }
      })
      .filter(task => {
        if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false
        if (consultantFilter !== 'all' && task.consultant_id !== consultantFilter) return false
        return true
      })
      .sort((a, b) => {
        // 優先度で昇順ソート
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })

    return activeCandidates
  }, [priorityFilter, consultantFilter])

  // 優先度別カウント
  const priorityCounts = useMemo(() => {
    const activeStatuses = ['new', 'contacting', 'first_contact_done', 'proposing', 'interviewing', 'offer']
    const counts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0 }
    
    mockCandidates
      .filter(c => activeStatuses.includes(c.status))
      .forEach(c => {
        const priorityData = getPriority(c.id, c.source_id)
        counts[priorityData.priority]++
      })
    
    return counts
  }, [])

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })

  return (
    <AppLayout title="今日のタスク" description={today}>
      {/* サマリーカード */}
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

      {/* フィルター */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 text-slate-600">
          <Filter className="w-4 h-4" />
          <span className="font-medium">フィルター:</span>
        </div>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40 bg-white border-slate-200 text-slate-700 shadow-sm">
            <SelectValue placeholder="優先度" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200">
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="S">S - 最優先</SelectItem>
            <SelectItem value="A">A - 高</SelectItem>
            <SelectItem value="B">B - 中</SelectItem>
            <SelectItem value="C">C - 低</SelectItem>
          </SelectContent>
        </Select>

        <Select value={consultantFilter} onValueChange={setConsultantFilter}>
          <SelectTrigger className="w-40 bg-white border-slate-200 text-slate-700 shadow-sm">
            <SelectValue placeholder="担当者" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200">
            <SelectItem value="all">すべて</SelectItem>
            {mockUsers.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(priorityFilter !== 'all' || consultantFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPriorityFilter('all')
              setConsultantFilter('all')
            }}
            className="text-slate-500 hover:text-slate-700"
          >
            フィルターをクリア
          </Button>
        )}

        <div className="ml-auto">
          <Badge className="bg-violet-100 text-violet-700 px-3 py-1">
            {tasks.length}件のタスク
          </Badge>
        </div>
      </div>

      {/* タスクテーブル */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-100 bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-slate-600 font-semibold w-20">優先度</TableHead>
              <TableHead className="text-slate-600 font-semibold">氏名</TableHead>
              <TableHead className="text-slate-600 font-semibold">ステータス</TableHead>
              <TableHead className="text-slate-600 font-semibold w-1/3">コメント（タスク内容）</TableHead>
              <TableHead className="text-slate-600 font-semibold">担当者</TableHead>
              <TableHead className="text-slate-600 font-semibold">連絡先</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                  該当するタスクがありません
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className={`border-slate-100 transition-colors ${
                    task.priority === 'S' 
                      ? 'bg-rose-50/50 hover:bg-rose-50' 
                      : task.priority === 'A'
                      ? 'bg-orange-50/30 hover:bg-orange-50/50'
                      : 'hover:bg-violet-50/50'
                  }`}
                >
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`${priorityColors[task.priority]} font-bold`}
                    >
                      {task.priority === 'S' && <Star className="w-3 h-3 mr-1 fill-current" />}
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link 
                      href={`/candidates/${task.id}`}
                      className="font-medium text-slate-800 hover:text-violet-600 hover:underline"
                    >
                      {task.name}
                    </Link>
                    <div className="text-sm text-slate-500">
                      {task.age && `${task.age}歳`}
                      {task.prefecture && ` / ${task.prefecture}`}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[task.status]}
                    >
                      {statusLabels[task.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.taskComment ? (
                      <div className="flex items-start gap-2">
                        <div className="text-sm text-slate-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          {task.taskComment}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm">コメントなし</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {task.consultantName}
                  </TableCell>
                  <TableCell>
                    {task.phone && (
                      <a 
                        href={`tel:${task.phone}`}
                        className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {task.phone}
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/candidates/${task.id}`}>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 優先度の説明 */}
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
    </AppLayout>
  )
}


'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { Plus, Search, Phone, Mail, ChevronRight, Users, UserCheck } from 'lucide-react'
import { mockCandidates, mockUsers, statusLabels, statusColors } from '@/lib/mock-data'

// アクティブなステータス（進行中の案件）
const activeStatuses = ['new', 'contacting', 'first_contact_done', 'proposing', 'interviewing', 'offer']

export default function CandidatesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [consultantFilter, setConsultantFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'all' | 'active'>('all')

  // フィルタリング
  const filteredCandidates = useMemo(() => {
    return mockCandidates.filter((candidate) => {
      // タブによるフィルタ
      if (activeTab === 'active' && !activeStatuses.includes(candidate.status)) {
        return false
      }

      // 検索クエリ
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = candidate.name.toLowerCase().includes(query)
        const matchesId = candidate.id.includes(query)
        const matchesPhone = candidate.phone?.includes(query)
        if (!matchesName && !matchesId && !matchesPhone) return false
      }

      // ステータスフィルタ
      if (statusFilter !== 'all' && candidate.status !== statusFilter) {
        return false
      }

      // 担当者フィルタ
      if (consultantFilter !== 'all' && candidate.consultant_id !== consultantFilter) {
        return false
      }

      return true
    })
  }, [searchQuery, statusFilter, consultantFilter, activeTab])

  const allCount = mockCandidates.length
  const activeCount = mockCandidates.filter(c => activeStatuses.includes(c.status)).length

  return (
    <AppLayout title="求職者管理" description={`${filteredCandidates.length}件の求職者`}>
      {/* タブ */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'active')} className="mb-6">
        <TabsList className="bg-white border border-slate-200 shadow-sm">
          <TabsTrigger 
            value="all" 
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
          >
            <Users className="w-4 h-4 mr-2" />
            全体 ({allCount})
          </TabsTrigger>
          <TabsTrigger 
            value="active"
            className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white"
          >
            <UserCheck className="w-4 h-4 mr-2" />
            アクティブ ({activeCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white border-slate-200 text-slate-700 shadow-sm">
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
              <TableHead className="text-slate-600 font-semibold">ID</TableHead>
              <TableHead className="text-slate-600 font-semibold">氏名</TableHead>
              <TableHead className="text-slate-600 font-semibold">連絡先</TableHead>
              <TableHead className="text-slate-600 font-semibold">ステータス</TableHead>
              <TableHead className="text-slate-600 font-semibold">希望職種</TableHead>
              <TableHead className="text-slate-600 font-semibold">担当者</TableHead>
              <TableHead className="text-slate-600 font-semibold">登録日</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCandidates.map((candidate) => {
              const consultant = mockUsers.find((u) => u.id === candidate.consultant_id)
              return (
                <TableRow
                  key={candidate.id}
                  className="border-slate-100 hover:bg-violet-50/50 cursor-pointer transition-colors"
                >
                  <TableCell className="font-mono text-sm text-slate-500">
                    {candidate.id}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-slate-800">{candidate.name}</div>
                      <div className="text-sm text-slate-500">
                        {candidate.age && `${candidate.age}歳`}
                        {candidate.prefecture && ` / ${candidate.prefecture}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {candidate.phone && (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {candidate.phone}
                        </div>
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
                    <Badge
                      variant="outline"
                      className={statusColors[candidate.status]}
                    >
                      {statusLabels[candidate.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-700">
                    {candidate.desired_job_type || '-'}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {consultant?.name || '-'}
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
    </AppLayout>
  )
}

'use client'

import { useState, useMemo, useEffect, Suspense, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Edit2, MessageSquare, TrendingUp, Users, ChevronLeft, ChevronRight, Menu } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  mockMemberStats,
} from '@/lib/mock-data'
import {
  statusLabels,
  statusColors,
} from '@/lib/status-mapping'
import { useCandidates } from '@/hooks/useCandidates'
import { useUsers } from '@/hooks/useUsers'
import type { Project, CandidateStatus } from '@/types/database'

const getProjectDisplayName = (project?: Project) => {
  const gardenName = project?.garden_name?.trim() || ''
  const corporationName = project?.corporation_name?.trim() || ''
  const fallbackName = project?.client_name?.trim() || ''
  const title = gardenName || fallbackName || corporationName || '-'
  const subtitle = gardenName && corporationName ? corporationName : ''
  return { title, subtitle }
}

function MembersPageContent() {
  const searchParams = useSearchParams()
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [isMemberCardVisible, setIsMemberCardVisible] = useState(true)
  const [localCandidateStatuses, setLocalCandidateStatuses] = useState<Record<string, string>>({})
  const [localCandidateMemos, setLocalCandidateMemos] = useState<Record<string, string>>({})
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState<string>('')
  const [editMemo, setEditMemo] = useState<string>('')
  const [projects, setProjects] = useState<Project[]>([])
  
  // API経由でデータを取得
  const { candidates: allCandidates, isLoading, updateCandidate } = useCandidates()
  const { users, consultants } = useUsers()
  
  // プロジェクトを取得
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects')
        if (res.ok) {
          const { data } = await res.json()
          setProjects(data || [])
        }
      } catch (err) {
        console.error('Error fetching projects:', err)
      }
    }
    fetchProjects()
  }, [])
  
  // URLパラメータから選択状態を復元
  useEffect(() => {
    const selectedFromUrl = searchParams.get('selected')
    if (selectedFromUrl) {
      setSelectedMember(selectedFromUrl)
      setIsMemberCardVisible(false) // メンバーが選択されている場合はカードを非表示
    }
  }, [searchParams])

  // 全メンバーを表示（課別なし）
  const allMembers = consultants.map(u => u.id)

  // 選択中メンバーのデータ
  const memberData = useMemo(() => {
    if (!selectedMember) return null
    const user = users.find(u => u.id === selectedMember)
    const stats = mockMemberStats.find(s => s.userId === selectedMember)
    const candidates = allCandidates.filter(c => c.consultant_id === selectedMember).map(candidate => ({
      ...candidate,
      status: localCandidateStatuses[candidate.id] || candidate.status,
      memo: localCandidateMemos[candidate.id] !== undefined ? localCandidateMemos[candidate.id] : candidate.memo,
    }))
    const memberProjects = projects.filter(p => 
      candidates.some(c => c.id === p.candidate_id)
    )
    return { user, stats, candidates, projects: memberProjects }
  }, [selectedMember, localCandidateStatuses, localCandidateMemos, allCandidates, users, projects])

  // ステータス別集計
  const getStatusCounts = (userId: string) => {
    const candidates = allCandidates.filter(c => c.consultant_id === userId)
    const counts: Record<string, number> = {}
    candidates.forEach(c => {
      counts[c.status] = (counts[c.status] || 0) + 1
    })
    return counts
  }
  
  // ステータス・メモ更新ハンドラー
  const handleSaveEdit = useCallback(async (candidateId: string, status: string, memo: string) => {
    setLocalCandidateStatuses(prev => ({ ...prev, [candidateId]: status }))
    setLocalCandidateMemos(prev => ({ ...prev, [candidateId]: memo }))
    await updateCandidate(candidateId, { status: status as CandidateStatus, memo })
  }, [updateCandidate])

  // ローディング中の表示
  if (isLoading) {
    return (
      <AppLayout title="メンバー" description="データを読み込み中...">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">読み込み中...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="メンバー" description="担当者別の進捗管理">
      <div className="grid grid-cols-12 gap-6">
        {/* 左サイドバー: メンバーリスト */}
        {isMemberCardVisible ? (
          <div className="col-span-3">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-slate-800">メンバー</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsMemberCardVisible(false)}
                    className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
            <CardContent className="space-y-2">
              {allMembers.map(memberId => {
                const user = users.find(u => u.id === memberId)
                const stats = mockMemberStats.find(s => s.userId === memberId)
                const candidateCount = allCandidates.filter(c => c.consultant_id === memberId).length
                const isSelected = selectedMember === memberId

                return (
                  <button
                    key={memberId}
                    onClick={() => {
                      setSelectedMember(memberId)
                      setIsMemberCardVisible(false)
                    }}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      isSelected 
                        ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-gradient-to-br from-violet-400 to-indigo-500 text-white'
                        }`}>
                          {user?.name.charAt(0)}
                        </div>
                        <p className="font-medium">{user?.name}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>
          </div>
        ) : (
          <div className="col-span-1 flex items-start pt-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMemberCardVisible(true)}
              className="h-10 w-10 rounded-r-lg bg-white border border-l-0 border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all"
              title="メンバーを表示"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* メインコンテンツ: 選択メンバーの詳細 */}
        <div className={isMemberCardVisible ? "col-span-9" : "col-span-11"}>
          {!selectedMember ? (
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="py-20 text-center">
                <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">左のリストからメンバーを選択してください</p>
              </CardContent>
            </Card>
          ) : memberData && (
            <div className="grid grid-cols-12 gap-4">
              {/* メインエリア: 担当求職者（左側・広め） */}
              <div className="col-span-9 space-y-4">
                {/* 売上・KPI（コンパクト） */}
                <div className="grid grid-cols-4 gap-3">
                  <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="py-3 px-4">
                      <p className="text-xs text-slate-500">売上予算</p>
                      <p className="text-xl font-bold text-slate-800">
                        ¥{((memberData.stats?.budget || 0) / 10000).toFixed(0)}万
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="py-3 px-4">
                      <p className="text-xs text-slate-500">成約額</p>
                      <p className="text-xl font-bold text-emerald-600">
                        ¥{((memberData.stats?.sales || 0) / 10000).toFixed(0)}万
                        <span className="text-xs font-normal text-slate-500 ml-1">
                          ({memberData.stats ? ((memberData.stats.sales / memberData.stats.budget) * 100).toFixed(0) : 0}%)
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="py-3 px-4">
                      <p className="text-xs text-slate-500">面談設定</p>
                      <p className="text-xl font-bold text-slate-800">
                        {memberData.stats?.meetingCount || 0} / {memberData.stats?.meetingTarget || 0}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white border-slate-200 shadow-sm">
                    <CardContent className="py-3 px-4">
                      <p className="text-xs text-slate-500">担当件数</p>
                      <p className="text-xl font-bold text-violet-600">
                        {memberData.candidates.length}件
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* 担当求職者一覧（メイン） */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-t-lg">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      担当求職者一覧
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 px-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-100 bg-slate-50">
                            <TableHead className="text-slate-600 px-6">氏名</TableHead>
                            <TableHead className="text-slate-600 px-6">ステータス</TableHead>
                            <TableHead className="text-slate-600 px-6">案件</TableHead>
                            <TableHead className="text-slate-600 px-6">ヨミ</TableHead>
                            <TableHead className="text-slate-600 px-6">メモ</TableHead>
                            <TableHead className="w-16 px-6"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {memberData.candidates.map(candidate => {
                            const project = projects.find(p => p.candidate_id === candidate.id)
                            return (
                            <TableRow 
                              key={candidate.id} 
                              className="border-slate-100 hover:bg-violet-50/30 transition-all"
                            >
                              <TableCell className="px-6">
                                <Link 
                                  href={`/candidates/${candidate.id}?from=members&memberId=${selectedMember}`}
                                  className="block hover:text-violet-600 transition-colors"
                                >
                                  <p className="font-medium text-slate-800 hover:underline cursor-pointer">{candidate.name}</p>
                                  <p className="text-xs text-slate-500">{candidate.id}</p>
                                </Link>
                              </TableCell>
                              <TableCell className="px-6">
                                <Badge
                                  variant="outline"
                                  className={statusColors[candidate.status as CandidateStatus]}
                                >
                                  {statusLabels[candidate.status as CandidateStatus]}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-700 text-sm px-6">
                                {(() => {
                                  const destination = getProjectDisplayName(project)
                                  return (
                                    <div className="flex flex-col">
                                      <span>{destination.title}</span>
                                      {destination.subtitle && (
                                        <span className="text-xs text-slate-500">法人: {destination.subtitle}</span>
                                      )}
                                    </div>
                                  )
                                })()}
                              </TableCell>
                              <TableCell className="px-6">
                                {project && (
                                  <Select defaultValue={project.probability || undefined}>
                                    <SelectTrigger className="w-14 h-7 text-xs">
                                      <SelectValue placeholder="-" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="A" className="text-xs">A</SelectItem>
                                      <SelectItem value="B" className="text-xs">B</SelectItem>
                                      <SelectItem value="C" className="text-xs">C</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell className="text-slate-500 text-xs max-w-[180px] truncate px-6">
                                {candidate.memo || '-'}
                              </TableCell>
                              <TableCell className="px-6">
                                <Dialog 
                                  open={editingCandidateId === candidate.id}
                                  onOpenChange={(open) => {
                                    if (!open) {
                                      setEditingCandidateId(null)
                                      setEditStatus('')
                                      setEditMemo('')
                                    }
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                                      onClick={() => {
                                        setEditingCandidateId(candidate.id)
                                        setEditStatus(candidate.status)
                                        setEditMemo(candidate.memo || '')
                                      }}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-white">
                                    <DialogHeader>
                                      <DialogTitle>{candidate.name} - 編集</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-status">ステータス</Label>
                                        <Select 
                                          value={editStatus} 
                                          onValueChange={setEditStatus}
                                        >
                                          <SelectTrigger id="edit-status" className="w-full">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Object.entries(statusLabels).map(([value, label]) => (
                                              <SelectItem key={value} value={value}>
                                                <div className="flex items-center gap-2">
                                                  <Badge variant="outline" className={statusColors[value as CandidateStatus]}>
                                                    {label}
                                                  </Badge>
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-memo">メモ</Label>
                                        <Textarea 
                                          id="edit-memo"
                                          value={editMemo}
                                          onChange={(e) => setEditMemo(e.target.value)}
                                          placeholder="ヒアリング内容やメモを入力..."
                                          className="min-h-[200px]"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4">
                                      <Button 
                                        variant="outline"
                                        onClick={() => {
                                          setEditingCandidateId(null)
                                          setEditStatus('')
                                          setEditMemo('')
                                        }}
                                      >
                                        キャンセル
                                      </Button>
                                      <Button 
                                        className="bg-gradient-to-r from-violet-500 to-indigo-600"
                                        onClick={() => {
                                          if (editStatus) {
                                            handleSaveEdit(candidate.id, editStatus, editMemo)
                                          }
                                          setEditingCandidateId(null)
                                          setEditStatus('')
                                          setEditMemo('')
                                        }}
                                      >
                                        保存
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* サイドエリア: ヨミ数字（右側・コンパクト） */}
              <div className="col-span-3 space-y-3">
                {/* 当月ヨミ */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm text-slate-700 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-violet-500" />
                      当月ヨミ
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3 space-y-1.5">
                    <div className="flex items-center justify-between py-1.5 px-2 bg-red-50 rounded text-sm">
                      <span className="text-red-700 font-medium">A (80%)</span>
                      <span className="font-bold text-red-700">¥{((memberData.stats?.yomiA || 0) / 10000).toFixed(0)}万</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-orange-50 rounded text-sm">
                      <span className="text-orange-700 font-medium">B (50%)</span>
                      <span className="font-bold text-orange-700">¥{((memberData.stats?.yomiB || 0) / 10000).toFixed(0)}万</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-yellow-50 rounded text-sm">
                      <span className="text-yellow-700 font-medium">C (30%)</span>
                      <span className="font-bold text-yellow-700">¥{((memberData.stats?.yomiC || 0) / 10000).toFixed(0)}万</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-slate-50 rounded text-sm">
                      <span className="text-slate-600 font-medium">D (10%)</span>
                      <span className="font-bold text-slate-600">¥{((memberData.stats?.yomiD || 0) / 10000).toFixed(0)}万</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 翌月ヨミ */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm text-slate-700 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      翌月ヨミ
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3 space-y-1.5">
                    <div className="flex items-center justify-between py-1.5 px-2 bg-red-50/60 rounded text-sm">
                      <span className="text-red-600 font-medium">A (80%)</span>
                      <span className="font-bold text-red-600">¥{((memberData.stats?.yomiANext || 0) / 10000).toFixed(0)}万</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-orange-50/60 rounded text-sm">
                      <span className="text-orange-600 font-medium">B (50%)</span>
                      <span className="font-bold text-orange-600">¥{((memberData.stats?.yomiBNext || 0) / 10000).toFixed(0)}万</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-yellow-50/60 rounded text-sm">
                      <span className="text-yellow-600 font-medium">C (30%)</span>
                      <span className="font-bold text-yellow-600">¥{((memberData.stats?.yomiCNext || 0) / 10000).toFixed(0)}万</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-2 bg-slate-50/60 rounded text-sm">
                      <span className="text-slate-500 font-medium">D (10%)</span>
                      <span className="font-bold text-slate-500">¥{((memberData.stats?.yomiDNext || 0) / 10000).toFixed(0)}万</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}

export default function MembersPage() {
  return (
    <Suspense fallback={<div>読み込み中...</div>}>
      <MembersPageContent />
    </Suspense>
  )
}


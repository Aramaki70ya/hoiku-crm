'use client'

import { useState, useMemo } from 'react'
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
import { Plus, Edit2, MessageSquare, TrendingUp, Users } from 'lucide-react'
import {
  mockUsers,
  mockCandidates,
  mockProjects,
  mockMemberStats,
  team1Members,
  team2Members,
  statusLabels,
  statusColors,
} from '@/lib/mock-data'

export default function MembersPage() {
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<'1' | '2'>('1')

  const teamMembers = selectedTeam === '1' ? team1Members : team2Members

  // 選択中メンバーのデータ
  const memberData = useMemo(() => {
    if (!selectedMember) return null
    const user = mockUsers.find(u => u.id === selectedMember)
    const stats = mockMemberStats.find(s => s.userId === selectedMember)
    const candidates = mockCandidates.filter(c => c.consultant_id === selectedMember)
    const projects = mockProjects.filter(p => 
      candidates.some(c => c.id === p.candidate_id)
    )
    return { user, stats, candidates, projects }
  }, [selectedMember])

  // ステータス別集計
  const getStatusCounts = (userId: string) => {
    const candidates = mockCandidates.filter(c => c.consultant_id === userId)
    const counts: Record<string, number> = {}
    candidates.forEach(c => {
      counts[c.status] = (counts[c.status] || 0) + 1
    })
    return counts
  }

  return (
    <AppLayout title="メンバー" description="担当者別の進捗管理">
      <div className="grid grid-cols-12 gap-6">
        {/* 左サイドバー: メンバーリスト */}
        <div className="col-span-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-slate-800">メンバー</CardTitle>
                <Tabs value={selectedTeam} onValueChange={(v) => setSelectedTeam(v as '1' | '2')}>
                  <TabsList className="h-8 bg-slate-100">
                    <TabsTrigger value="1" className="text-xs px-3 data-[state=active]:bg-white">1課</TabsTrigger>
                    <TabsTrigger value="2" className="text-xs px-3 data-[state=active]:bg-white">2課</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {teamMembers.map(memberId => {
                const user = mockUsers.find(u => u.id === memberId)
                const stats = mockMemberStats.find(s => s.userId === memberId)
                const candidateCount = mockCandidates.filter(c => c.consultant_id === memberId).length
                const isSelected = selectedMember === memberId

                return (
                  <button
                    key={memberId}
                    onClick={() => setSelectedMember(memberId)}
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
                        <div>
                          <p className="font-medium">{user?.name}</p>
                          <p className={`text-xs ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
                            担当 {candidateCount}件
                          </p>
                        </div>
                      </div>
                      {stats && stats.sales > 0 && (
                        <Badge className={isSelected ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}>
                          ¥{(stats.sales / 10000).toFixed(0)}万
                        </Badge>
                      )}
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* メインコンテンツ: 選択メンバーの詳細 */}
        <div className="col-span-9">
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
                  <CardContent className="pt-3">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-100 bg-slate-50">
                          <TableHead className="text-slate-600">氏名</TableHead>
                          <TableHead className="text-slate-600">ステータス</TableHead>
                          <TableHead className="text-slate-600">案件</TableHead>
                          <TableHead className="text-slate-600">ヨミ</TableHead>
                          <TableHead className="text-slate-600">メモ</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberData.candidates.map(candidate => {
                          const project = mockProjects.find(p => p.candidate_id === candidate.id)
                          return (
                            <TableRow key={candidate.id} className="border-slate-100 hover:bg-violet-50/30">
                              <TableCell>
                                <a 
                                  href={`/candidates/${candidate.id}`}
                                  className="block hover:text-violet-600"
                                >
                                  <p className="font-medium text-slate-800 hover:underline">{candidate.name}</p>
                                  <p className="text-xs text-slate-500">{candidate.id}</p>
                                </a>
                              </TableCell>
                              <TableCell>
                                <Select defaultValue={candidate.status}>
                                  <SelectTrigger className="w-24 h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(statusLabels).map(([value, label]) => (
                                      <SelectItem key={value} value={value} className="text-xs">
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-slate-700 text-sm">
                                {project?.client_name || '-'}
                              </TableCell>
                              <TableCell>
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
                              <TableCell className="text-slate-500 text-xs max-w-[180px] truncate">
                                {candidate.memo || '-'}
                              </TableCell>
                              <TableCell>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600">
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-white">
                                    <DialogHeader>
                                      <DialogTitle>{candidate.name} - メモ編集</DialogTitle>
                                    </DialogHeader>
                                    <Textarea 
                                      defaultValue={candidate.memo || ''} 
                                      placeholder="ヒアリング内容やメモを入力..."
                                      className="min-h-[200px]"
                                    />
                                    <div className="flex justify-end gap-2 mt-4">
                                      <Button variant="outline">キャンセル</Button>
                                      <Button className="bg-gradient-to-r from-violet-500 to-indigo-600">保存</Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
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


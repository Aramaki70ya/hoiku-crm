'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
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
            <div className="space-y-6">
              {/* 売上・KPI */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-xs text-slate-500">売上予算</p>
                    <p className="text-2xl font-bold text-slate-800">
                      ¥{((memberData.stats?.budget || 0) / 10000).toFixed(0)}万
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-xs text-slate-500">成約額</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      ¥{((memberData.stats?.sales || 0) / 10000).toFixed(0)}万
                    </p>
                    <p className="text-xs text-slate-500">
                      達成率 {memberData.stats ? ((memberData.stats.sales / memberData.stats.budget) * 100).toFixed(1) : 0}%
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-xs text-slate-500">面談設定</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {memberData.stats?.meetingCount || 0} / {memberData.stats?.meetingTarget || 0}
                    </p>
                    <p className="text-xs text-slate-500">
                      達成率 {memberData.stats ? ((memberData.stats.meetingCount / memberData.stats.meetingTarget) * 100).toFixed(1) : 0}%
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="pt-4">
                    <p className="text-xs text-slate-500">担当求職者</p>
                    <p className="text-2xl font-bold text-violet-600">
                      {memberData.candidates.length}件
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* ヨミ情報 */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-violet-500" />
                    ヨミ数字
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    {/* 当月 */}
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-3">当月</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                          <span className="text-sm text-red-700 font-medium">Aヨミ (80%)</span>
                          <span className="font-bold text-red-700">¥{((memberData.stats?.yomiA || 0) / 10000).toFixed(0)}万</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                          <span className="text-sm text-orange-700 font-medium">Bヨミ (50%)</span>
                          <span className="font-bold text-orange-700">¥{((memberData.stats?.yomiB || 0) / 10000).toFixed(0)}万</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                          <span className="text-sm text-yellow-700 font-medium">Cヨミ (30%)</span>
                          <span className="font-bold text-yellow-700">¥{((memberData.stats?.yomiC || 0) / 10000).toFixed(0)}万</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                          <span className="text-sm text-slate-600 font-medium">Dヨミ (10%)</span>
                          <span className="font-bold text-slate-600">¥{((memberData.stats?.yomiD || 0) / 10000).toFixed(0)}万</span>
                        </div>
                      </div>
                    </div>
                    {/* 翌月 */}
                    <div>
                      <p className="text-sm font-medium text-slate-600 mb-3">翌月</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 bg-red-50/50 rounded-lg">
                          <span className="text-sm text-red-600 font-medium">Aヨミ (80%)</span>
                          <span className="font-bold text-red-600">¥{((memberData.stats?.yomiANext || 0) / 10000).toFixed(0)}万</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-orange-50/50 rounded-lg">
                          <span className="text-sm text-orange-600 font-medium">Bヨミ (50%)</span>
                          <span className="font-bold text-orange-600">¥{((memberData.stats?.yomiBNext || 0) / 10000).toFixed(0)}万</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-yellow-50/50 rounded-lg">
                          <span className="text-sm text-yellow-600 font-medium">Cヨミ (30%)</span>
                          <span className="font-bold text-yellow-600">¥{((memberData.stats?.yomiCNext || 0) / 10000).toFixed(0)}万</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-50/50 rounded-lg">
                          <span className="text-sm text-slate-500 font-medium">Dヨミ (10%)</span>
                          <span className="font-bold text-slate-500">¥{((memberData.stats?.yomiDNext || 0) / 10000).toFixed(0)}万</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 担当求職者一覧 */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-slate-800">担当求職者</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100 bg-slate-50">
                        <TableHead className="text-slate-600">氏名</TableHead>
                        <TableHead className="text-slate-600">ステータス</TableHead>
                        <TableHead className="text-slate-600">案件</TableHead>
                        <TableHead className="text-slate-600">ヨミ</TableHead>
                        <TableHead className="text-slate-600">メモ</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberData.candidates.map(candidate => {
                        const project = mockProjects.find(p => p.candidate_id === candidate.id)
                        return (
                          <TableRow key={candidate.id} className="border-slate-100">
                            <TableCell>
                              <div>
                                <Link 
                                  href={`/candidates/${candidate.id}`}
                                  className="font-medium text-slate-800 hover:text-violet-600 hover:underline transition-colors"
                                >
                                  {candidate.name}
                                </Link>
                                <p className="text-xs text-slate-500">{candidate.id}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select defaultValue={candidate.status}>
                                <SelectTrigger className="w-28 h-8 text-xs">
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
                            <TableCell className="text-slate-700">
                              {project?.client_name || '-'}
                            </TableCell>
                            <TableCell>
                              {project && (
                                <Select defaultValue={project.probability || undefined}>
                                  <SelectTrigger className="w-16 h-8 text-xs">
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
                            <TableCell className="text-slate-500 text-sm max-w-[200px] truncate">
                              {candidate.memo || '-'}
                            </TableCell>
                            <TableCell>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-slate-400 hover:text-violet-600">
                                    <MessageSquare className="w-4 h-4" />
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
          )}
        </div>
      </div>
    </AppLayout>
  )
}


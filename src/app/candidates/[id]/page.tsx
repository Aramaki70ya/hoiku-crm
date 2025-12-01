'use client'

import { use } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Edit,
  Plus,
  Building,
  Clock,
} from 'lucide-react'
import {
  mockCandidates,
  mockUsers,
  mockProjects,
  mockInterviews,
  statusLabels,
  statusColors,
} from '@/lib/mock-data'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function CandidateDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const candidate = mockCandidates.find((c) => c.id === id)
  const consultant = mockUsers.find((u) => u.id === candidate?.consultant_id)
  const projects = mockProjects.filter((p) => p.candidate_id === id)
  const interviews = projects.flatMap((p) =>
    mockInterviews.filter((i) => i.project_id === p.id).map((i) => ({ ...i, project: p }))
  )

  if (!candidate) {
    return (
      <AppLayout title="求職者が見つかりません">
        <div className="flex flex-col items-center justify-center h-96">
          <p className="text-slate-500 mb-4">指定された求職者は存在しません</p>
          <Link href="/candidates">
            <Button variant="outline">一覧に戻る</Button>
          </Link>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title={candidate.name} description={`ID: ${candidate.id}`}>
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/candidates">
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{candidate.name}</h1>
              <Badge variant="outline" className={statusColors[candidate.status]}>
                {statusLabels[candidate.status]}
              </Badge>
            </div>
            <p className="text-slate-500 mt-1">
              {candidate.age && `${candidate.age}歳`}
              {candidate.prefecture && ` / ${candidate.prefecture}${candidate.address || ''}`}
            </p>
          </div>
        </div>
        <Button className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md">
          <Edit className="w-4 h-4 mr-2" />
          編集
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 左カラム: 基本情報 */}
        <div className="col-span-1 space-y-6">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800">基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 連絡先 */}
              {candidate.phone && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">電話番号</p>
                    <p className="text-slate-800">{candidate.phone}</p>
                  </div>
                </div>
              )}

              {candidate.email && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">メール</p>
                    <p className="text-slate-800 text-sm break-all">{candidate.email}</p>
                  </div>
                </div>
              )}

              {(candidate.prefecture || candidate.address) && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">住所</p>
                    <p className="text-slate-800">
                      {candidate.prefecture}
                      {candidate.address}
                    </p>
                  </div>
                </div>
              )}

              <Separator className="bg-slate-100" />

              {/* 希望条件 */}
              {candidate.desired_job_type && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">希望職種</p>
                    <p className="text-slate-800">{candidate.desired_job_type}</p>
                  </div>
                </div>
              )}

              {candidate.desired_employment_type && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">希望雇用形態</p>
                    <p className="text-slate-800">{candidate.desired_employment_type}</p>
                  </div>
                </div>
              )}

              {candidate.qualification && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">保有資格</p>
                    <p className="text-slate-800">{candidate.qualification}</p>
                  </div>
                </div>
              )}

              <Separator className="bg-slate-100" />

              {/* 管理情報 */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">登録日</p>
                  <p className="text-slate-800">{candidate.registered_at}</p>
                </div>
              </div>

              {consultant && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-medium">
                    {consultant.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">担当者</p>
                    <p className="text-slate-800">{consultant.name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右カラム: タブコンテンツ */}
        <div className="col-span-2">
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="bg-white border border-slate-200 shadow-sm">
              <TabsTrigger value="projects" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                選考状況 ({projects.length})
              </TabsTrigger>
              <TabsTrigger value="timeline" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                タイムライン
              </TabsTrigger>
              <TabsTrigger value="memo" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                メモ
              </TabsTrigger>
            </TabsList>

            {/* 選考状況タブ */}
            <TabsContent value="projects" className="mt-4 space-y-4">
              <div className="flex justify-end">
                <Button size="sm" className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md">
                  <Plus className="w-4 h-4 mr-2" />
                  案件追加
                </Button>
              </div>

              {projects.length === 0 ? (
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <Building className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">選考中の案件はありません</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 border-slate-200"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      最初の案件を追加
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                projects.map((project) => {
                  const projectInterviews = mockInterviews.filter(
                    (i) => i.project_id === project.id
                  )
                  return (
                    <Card
                      key={project.id}
                      className="bg-white border-slate-200 shadow-sm"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium text-slate-800">
                              {project.client_name}
                            </h3>
                            <p className="text-sm text-slate-500">
                              ヨミ: ¥{project.expected_amount?.toLocaleString() || '-'}
                            </p>
                          </div>
                          <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">
                            {project.phase === 'interview_scheduled'
                              ? '面接予定'
                              : project.phase === 'accepted'
                              ? '入社確定'
                              : project.phase}
                          </Badge>
                        </div>

                        {/* 面接予定 */}
                        {projectInterviews.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <p className="text-xs text-slate-500 mb-2">面接予定</p>
                            {projectInterviews.map((interview) => (
                              <div
                                key={interview.id}
                                className="flex items-center gap-3 py-2"
                              >
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-slate-700">
                                  {new Date(interview.start_at).toLocaleDateString('ja-JP', {
                                    month: 'long',
                                    day: 'numeric',
                                    weekday: 'short',
                                  })}
                                </span>
                                <span className="text-slate-500">
                                  {new Date(interview.start_at).toLocaleTimeString('ja-JP', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                <span className="text-slate-600">
                                  @ {interview.location}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </TabsContent>

            {/* タイムラインタブ */}
            <TabsContent value="timeline" className="mt-4">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="py-6">
                  <div className="space-y-4">
                    {/* サンプルタイムライン */}
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <div className="w-0.5 h-full bg-slate-200" />
                      </div>
                      <div className="pb-6">
                        <p className="text-sm text-slate-500">2025/11/25 10:00</p>
                        <p className="text-slate-800">ステータスを「面接中」に変更</p>
                        <p className="text-sm text-slate-500">担当: {consultant?.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-cyan-500" />
                        <div className="w-0.5 h-full bg-slate-200" />
                      </div>
                      <div className="pb-6">
                        <p className="text-sm text-slate-500">2025/11/20 14:30</p>
                        <p className="text-slate-800">面接日程を設定: 11/28 鵠沼げんきっず保育園</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">2025/11/11 09:00</p>
                        <p className="text-slate-800">新規登録 (LINE経由)</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* メモタブ */}
            <TabsContent value="memo" className="mt-4">
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="py-6">
                  {candidate.memo ? (
                    <p className="text-slate-700 whitespace-pre-wrap">{candidate.memo}</p>
                  ) : (
                    <p className="text-slate-500">メモはありません</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  )
}

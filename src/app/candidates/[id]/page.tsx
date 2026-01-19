'use client'

import { use, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  Trophy,
  Banknote,
  FileText,
  Link as LinkIcon,
  CalendarCheck,
  CheckCircle2,
} from 'lucide-react'
import {
  mockCandidates,
  mockUsers,
  mockProjects,
  mockInterviews,
  mockContracts,
  mockApproachPriorities,
  mockMemos,
  mockSources,
  contractCandidateNames,
  statusLabels,
  statusColors,
} from '@/lib/mock-data'
import type { Contract, Memo } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

// 金額をフォーマット
function formatCurrency(amount: number | null | undefined): string {
  if (!amount) return '-'
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount)
}

// 日付をフォーマット
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function CandidateDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [candidateStatus, setCandidateStatus] = useState<string | null>(null)
  const candidate = mockCandidates.find((c) => c.id === id)
  
  // ステータスを初期化（変更されていない場合は元のステータスを使用）
  const currentStatus = candidateStatus || candidate?.status || 'new'
  
  // 遷移元の情報を取得
  const from = searchParams.get('from')
  const memberId = searchParams.get('memberId')
  
  // 戻るボタンのハンドラー
  const handleBack = () => {
    if (from === 'members' && memberId) {
      // メンバーページから来た場合は、選択状態を保持してメンバーページに戻る
      router.push(`/members?selected=${memberId}`)
    } else {
      // それ以外の場合はブラウザの履歴を戻る
      router.back()
    }
  }
  // candidatesテーブルにない成約者もcontractCandidateNamesから名前を取得
  const candidateName = candidate?.name || contractCandidateNames[id] || '不明'
  const consultant = mockUsers.find((u) => u.id === candidate?.consultant_id)
  const projects = mockProjects.filter((p) => p.candidate_id === id)
  const interviews = projects.flatMap((p) =>
    mockInterviews.filter((i) => i.project_id === p.id).map((i) => ({ ...i, project: p }))
  )
  
  // 成約情報を取得
  const contract = mockContracts.find((c) => c.candidate_id === id)
  const isContracted = currentStatus === 'closed_won' || !!contract
  
  // タスクコメントを取得
  const approachPriority = mockApproachPriorities.find(p => p.candidateId === id)
  const taskComment = approachPriority?.taskComment || null
  
  // タスク完了状態を管理
  const [isTaskCompleted, setIsTaskCompleted] = useState(false)
  
  // メモを取得（この求職者に関連するメモ）
  const candidateMemos = mockMemos.filter(m => m.candidate_id === id).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  
  // タイムラインイベントを取得（localStorageから）
  const [timelineEvents, setTimelineEvents] = useState<Array<{
    id: string
    candidate_id: string
    event_type: string
    title: string
    description: string
    created_at: string
  }>>([])
  
  useEffect(() => {
    // localStorageからタイムラインイベントを読み込み
    if (typeof window !== 'undefined') {
      const stored = JSON.parse(localStorage.getItem('timelineEvents') || '[]')
      const candidateEvents = stored.filter((e: { candidate_id: string }) => e.candidate_id === id)
      setTimelineEvents(candidateEvents.sort((a: { created_at: string }, b: { created_at: string }) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
    }
  }, [id])
  
  // タイムライン表示用のデータを統合
  const allTimelineItems = useMemo(() => {
    const items: Array<{
      id: string
      date: Date
      type: string
      title: string
      description: string
      color: string
    }> = []
    
    // タイムラインイベントを追加
    timelineEvents.forEach(event => {
      items.push({
        id: event.id,
        date: new Date(event.created_at),
        type: event.event_type,
        title: event.title,
        description: event.description,
        color: event.event_type === 'consultant_change' ? 'bg-blue-500' : 
               event.event_type === 'interview_status_change' ? 'bg-cyan-500' : 'bg-violet-500',
      })
    })
    
    // メモを追加
    candidateMemos.forEach(memo => {
      items.push({
        id: memo.id,
        date: new Date(memo.created_at),
        type: 'memo',
        title: 'メモ追加',
        description: memo.content,
        color: 'bg-violet-500',
      })
    })
    
    // 日付順にソート（新しい順）
    return items.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [timelineEvents, candidateMemos])
  
  // 成約情報編集用state
  const [contractForm, setContractForm] = useState<Partial<Contract>>({
    employment_type: contract?.employment_type || '',
    job_type: contract?.job_type || '',
    payment_date: contract?.payment_date || '',
    invoice_sent_date: contract?.invoice_sent_date || '',
    calculation_basis: contract?.calculation_basis || '',
    document_url: contract?.document_url || '',
    placement_company: contract?.placement_company || '',
  })
  const [isContractEditDialogOpen, setIsContractEditDialogOpen] = useState(false)
  
  // 編集ダイアログ用state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editType, setEditType] = useState<'timeline' | 'project' | 'memo' | 'basic' | 'task' | null>(null)
  const [memoContent, setMemoContent] = useState('')
  
  // 基本情報編集用state
  const [basicInfoForm, setBasicInfoForm] = useState({
    phone: candidate?.phone || '',
    email: candidate?.email || '',
    prefecture: candidate?.prefecture || '',
    address: candidate?.address || '',
    desired_job_type: candidate?.desired_job_type || '',
    desired_employment_type: candidate?.desired_employment_type || '',
    qualification: candidate?.qualification || '',
  })
  const [isBasicInfoEditDialogOpen, setIsBasicInfoEditDialogOpen] = useState(false)
  
  // 基本情報フォームをcandidate変更時に更新（IDが変更された場合のみ）
  useEffect(() => {
    if (candidate) {
      setBasicInfoForm({
        phone: candidate.phone || '',
        email: candidate.email || '',
        prefecture: candidate.prefecture || '',
        address: candidate.address || '',
        desired_job_type: candidate.desired_job_type || '',
        desired_employment_type: candidate.desired_employment_type || '',
        qualification: candidate.qualification || '',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate?.id])
  
  // ヨミ情報用state（最初の案件から取得、なければnull）
  const [yomiForm, setYomiForm] = useState({
    probability: null as 'A' | 'B' | 'C' | null,
    expected_amount: null as number | null,
  })
  
  // ヨミ情報をprojects変更時に更新
  useEffect(() => {
    if (projects.length > 0) {
      const firstProject = projects[0]
      setYomiForm(prev => {
        // 値が実際に変更された場合のみ更新
        if (prev.probability !== firstProject?.probability || prev.expected_amount !== firstProject?.expected_amount) {
          return {
            probability: firstProject?.probability || null,
            expected_amount: firstProject?.expected_amount || null,
          }
        }
        return prev
      })
    } else {
      setYomiForm(prev => {
        // 値が実際に変更された場合のみ更新
        if (prev.probability !== null || prev.expected_amount !== null) {
          return {
            probability: null,
            expected_amount: null,
          }
        }
        return prev
      })
    }
  }, [projects.length, projects[0]?.probability, projects[0]?.expected_amount])
  
  // タスク編集用state
  const [taskForm, setTaskForm] = useState({
    taskComment: taskComment || '',
  })
  const [isTaskEditDialogOpen, setIsTaskEditDialogOpen] = useState(false)
  
  // タスクフォームをtaskComment変更時に更新
  useEffect(() => {
    setTaskForm(prev => {
      // 値が実際に変更された場合のみ更新
      if (prev.taskComment !== (taskComment || '')) {
        return {
          taskComment: taskComment || '',
        }
      }
      return prev
    })
  }, [taskComment])
  
  const handleContractFormChange = (field: keyof Contract, value: string) => {
    setContractForm(prev => ({ ...prev, [field]: value }))
  }
  
  const handleSaveContract = () => {
    // 実際のアプリでは、ここでAPIを呼び出してデータを保存
    console.log('保存するデータ:', contractForm)
    setIsContractEditDialogOpen(false)
    // TODO: 成功通知を表示
  }
  
  const handleSaveMemo = () => {
    // 実際のアプリでは、ここでAPIを呼び出してメモを保存
    console.log('保存するメモ:', memoContent)
    setMemoContent('')
    setIsEditDialogOpen(false)
    setEditType(null)
    // TODO: 成功通知を表示
  }
  
  const handleSaveBasicInfo = () => {
    // 実際のアプリでは、ここでAPIを呼び出してデータを保存
    console.log('保存する基本情報:', basicInfoForm)
    setIsBasicInfoEditDialogOpen(false)
    // TODO: 成功通知を表示
  }
  
  const handleSaveYomi = () => {
    // 実際のアプリでは、ここでAPIを呼び出してヨミ情報を保存
    console.log('保存するヨミ情報:', yomiForm)
    // TODO: 成功通知を表示
  }
  
  const handleSaveTask = () => {
    // 実際のアプリでは、ここでAPIを呼び出してタスクを保存
    console.log('保存するタスク:', taskForm)
    setIsTaskEditDialogOpen(false)
    // TODO: 成功通知を表示
  }

  const getDialogDescription = () => {
    if (editType === 'timeline') return 'タイムラインに履歴を追加します'
    if (editType === 'project') return '新しい案件や選考情報を追加します'
    if (editType === 'memo') return 'メモや備考を追加・編集します'
    return '情報を追加・編集します'
  }

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
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{candidate.name}</h1>
              <Select
                value={currentStatus}
                onValueChange={(value) => {
                  setCandidateStatus(value)
                }}
              >
                <SelectTrigger className="w-32 h-8 p-0 border-0 bg-transparent hover:bg-slate-100">
                  <SelectValue>
                    <Badge variant="outline" className={statusColors[currentStatus]}>
                      {statusLabels[currentStatus]}
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
            </div>
            <p className="text-slate-500 mt-1">
              {candidate.age && `${candidate.age}歳`}
              {candidate.prefecture && ` / ${candidate.prefecture}${candidate.address || ''}`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 左カラム: ヨミ情報と基本情報 */}
        <div className="col-span-1 space-y-6">
          {/* ヨミ情報カード（最上部に移動） */}
          <Card className="bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-violet-600" />
                ヨミ情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="yomi-probability" className="text-slate-700 font-medium">ヨミ確度</Label>
                <Select
                  value={yomiForm.probability || ''}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      // 確度が未設定の場合、金額も自動的にクリア
                      setYomiForm({ probability: null, expected_amount: null })
                    } else {
                      setYomiForm(prev => ({ ...prev, probability: value as 'A' | 'B' | 'C' }))
                    }
                  }}
                >
                  <SelectTrigger id="yomi-probability" className="bg-white">
                    <SelectValue placeholder="確度を選択..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-slate-400">未設定</span>
                    </SelectItem>
                    <SelectItem value="A">Aヨミ（80%）</SelectItem>
                    <SelectItem value="B">Bヨミ（50%）</SelectItem>
                    <SelectItem value="C">Cヨミ（30%）</SelectItem>
                  </SelectContent>
                </Select>
                {yomiForm.probability && (
                  <p className="text-xs text-slate-500">
                    {yomiForm.probability === 'A' && '確度: 80%'}
                    {yomiForm.probability === 'B' && '確度: 50%'}
                    {yomiForm.probability === 'C' && '確度: 30%'}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="yomi-amount" className="text-slate-700 font-medium">ヨミ金額</Label>
                <Input
                  id="yomi-amount"
                  type="number"
                  placeholder={yomiForm.probability ? "金額を入力..." : "確度を選択後に金額を入力できます"}
                  value={yomiForm.expected_amount || ''}
                  onChange={(e) => setYomiForm(prev => ({ ...prev, expected_amount: e.target.value ? Number(e.target.value) : null }))}
                  className="bg-white"
                  disabled={!yomiForm.probability}
                />
                {yomiForm.expected_amount && (
                  <p className="text-xs text-slate-500">
                    {formatCurrency(yomiForm.expected_amount)}
                  </p>
                )}
                {!yomiForm.probability && (
                  <p className="text-xs text-slate-400 italic">
                    確度を選択すると金額を入力できます
                  </p>
                )}
              </div>
              <div className="pt-2 border-t border-violet-200">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-600">現在の設定:</span>
                  <span className={`font-medium ${
                    yomiForm.probability && yomiForm.expected_amount 
                      ? 'text-violet-600' 
                      : 'text-slate-400'
                  }`}>
                    {yomiForm.probability 
                      ? `${yomiForm.probability}ヨミ` 
                      : '確度未設定'}
                    {yomiForm.expected_amount 
                      ? ` / ${formatCurrency(yomiForm.expected_amount)}` 
                      : ' / 金額未設定'}
                  </span>
                </div>
                <Button 
                  onClick={handleSaveYomi}
                  className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md"
                >
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-slate-800">基本情報</CardTitle>
              <Dialog open={isBasicInfoEditDialogOpen} onOpenChange={setIsBasicInfoEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setIsBasicInfoEditDialogOpen(true)}
                  >
                    <Edit className="w-4 h-4 text-slate-500" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>基本情報の編集</DialogTitle>
                    <DialogDescription>
                      求職者の基本情報を編集できます
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">電話番号</Label>
                      <Input
                        id="edit-phone"
                        placeholder="電話番号を入力..."
                        value={basicInfoForm.phone}
                        onChange={(e) => setBasicInfoForm(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">メールアドレス</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        placeholder="メールアドレスを入力..."
                        value={basicInfoForm.email}
                        onChange={(e) => setBasicInfoForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-prefecture">都道府県</Label>
                        <Input
                          id="edit-prefecture"
                          placeholder="都道府県を入力..."
                          value={basicInfoForm.prefecture}
                          onChange={(e) => setBasicInfoForm(prev => ({ ...prev, prefecture: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-address">市区町村</Label>
                        <Input
                          id="edit-address"
                          placeholder="市区町村を入力..."
                          value={basicInfoForm.address}
                          onChange={(e) => setBasicInfoForm(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-desired-job-type">希望職種</Label>
                      <Input
                        id="edit-desired-job-type"
                        placeholder="例: 保育士, 栄養士"
                        value={basicInfoForm.desired_job_type}
                        onChange={(e) => setBasicInfoForm(prev => ({ ...prev, desired_job_type: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-desired-employment-type">希望雇用形態</Label>
                      <Input
                        id="edit-desired-employment-type"
                        placeholder="例: 正社員, パート"
                        value={basicInfoForm.desired_employment_type}
                        onChange={(e) => setBasicInfoForm(prev => ({ ...prev, desired_employment_type: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-qualification">保有資格</Label>
                      <Input
                        id="edit-qualification"
                        placeholder="例: 保育士, 幼稚園教諭"
                        value={basicInfoForm.qualification}
                        onChange={(e) => setBasicInfoForm(prev => ({ ...prev, qualification: e.target.value }))}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsBasicInfoEditDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button 
                      onClick={handleSaveBasicInfo}
                      className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
                    >
                      保存
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
          <Dialog 
            open={isEditDialogOpen} 
            onOpenChange={(open) => {
              setIsEditDialogOpen(open)
              if (!open) {
                // ダイアログを閉じる際に選択状態をリセット
                setEditType(null)
                setMemoContent('')
              }
            }}
          >
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="bg-white border border-slate-200 shadow-sm">
              <TabsTrigger value="timeline" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                タイムライン
              </TabsTrigger>
              <TabsTrigger value="projects" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                選考状況 ({projects.length})
              </TabsTrigger>
              {isContracted && (
                <TabsTrigger value="contract" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                  <Trophy className="w-4 h-4 mr-1" />
                  成約情報
                </TabsTrigger>
              )}
              <TabsTrigger value="memo" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                メモ
              </TabsTrigger>
            </TabsList>

            {/* 選考状況タブ */}
            <TabsContent value="projects" className="mt-4 space-y-4">
              <div className="flex justify-end mb-4">
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md"
                    onClick={() => {
                      setEditType('project')
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    編集
                  </Button>
                </DialogTrigger>
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

            {/* 成約情報タブ */}
            {isContracted && (
              <TabsContent value="contract" className="mt-4 space-y-4">
                <div className="flex justify-end">
                  <Dialog open={isContractEditDialogOpen} onOpenChange={setIsContractEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md">
                        <Edit className="w-4 h-4 mr-2" />
                        成約情報を編集
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>成約情報の編集</DialogTitle>
                        <DialogDescription>
                          成約後に入力する情報を更新できます
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="employment_type">雇用形態</Label>
                            <Input
                              id="employment_type"
                              placeholder="例: 正社員"
                              value={contractForm.employment_type || ''}
                              onChange={(e) => handleContractFormChange('employment_type', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="job_type">職種</Label>
                            <Input
                              id="job_type"
                              placeholder="例: 保育士"
                              value={contractForm.job_type || ''}
                              onChange={(e) => handleContractFormChange('job_type', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="placement_company">入職先</Label>
                          <Input
                            id="placement_company"
                            placeholder="例: ○○保育園"
                            value={contractForm.placement_company || ''}
                            onChange={(e) => handleContractFormChange('placement_company', e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="payment_date">入金日</Label>
                            <Input
                              id="payment_date"
                              type="date"
                              value={contractForm.payment_date || ''}
                              onChange={(e) => handleContractFormChange('payment_date', e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="invoice_sent_date">請求書発送日</Label>
                            <Input
                              id="invoice_sent_date"
                              type="date"
                              value={contractForm.invoice_sent_date || ''}
                              onChange={(e) => handleContractFormChange('invoice_sent_date', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="calculation_basis">算出根拠</Label>
                          <Input
                            id="calculation_basis"
                            placeholder="例: 3,438,000円×20%"
                            value={contractForm.calculation_basis || ''}
                            onChange={(e) => handleContractFormChange('calculation_basis', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="document_url">格納先URL</Label>
                          <Input
                            id="document_url"
                            type="url"
                            placeholder="https://..."
                            value={contractForm.document_url || ''}
                            onChange={(e) => handleContractFormChange('document_url', e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsContractEditDialogOpen(false)}>
                          キャンセル
                        </Button>
                        <Button 
                          onClick={handleSaveContract}
                          className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
                        >
                          保存
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* 成約サマリーカード */}
                {contract && (
                  <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-green-600 font-medium">成約済み</p>
                          <p className="text-lg font-bold text-green-800">
                            {formatDate(contract.accepted_date)}
                          </p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="text-sm text-slate-500">売上（税抜）</p>
                          <p className="text-2xl font-bold text-green-700">
                            {formatCurrency(contract.revenue_excluding_tax)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 成約詳細情報 */}
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-800">成約詳細</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6">
                      {/* 雇用形態 */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">雇用形態</p>
                          <p className="text-slate-800 font-medium">
                            {contract?.employment_type || contractForm.employment_type || 
                              <span className="text-slate-400 text-sm">未入力</span>}
                          </p>
                        </div>
                      </div>

                      {/* 職種 */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <GraduationCap className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">職種</p>
                          <p className="text-slate-800 font-medium">
                            {contract?.job_type || contractForm.job_type || 
                              <span className="text-slate-400 text-sm">未入力</span>}
                          </p>
                        </div>
                      </div>

                      {/* 入職先 */}
                      <div className="flex items-start gap-3 col-span-2">
                        <div className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                          <Building className="w-4 h-4 text-rose-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">入職先</p>
                          <p className="text-slate-800 font-medium">
                            {contract?.placement_company || contractForm.placement_company || 
                              <span className="text-slate-400 text-sm">未入力</span>}
                          </p>
                        </div>
                      </div>

                      <Separator className="col-span-2 bg-slate-100" />

                      {/* 入金日 */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Banknote className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">入金日</p>
                          <p className="text-slate-800 font-medium">
                            {contract?.payment_date ? formatDate(contract.payment_date) :
                              contractForm.payment_date ? formatDate(contractForm.payment_date) :
                              <span className="text-slate-400 text-sm">未入力</span>}
                          </p>
                          {(contract?.payment_date || contractForm.payment_date) && (
                            <Badge className="mt-1 bg-green-100 text-green-700 border-green-200">
                              入金済み
                            </Badge>
                          )}
                          {!contract?.payment_date && !contractForm.payment_date && (
                            <Badge className="mt-1 bg-amber-100 text-amber-700 border-amber-200">
                              入金待ち
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* 請求書発送日 */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-cyan-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">請求書発送日</p>
                          <p className="text-slate-800 font-medium">
                            {contract?.invoice_sent_date ? formatDate(contract.invoice_sent_date) :
                              contractForm.invoice_sent_date ? formatDate(contractForm.invoice_sent_date) :
                              <span className="text-slate-400 text-sm">未発送</span>}
                          </p>
                        </div>
                      </div>

                      {/* 算出根拠 */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <CalendarCheck className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">算出根拠</p>
                          <p className="text-slate-800 font-medium">
                            {contract?.calculation_basis || contractForm.calculation_basis || 
                              <span className="text-slate-400 text-sm">未入力</span>}
                          </p>
                        </div>
                      </div>

                      {/* 格納先URL */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <LinkIcon className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">格納先URL</p>
                          {(contract?.document_url || contractForm.document_url) ? (
                            <a 
                              href={contract?.document_url || contractForm.document_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 hover:underline text-sm"
                            >
                              ドキュメントを開く
                            </a>
                          ) : (
                            <p className="text-slate-400 text-sm">未設定</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 売上情報カード */}
                {contract && (
                  <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg text-slate-800">売上情報</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="text-center p-4 bg-slate-50 rounded-lg">
                          <p className="text-sm text-slate-500 mb-1">売上（税抜）</p>
                          <p className="text-2xl font-bold text-slate-800">
                            {formatCurrency(contract.revenue_excluding_tax)}
                          </p>
                        </div>
                        <div className="text-center p-4 bg-slate-50 rounded-lg">
                          <p className="text-sm text-slate-500 mb-1">売上（税込）</p>
                          <p className="text-2xl font-bold text-slate-800">
                            {formatCurrency(contract.revenue_including_tax)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            )}

            {/* タイムラインタブ */}
            <TabsContent value="timeline" className="mt-4 space-y-4">
              <div className="flex justify-end mb-4">
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md"
                    onClick={() => {
                      setEditType('timeline')
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    編集
                  </Button>
                </DialogTrigger>
              </div>
              {/* タスク一覧 */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg text-slate-800">タスク一覧</CardTitle>
                  <Dialog open={isTaskEditDialogOpen} onOpenChange={setIsTaskEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button 
                        size="sm"
                        className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md"
                        onClick={() => {
                          setTaskForm({ taskComment: taskComment || '' })
                          setIsTaskEditDialogOpen(true)
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        タスクを追加
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>{taskComment ? 'タスクの編集' : 'タスクの追加'}</DialogTitle>
                        <DialogDescription>
                          {taskComment ? 'タスク内容を編集できます' : '新しいタスクを追加できます'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="task-comment">タスク内容</Label>
                          <Textarea
                            id="task-comment"
                            placeholder="タスク内容を入力してください..."
                            value={taskForm.taskComment}
                            onChange={(e) => setTaskForm(prev => ({ ...prev, taskComment: e.target.value }))}
                            className="min-h-[150px]"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsTaskEditDialogOpen(false)}>
                          キャンセル
                        </Button>
                        <Button 
                          onClick={handleSaveTask}
                          className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
                          disabled={!taskForm.taskComment.trim()}
                        >
                          保存
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {taskComment ? (
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-100 bg-slate-50 hover:bg-slate-50">
                            <TableHead className="text-slate-600 font-semibold w-12"></TableHead>
                            <TableHead className="text-slate-600 font-semibold">タスク内容</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className={`border-slate-100 transition-colors ${isTaskCompleted ? 'bg-slate-50' : 'bg-rose-50/50 hover:bg-rose-50'}`}>
                            <TableCell className="p-2 align-middle">
                              <button
                                onClick={() => setIsTaskCompleted(!isTaskCompleted)}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  isTaskCompleted
                                    ? 'bg-violet-600 border-violet-600'
                                    : 'border-slate-300 hover:border-violet-400'
                                }`}
                              >
                                {isTaskCompleted && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                )}
                              </button>
                            </TableCell>
                            <TableCell className={`p-2 align-middle ${isTaskCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                              {taskComment}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-500">
                      <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p>タスクはありません</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* タイムライン */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-800">タイムライン</CardTitle>
                </CardHeader>
                <CardContent className="py-6">
                  {allTimelineItems.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p>タイムラインイベントがありません</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {allTimelineItems.map((item, index) => {
                        const isLast = index === allTimelineItems.length - 1
                        return (
                          <div key={item.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full ${item.color}`} />
                              {!isLast && <div className="w-0.5 h-full bg-slate-200" />}
                            </div>
                            <div className={!isLast ? 'pb-6' : ''}>
                              <p className="text-sm text-slate-500">
                                {item.date.toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                })}{' '}
                                {item.date.toLocaleTimeString('ja-JP', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                              <p className="text-slate-800 font-medium">{item.title}</p>
                              <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                            </div>
                          </div>
                        )
                      })}
                      {/* 登録日を表示 */}
                      {candidate?.registered_at && (
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">{candidate.registered_at}</p>
                            <p className="text-slate-800">新規登録</p>
                            {candidate.source_id && (
                              <p className="text-sm text-slate-600 mt-1">
                                {mockSources?.find(s => s.id === candidate.source_id)?.name || '不明'}経由
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* メモタブ */}
            <TabsContent value="memo" className="mt-4">
              <div className="flex justify-end mb-4">
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md"
                    onClick={() => {
                      setEditType('memo')
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    編集
                  </Button>
                </DialogTrigger>
              </div>
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="py-6">
                  {candidateMemos.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-500 mb-4">メモはありません</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {candidateMemos.map((memo, index) => {
                        const memoUser = mockUsers.find(u => u.id === memo.created_by)
                        const memoDate = new Date(memo.created_at)
                        const isLast = index === candidateMemos.length - 1
                        return (
                          <div key={memo.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-3 h-3 rounded-full bg-violet-500" />
                              {!isLast && <div className="w-0.5 h-full bg-slate-200 mt-1" />}
                            </div>
                            <div className={`flex-1 ${!isLast ? 'pb-6' : ''}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-sm text-slate-500">
                                  {memoDate.toLocaleDateString('ja-JP', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                  })}{' '}
                                  {memoDate.toLocaleTimeString('ja-JP', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                                {memoUser && (
                                  <Badge variant="outline" className="text-xs bg-slate-50 text-slate-600 border-slate-200">
                                    {memoUser.name}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                                {memo.content}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>情報の追加・編集</DialogTitle>
              <DialogDescription>
                {getDialogDescription()}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              {editType === 'memo' ? (
                <div className="space-y-2">
                  <Label htmlFor="memo">メモ内容</Label>
                  <Textarea
                    id="memo"
                    placeholder="メモを入力してください..."
                    value={memoContent}
                    onChange={(e) => setMemoContent(e.target.value)}
                    className="min-h-[200px]"
                  />
                </div>
              ) : editType === 'timeline' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeline-type">種類</Label>
                    <Select defaultValue="contact">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contact">連絡</SelectItem>
                        <SelectItem value="interview">面接</SelectItem>
                        <SelectItem value="offer">内定</SelectItem>
                        <SelectItem value="other">その他</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeline-date">日時</Label>
                    <Input id="timeline-date" type="datetime-local" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeline-content">内容</Label>
                    <Textarea
                      id="timeline-content"
                      placeholder="内容を入力してください..."
                      className="min-h-[150px]"
                    />
                  </div>
                </div>
              ) : editType === 'project' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">案件名</Label>
                    <Input id="project-name" placeholder="案件名を入力してください..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-phase">フェーズ</Label>
                    <Select defaultValue="interview_scheduled">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interview_scheduled">面接予定</SelectItem>
                        <SelectItem value="interviewed">面接済み</SelectItem>
                        <SelectItem value="offer">内定</SelectItem>
                        <SelectItem value="accepted">入社確定</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-date">日時</Label>
                    <Input id="project-date" type="datetime-local" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-yomi-probability">ヨミ確度</Label>
                    <Select defaultValue="">
                      <SelectTrigger id="project-yomi-probability">
                        <SelectValue placeholder="確度を選択..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Aヨミ（80%）</SelectItem>
                        <SelectItem value="B">Bヨミ（50%）</SelectItem>
                        <SelectItem value="C">Cヨミ（30%）</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-yomi">ヨミ金額</Label>
                    <Input id="project-yomi" type="number" placeholder="金額を入力してください..." />
                  </div>
                </div>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false)
                setEditType(null)
                setMemoContent('')
              }}>
                キャンセル
              </Button>
              {editType && (
                <Button 
                  onClick={() => {
                    if (editType === 'memo') {
                      handleSaveMemo()
                    } else {
                      // TODO: タイムラインや選考状況の保存処理
                      console.log(`保存: ${editType}`)
                      setIsEditDialogOpen(false)
                      setEditType(null)
                    }
                  }}
                  className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
                  disabled={editType === 'memo' && !memoContent.trim()}
                >
                  保存
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>
    </AppLayout>
  )
}

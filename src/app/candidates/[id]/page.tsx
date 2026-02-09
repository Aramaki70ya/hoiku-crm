'use client'

import { use, useState, useEffect, useMemo, useCallback } from 'react'
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
  Banknote,
  Loader2,
  X,
  Trash2,
} from 'lucide-react'
import { mockMemos } from '@/lib/mock-data'
import {
  STATUS_LIST,
  statusLabels,
  statusColors,
  type StatusType,
} from '@/lib/status-mapping'
import type { Contract, Candidate, Project, Interview, User, Source } from '@/types/database'

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

function getProjectDisplayName(
  gardenName?: string | null,
  corporationName?: string | null,
  fallbackName?: string | null
) {
  const cleanGarden = gardenName?.trim() || ''
  const cleanCorporation = corporationName?.trim() || ''
  const cleanFallback = fallbackName?.trim() || ''
  const title = cleanGarden || cleanFallback || cleanCorporation || '未設定'
  const subtitle = cleanGarden && cleanCorporation ? cleanCorporation : ''
  const combined = cleanGarden && cleanCorporation
    ? `${cleanGarden} / ${cleanCorporation}`
    : cleanGarden || cleanCorporation || cleanFallback
  return { title, subtitle, combined }
}

export default function CandidateDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [candidateStatus, setCandidateStatus] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Supabaseからデータを取得
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [allInterviews, setAllInterviews] = useState<Interview[]>([])
  const [, setContract] = useState<Contract | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // まず求職者データを取得（最優先）
      const candidateRes = await fetch(`/api/candidates/${id}?_t=${Date.now()}`, {
        cache: 'no-store',
      })
      if (!candidateRes.ok) {
        if (candidateRes.status === 404) {
          setError('求職者が見つかりません')
        } else {
          setError('データの取得に失敗しました')
        }
        setLoading(false)
        return
      }
      const { data: candidateData } = await candidateRes.json()
      setCandidate(candidateData)
      setCandidateStatus(
        (candidateData.status || '初回連絡中') as StatusType
      )
      
      // 求職者情報が取得できたら、すぐにローディングを解除（段階的ローディング）
      setLoading(false)

      // 並列でその他のデータを取得（バックグラウンドで）
      const [usersRes, projectsRes, contractsRes, sourcesRes, interviewsRes] = await Promise.all([
        fetch('/api/users'),
        fetch(`/api/projects?candidate_id=${id}`), // フィルタ済みで取得
        fetch(`/api/contracts?candidate_id=${id}`), // フィルタ済みで取得
        fetch('/api/sources'),
        fetch('/api/interviews'), // 全件取得（プロジェクトが少ないので問題ない）
      ])

      if (usersRes.ok) {
        const json = await usersRes.json()
        setUsers(json.users ?? [])
      }
      
      let projectIds: string[] = []
      if (projectsRes.ok) {
        const { data } = await projectsRes.json()
        setProjects(data || [])
        projectIds = (data || []).map((p: Project) => p.id)
      }
      
      if (interviewsRes.ok) {
        const { data: interviewsData } = await interviewsRes.json()
        // この求職者のプロジェクトに関連する面接のみフィルタ
        setAllInterviews((interviewsData || []).filter((i: Interview) => 
          projectIds.includes(i.project_id)
        ))
      }
      if (contractsRes.ok) {
        const { data } = await contractsRes.json()
        // candidate_idでフィルタ済みなので、最初の1件を取得
        if (Array.isArray(data) && data.length > 0) {
          setContract(data[0])
        } else {
          setContract(null)
        }
      }
      if (sourcesRes.ok) {
        const { data } = await sourcesRes.json()
        setSources(data || [])
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('データの取得に失敗しました')
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // DBのステータスを正とする（日本語ステータス値をそのまま使用）
  const currentStatus = (
    candidateStatus || candidate?.status || '初回連絡中'
  ) as StatusType
  
  const from = searchParams.get('from')
  const memberId = searchParams.get('memberId')
  const consultantFromList = searchParams.get('consultant')
  const listHref = consultantFromList ? `/candidates?consultant=${consultantFromList}` : '/candidates'

  // 戻る: 保存中なら待つ。一覧からなら必ず Link 的に新規ナビして一覧を再マウント＆再fetch
  const handleBack = () => {
    if (isSaving) return
    if (from === 'members' && memberId) {
      router.push(`/members?selected=${memberId}`)
    } else if (consultantFromList) {
      router.push(listHref)
    } else {
      router.push('/candidates')
    }
  }
  
  // 担当者を取得
  const consultant = users.find((u) => u.id === candidate?.consultant_id)
  
  // 面接データを取得（将来的にUIで表示する用）
  const _interviews = projects.flatMap((p) =>
    allInterviews.filter((i) => i.project_id === p.id).map((i) => ({ ...i, project: p }))
  )
  void _interviews // ESLint警告回避
  
  // メモを取得（この求職者に関連するメモ）
  const candidateMemos = mockMemos.filter(m => m.candidate_id === id).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  
  // タイムラインイベントを取得（API経由）
  const [timelineEvents, setTimelineEvents] = useState<Array<{
    id: string
    candidate_id: string
    event_type: string
    title: string
    description: string | null
    created_at: string
    created_by_user?: { id: string; name: string } | null
  }>>([])
  // タイムラインローディング状態（将来的にローディングUI表示用）
  const [_timelineLoading, setTimelineLoading] = useState(false)
  void _timelineLoading // ESLint警告回避
  
  // タイムラインイベントをAPIから読み込む
  useEffect(() => {
    const loadTimelineEvents = async () => {
      try {
        setTimelineLoading(true)
        const res = await fetch(`/api/timeline-events?candidate_id=${id}&limit=100`)
        if (res.ok) {
          const responseData = await res.json()
          setTimelineEvents(responseData.data || [])
        }
      } catch (err) {
        console.error('タイムラインイベント取得エラー:', err)
      } finally {
        setTimelineLoading(false)
      }
    }
    loadTimelineEvents()
  }, [id])
  
  // タイムラインイベントを追加するヘルパー関数（API経由）
  const addTimelineEvent = async (eventType: string, title: string, description: string) => {
    try {
      const res = await fetch('/api/timeline-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: id,
          event_type: eventType,
          title,
          description,
        }),
      })
      
      if (res.ok) {
        const responseData = await res.json()
        if (responseData.data) {
          // ステートを更新（新しいイベントを先頭に追加）
          setTimelineEvents(prev => [responseData.data, ...prev])
        }
      }
    } catch (err) {
      console.error('タイムラインイベント追加エラー:', err)
    }
  }
  
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
      // イベントタイプに応じた色
      const colorMap: Record<string, string> = {
        'memo': 'bg-violet-500',
        'status_change': 'bg-amber-500',
        'project_add': 'bg-emerald-500',
        'yomi_update': 'bg-indigo-500',
        'consultant_change': 'bg-blue-500',
        'interview_status_change': 'bg-cyan-500',
      }
      items.push({
        id: event.id,
        date: new Date(event.created_at),
        type: event.event_type,
        title: event.title,
        description: event.description || '',
        color: colorMap[event.event_type] || 'bg-slate-500',
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
  
  // 編集ダイアログ用state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editType, setEditType] = useState<'timeline' | 'project' | 'memo' | 'basic' | 'task' | null>(null)
  const [memoContent, setMemoContent] = useState('')
  const [projectError, setProjectError] = useState<string | null>(null)
  
  // 案件追加用state
  const [projectForm, setProjectForm] = useState({
    garden_name: '',
    corporation_name: '',
    phase: '面接予定',
    interview_date: '',
    probability: '' as '' | 'A' | 'B' | 'C',
    expected_amount: '',
  })
  const [projectSaving, setProjectSaving] = useState(false)
  // 面接登録成功後に表示する「面接一覧で〇月を選択」案内（月 YYYY-MM / null で非表示）
  const [registeredInterviewMonth, setRegisteredInterviewMonth] = useState<string | null>(null)
  
  // 基本情報編集用state
  const [basicInfoForm, setBasicInfoForm] = useState({
    name: candidate?.name || '',
    phone: candidate?.phone || '',
    email: candidate?.email || '',
    prefecture: candidate?.prefecture || '',
    address: candidate?.address || '',
    desired_job_type: candidate?.desired_job_type || '',
    desired_employment_type: candidate?.desired_employment_type || '',
    qualification: candidate?.qualification || '',
  })
  const [isBasicInfoEditDialogOpen, setIsBasicInfoEditDialogOpen] = useState(false)
  
  // 基本情報フォームをcandidate変更時に更新
  // candidateの各フィールドが変わった時に初期化
  useEffect(() => {
    if (candidate) {
      setBasicInfoForm({
        name: candidate.name || '',
        phone: candidate.phone || '',
        email: candidate.email || '',
        prefecture: candidate.prefecture || '',
        address: candidate.address || '',
        desired_job_type: candidate.desired_job_type || '',
        desired_employment_type: candidate.desired_employment_type || '',
        qualification: candidate.qualification || '',
      })
    }
  }, [candidate])
  
  // ヨミ情報用state（最初の案件から取得、なければnull）
  const [yomiForm, setYomiForm] = useState({
    probability: null as 'A' | 'B' | 'C' | null,
    probability_month: 'current' as 'current' | 'next',
    expected_amount: null as number | null,
  })
  
  // ヨミ情報をprojects変更時に更新
  const firstProject = projects[0]
  const firstProjectProbability = firstProject?.probability
  const firstProjectExpectedAmount = firstProject?.expected_amount
  const firstProjectProbabilityMonth = firstProject?.probability_month
  
  useEffect(() => {
    if (projects.length > 0) {
      setYomiForm(prev => {
        // 値が実際に変更された場合のみ更新
        if (prev.probability !== firstProjectProbability || 
            prev.expected_amount !== firstProjectExpectedAmount ||
            prev.probability_month !== (firstProjectProbabilityMonth || 'current')) {
          return {
            probability: firstProjectProbability || null,
            probability_month: firstProjectProbabilityMonth || 'current',
            expected_amount: firstProjectExpectedAmount || null,
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
            probability_month: 'current',
            expected_amount: null,
          }
        }
        return prev
      })
    }
  }, [projects.length, firstProjectProbability, firstProjectExpectedAmount, firstProjectProbabilityMonth])
  
  const handleSaveMemo = async () => {
    if (!memoContent.trim() || !candidate) return
    
    // タイムラインにメモを追加
    addTimelineEvent('memo', 'メモ追加', memoContent)
    
    // candidatesテーブルのmemoフィールドも更新（一覧画面で表示される）
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: memoContent }),
      })
      if (res.ok) {
        // ローカルのcandidateも更新
        setCandidate(prev => prev ? { ...prev, memo: memoContent } : prev)
      }
    } catch (err) {
      console.error('メモ保存エラー:', err)
    }
    
    setMemoContent('')
    setIsEditDialogOpen(false)
    setEditType(null)
  }
  
  const handleSaveBasicInfo = async () => {
    if (!candidate) return
    
    try {
      const res = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basicInfoForm),
      })
      
      if (res.ok) {
        // ローカルのcandidateも更新
        setCandidate(prev => prev ? { ...prev, ...basicInfoForm } : prev)
        // タイムラインにも記録
        addTimelineEvent('basic_info_update', '基本情報更新', '連絡先・希望条件を更新しました')
      } else {
        const errorData = await res.json()
        console.error('基本情報保存エラー:', errorData)
        alert('基本情報の保存に失敗しました')
      }
    } catch (err) {
      console.error('基本情報保存エラー:', err)
      alert('基本情報の保存に失敗しました')
    }
    
    setIsBasicInfoEditDialogOpen(false)
  }
  
  // 案件追加の保存処理
  const handleSaveProject = async () => {
    const gardenName = projectForm.garden_name.trim()
    const corporationName = projectForm.corporation_name.trim()
    setProjectError(null)
    if (!candidate || !gardenName || !corporationName || !projectForm.interview_date) {
      setProjectError('園名・法人名・面接日を入力してね')
      return
    }
    
    setProjectSaving(true)
    try {
      // 案件を作成（フェーズは面接予定で固定）
      const projectDisplay = getProjectDisplayName(gardenName, corporationName, null)
      const projectRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidate.id,
          client_name: projectDisplay.combined || gardenName,
          garden_name: gardenName,
          corporation_name: corporationName,
          phase: '面接予定',
        }),
      })
      
      if (projectRes.ok) {
        const projectData = await projectRes.json()
        const newProject = projectData?.data
        if (!newProject?.id) {
          console.error('案件登録エラー: APIは成功したが data が返っていない status=', projectRes.status, 'body=', JSON.stringify(projectData))
          setProjectError(`案件登録に失敗しました。サーバー応答が不正です（${projectRes.status}）。`)
          return
        }
        setProjects(prev => [...prev, newProject])
        
        const interviewDate = new Date(projectForm.interview_date)
        
        // 面接データも作成
        const interviewRes = await fetch('/api/interviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: newProject.id,
            type: 'interview',
            start_at: projectForm.interview_date,
            location: projectDisplay.combined || gardenName,
            status: '調整中',
          }),
        })
        
        if (interviewRes.ok) {
          const interviewData = await interviewRes.json()
          setAllInterviews(prev => [...prev, interviewData.data])
          const yyyyMm = `${interviewDate.getFullYear()}-${String(interviewDate.getMonth() + 1).padStart(2, '0')}`
          setRegisteredInterviewMonth(yyyyMm)
        } else {
          const interviewText = await interviewRes.text()
          let interviewMessage = interviewText
          try {
            const parsed = JSON.parse(interviewText)
            interviewMessage = parsed.details || parsed.error || interviewText
          } catch {
            // JSONでない場合はそのまま表示
          }
          alert(`面接一覧への登録に失敗しました（${interviewRes.status}）。案件は作成済みです。${interviewMessage ? `\n${interviewMessage}` : ''}`)
        }
        
        // タイムラインにイベントを追加（projectForm から直接参照してスコープを確実に）
        const dateForTimeline = new Date(projectForm.interview_date)
        const description = `${projectDisplay.combined || gardenName}（${dateForTimeline.toLocaleDateString('ja-JP')} ${dateForTimeline.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })})`
        addTimelineEvent('project_add', '面接追加', description)
        
        // フォームをリセット
        setProjectForm({
          garden_name: '',
          corporation_name: '',
                  phase: '面接予定',
                  interview_date: '',
                  probability: '',
                  expected_amount: '',
                })
                setIsEditDialogOpen(false)
                setEditType(null)
      } else {
        const errorText = await projectRes.text()
        let errorMessage = errorText
        try {
          const parsed = JSON.parse(errorText)
          errorMessage = parsed.details || parsed.error || errorText
        } catch {
          // JSONでない場合はそのまま表示
        }
        console.error('案件登録エラー: status=' + projectRes.status + ' statusText=' + projectRes.statusText + ' body=' + errorText)
        setProjectError(`案件登録に失敗しました（${projectRes.status}）。${errorMessage || ''}`)
      }
    } catch (err) {
      console.error('案件追加エラー:', err)
      setProjectError(err instanceof Error ? err.message : '案件登録に失敗しました')
    } finally {
      setProjectSaving(false)
    }
  }
  
  const [yomiSaving, setYomiSaving] = useState(false)
  
  const handleSaveYomi = async () => {
    if (!candidate) return
    
    setYomiSaving(true)
    try {
      // 既存のプロジェクトがあれば更新、なければ新規作成
      const existingProject = projects.find((p) => p.candidate_id === candidate.id)
      
      if (existingProject) {
        // 既存プロジェクトを更新
        const res = await fetch(`/api/projects/${existingProject.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            probability: yomiForm.probability,
            probability_month: yomiForm.probability_month,
            expected_amount: yomiForm.expected_amount,
          }),
        })
        if (res.ok) {
          const { data } = await res.json()
          setProjects((prev) => prev.map((p) => (p.id === existingProject.id ? data : p)))
          
          // タイムラインにイベントを追加
          const monthLabel = yomiForm.probability_month === 'next' 
            ? `${new Date().getMonth() === 11 ? new Date().getFullYear() + 1 : new Date().getFullYear()}年${new Date().getMonth() === 11 ? 1 : new Date().getMonth() + 2}月`
            : `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`
          addTimelineEvent(
            'yomi_update',
            'ヨミ情報更新',
            `${yomiForm.probability}ヨミ / ${monthLabel} / ${formatCurrency(yomiForm.expected_amount || 0)}`
          )
        }
      } else if (yomiForm.probability && yomiForm.expected_amount) {
        // 新規プロジェクト作成
        const res = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate_id: candidate.id,
            client_name: '未設定',
            phase: '提案済',
            probability: yomiForm.probability,
            probability_month: yomiForm.probability_month,
            expected_amount: yomiForm.expected_amount,
          }),
        })
        if (res.ok) {
          const { data } = await res.json()
          setProjects((prev) => [...prev, data])
          
          // タイムラインにイベントを追加
          const monthLabel = yomiForm.probability_month === 'next' 
            ? `${new Date().getMonth() === 11 ? new Date().getFullYear() + 1 : new Date().getFullYear()}年${new Date().getMonth() === 11 ? 1 : new Date().getMonth() + 2}月`
            : `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`
          addTimelineEvent(
            'yomi_update',
            'ヨミ情報登録',
            `${yomiForm.probability}ヨミ / ${monthLabel} / ${formatCurrency(yomiForm.expected_amount || 0)}`
          )
        }
      }
    } catch (err) {
      console.error('ヨミ保存エラー:', err)
    } finally {
      setYomiSaving(false)
    }
  }

  const getDialogDescription = () => {
    if (editType === 'timeline') return 'タイムラインに履歴を追加します'
    if (editType === 'project') return '面接予定を登録します'
    if (editType === 'memo') return 'メモを追加します'
    return '情報を追加・編集します'
  }

  // ローディング中（candidateがまだ取得できていない場合）
  if (loading && !candidate) {
    return (
      <AppLayout title="読み込み中...">
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-4" />
          <p className="text-slate-500">データを読み込み中...</p>
        </div>
      </AppLayout>
    )
  }

  // エラー時または求職者が見つからない場合
  if (error || !candidate) {
    const c = searchParams.get('consultant')
    const backHref = c ? `/candidates?consultant=${c}` : '/candidates'
    return (
      <AppLayout title="求職者が見つかりません">
        <div className="flex flex-col items-center justify-center h-96">
          <p className="text-slate-500 mb-4">{error || '指定された求職者は存在しません'}</p>
          <Link href={backHref}>
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
            disabled={isSaving}
            className={isSaving ? "text-slate-300" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800">{candidate.name}</h1>
              <Select
                value={currentStatus}
                disabled={isSaving}
                onValueChange={async (value) => {
                  const oldStatus = currentStatus
                  if (oldStatus === value || !candidate) return
                  setIsSaving(true)
                  setCandidateStatus(value)
                  try {
                    const res = await fetch(`/api/candidates/${candidate.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: value }),
                    })
                    if (!res.ok) {
                      console.error('ステータス更新失敗:', await res.text())
                      setCandidateStatus(oldStatus)
                      return
                    }
                    // タイムラインイベントはAPIが自動で記録するため、ここでは不要
                  } catch (err) {
                    console.error('ステータス更新エラー:', err)
                    setCandidateStatus(oldStatus)
                  } finally {
                    setIsSaving(false)
                  }
                }}
              >
                <SelectTrigger className="w-32 h-8 p-0 border-0 bg-transparent hover:bg-slate-100" disabled={isSaving}>
                  <SelectValue>
                    <Badge variant="outline" className={isSaving ? 'bg-slate-100 text-slate-500' : statusColors[currentStatus]}>
                      {isSaving ? '保存中...' : (statusLabels[currentStatus] || currentStatus)}
                    </Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {STATUS_LIST.map((status) => (
                    <SelectItem key={status} value={status}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={statusColors[status]}>
                          {statusLabels[status]}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-slate-500 mt-1">
              {candidate.age != null && candidate.age < 120 ? `${candidate.age}歳` : '—'}
              {candidate.prefecture && ` / ${candidate.prefecture}${candidate.address || ''}`}
            </p>
          </div>
        </div>
      </div>

      {/* 面接登録直後の案内（面接一覧で同じ月を選ぶと表示される） */}
      {registeredInterviewMonth && (() => {
        const [y, m] = registeredInterviewMonth.split('-')
        const monthLabel = `${y}年${parseInt(m, 10)}月`
        return (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              面接を登録しました。面接一覧で <strong>{monthLabel}</strong> を選択すると表示されます。
              <Link
                href={`/interviews?month=${registeredInterviewMonth}`}
                className="font-medium underline hover:no-underline"
              >
                面接一覧で確認
              </Link>
            </span>
            <button
              type="button"
              onClick={() => setRegisteredInterviewMonth(null)}
              className="shrink-0 rounded p-1 text-emerald-600 hover:bg-emerald-100"
              aria-label="閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })()}

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
                      setYomiForm(prev => ({ ...prev, probability: null, expected_amount: null }))
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
                <Label htmlFor="yomi-month" className="text-slate-700 font-medium">対象月</Label>
                <Select
                  value={yomiForm.probability_month}
                  onValueChange={(value) => setYomiForm(prev => ({ ...prev, probability_month: value as 'current' | 'next' }))}
                >
                  <SelectTrigger id="yomi-month" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">当月（{new Date().getFullYear()}年{new Date().getMonth() + 1}月）</SelectItem>
                    <SelectItem value="next">翌月（{new Date().getMonth() === 11 ? new Date().getFullYear() + 1 : new Date().getFullYear()}年{new Date().getMonth() === 11 ? 1 : new Date().getMonth() + 2}月）</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {yomiForm.probability_month === 'next' 
                    ? `${new Date().getMonth() === 11 ? new Date().getFullYear() + 1 : new Date().getFullYear()}年${new Date().getMonth() === 11 ? 1 : new Date().getMonth() + 2}月のヨミとして登録`
                    : `${new Date().getFullYear()}年${new Date().getMonth() + 1}月のヨミとして登録`}
                </p>
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
                      ? `${yomiForm.probability}ヨミ / ${yomiForm.probability_month === 'next' 
                          ? `${new Date().getMonth() === 11 ? new Date().getFullYear() + 1 : new Date().getFullYear()}年${new Date().getMonth() === 11 ? 1 : new Date().getMonth() + 2}月` 
                          : `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`}` 
                      : '確度未設定'}
                    {yomiForm.expected_amount 
                      ? ` / ${formatCurrency(yomiForm.expected_amount)}` 
                      : ' / 金額未設定'}
                  </span>
                </div>
                <Button 
                  onClick={handleSaveYomi}
                  disabled={yomiSaving}
                  className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md"
                >
                  {yomiSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : '保存'}
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
                      <Label htmlFor="edit-name">氏名</Label>
                      <Input
                        id="edit-name"
                        placeholder="氏名を入力..."
                        value={basicInfoForm.name}
                        onChange={(e) => setBasicInfoForm(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
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
                setProjectError(null)
                setProjectForm({
                  garden_name: '',
                  corporation_name: '',
                  phase: '面接予定',
                  interview_date: '',
                  probability: '',
                  expected_amount: '',
                })
              }
            }}
          >
          <Tabs defaultValue="timeline" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-white border border-slate-200 shadow-sm">
                <TabsTrigger value="timeline" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                  タイムライン
                </TabsTrigger>
                <TabsTrigger value="projects" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                  選考状況 ({projects.length})
                </TabsTrigger>
                <TabsTrigger value="memo" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white">
                  メモ
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md"
                    onClick={() => {
                      setEditType('memo')
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    メモ追加
                  </Button>
                </DialogTrigger>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white shadow-md"
                    onClick={() => {
                      setEditType('project')
                      setProjectError(null)
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    面接追加
                  </Button>
                </DialogTrigger>
              </div>
            </div>

            {/* 選考状況タブ */}
            <TabsContent value="projects" className="mt-4 space-y-4">

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
                  const projectInterviews = allInterviews.filter(
                    (i) => i.project_id === project.id
                  )
                  const p = project as Project & { garden_name?: string | null; corporation_name?: string | null }
                  const projectDisplay = getProjectDisplayName(
                    p.garden_name ?? undefined,
                    p.corporation_name ?? undefined,
                    p.client_name
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
                              {projectDisplay.title}
                            </h3>
                            {projectDisplay.subtitle && (
                              <p className="text-xs text-slate-500">法人: {projectDisplay.subtitle}</p>
                            )}
                            <p className="text-sm text-slate-500">
                              ヨミ: ¥{project.expected_amount?.toLocaleString() || '-'}
                            </p>
                          </div>
                          <Badge className="bg-cyan-100 text-cyan-700 border-cyan-200">
                            {project.phase === '面接予定'
                              ? '面接予定'
                              : project.phase === '入社確定'
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
                                className="flex items-center gap-3 py-2 group"
                              >
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
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
                                <span className="text-slate-600 min-w-0 truncate">
                                  @ {interview.location}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 opacity-60 hover:opacity-100 hover:text-rose-600"
                                  title="この面接を削除"
                                  onClick={async () => {
                                    if (!confirm('この面接を削除してよいですか？')) return
                                    try {
                                      const res = await fetch(`/api/interviews/${interview.id}`, { method: 'DELETE' })
                                      if (res.ok) {
                                        setAllInterviews((prev) => prev.filter((i) => i.id !== interview.id))
                                      } else {
                                        const err = await res.json().catch(() => ({}))
                                        alert(err.details || err.error || '削除に失敗しました')
                                      }
                                    } catch (e) {
                                      alert('削除に失敗しました')
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
            <TabsContent value="timeline" className="mt-4 space-y-4">
              {/* タイムライン */}
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-800">タイムライン</CardTitle>
                </CardHeader>
                <CardContent className="py-6 max-h-[600px] overflow-y-auto">
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
                                {sources?.find(s => s.id === candidate.source_id)?.name || '不明'}経由
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
              <Card className="bg-white border-slate-200 shadow-sm">
                <CardContent className="py-6">
                  {candidateMemos.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-slate-500 mb-4">メモはありません</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {candidateMemos.map((memo, index) => {
                        const memoUser = users.find(u => u.id === memo.created_by)
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
                    <Label htmlFor="project-corporation">面接先（法人名）<span className="text-red-500">*</span></Label>
                    <Input 
                      id="project-corporation" 
                      placeholder="例: さくら福祉会" 
                      value={projectForm.corporation_name}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, corporation_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-garden">面接先（園名）<span className="text-red-500">*</span></Label>
                    <Input 
                      id="project-garden" 
                      placeholder="例: さくら保育園" 
                      value={projectForm.garden_name}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, garden_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project-date">面接日（月・日）<span className="text-red-500">*</span></Label>
                    <Input 
                      id="project-date" 
                      type="date" 
                      value={projectForm.interview_date}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, interview_date: e.target.value }))}
                    />
                    <p className="text-xs text-slate-500">面接一覧に自動登録されます</p>
                  </div>
                </div>
              ) : null}
            </div>
            {editType === 'project' && projectError && (
              <p className="text-xs text-rose-600">{projectError}</p>
            )}
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
                    } else if (editType === 'project') {
                      handleSaveProject()
                    } else {
                      setIsEditDialogOpen(false)
                      setEditType(null)
                    }
                  }}
                  className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
                  disabled={
                    (editType === 'memo' && !memoContent.trim()) ||
                    (editType === 'project' && (!projectForm.garden_name.trim() || !projectForm.corporation_name.trim() || !projectForm.interview_date || projectSaving))
                  }
                >
                  {projectSaving ? '保存中...' : '保存'}
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

'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { useContracts } from '@/hooks/useContracts'
import { useUsers } from '@/hooks/useUsers'
import type { Contract } from '@/types/database'
import {
  Trophy,
  Banknote,
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  Check,
  X,
  Ban,
  Download,
  Undo2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// 金額をフォーマット
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(amount)
}

// 日付をフォーマット
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// 年月の選択肢を生成（過去24ヶ月）
function generateMonthOptions() {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`
    options.push({ value, label })
  }
  return options
}

const REFUND_RATE_OPTIONS = [50, 80, 100] as const

function escapeCsvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function downloadCsv(filename: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const bom = '\uFEFF'
  const lines = [header.map(escapeCsvCell).join(','), ...rows.map((r) => r.map(escapeCsvCell).join(','))]
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function ContractsPage() {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [fromMonth, setFromMonth] = useState(currentMonth)
  const [toMonth, setToMonth] = useState(currentMonth)
  const [selectedConsultant, setSelectedConsultant] = useState<string>('all')

  const { contracts: acceptedRaw, isLoading: loadingAccepted, refetch: refetchAccepted } = useContracts({
    fromMonth,
    toMonth,
    consultantId: selectedConsultant,
    listMode: 'accepted',
  })
  const { contracts: cancelledRaw, isLoading: loadingCancelled, refetch: refetchCancelled } = useContracts({
    fromMonth,
    toMonth,
    consultantId: selectedConsultant,
    listMode: 'cancelled',
  })

  const isLoading = loadingAccepted || loadingCancelled
  const { users, consultants: consultantUsers } = useUsers()

  /** 成約担当に管理者がいるため、一般担当＋admin を一覧に出す（重複なし） */
  const consultantFilterOptions = useMemo(() => {
    const m = new Map<string, (typeof users)[0]>()
    consultantUsers.forEach((u) => m.set(u.id, u))
    users.filter((u) => u.role === 'admin').forEach((u) => {
      if (!m.has(u.id)) m.set(u.id, u)
    })
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  }, [users, consultantUsers])

  const patchContract = useCallback(
    async (id: string, updates: Partial<Contract>) => {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '更新に失敗しました')
      }
      await Promise.all([refetchAccepted(), refetchCancelled()])
      return true
    },
    [refetchAccepted, refetchCancelled]
  )

  // 期間内の成約はレコード単位で全件表示（求職者ごとに1件に潰すと行が消えるため）
  const contracts = useMemo(() => {
    return [...acceptedRaw].sort((a, b) => {
      const da = a.accepted_date?.slice(0, 10) ?? ''
      const db = b.accepted_date?.slice(0, 10) ?? ''
      return db.localeCompare(da)
    })
  }, [acceptedRaw])
  const [editingContractId, setEditingContractId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Contract>>({})
  const [cancellingContractId, setCancellingContractId] = useState<string | null>(null)
  const [cancelFormData, setCancelFormData] = useState<{
    refund_required: boolean
    refund_rate: number | null
    refund_date: string | null
  }>({
    refund_required: false,
    refund_rate: null,
    refund_date: null,
  })
  const [editingCancelId, setEditingCancelId] = useState<string | null>(null)
  const [cancelEditData, setCancelEditData] = useState<{
    refund_date: string | null
    refund_amount: number | null
    cancellation_reason: string | null
    resignation_date: string | null
    refund_rate: number | null
  }>({
    refund_date: null,
    refund_amount: null,
    cancellation_reason: null,
    resignation_date: null,
    refund_rate: null,
  })

  const monthOptions = generateMonthOptions()

  const handleStartEdit = (contract: Contract) => {
    setEditingContractId(contract.id)
    setEditData({
      accepted_date: contract.accepted_date,
      revenue_excluding_tax: contract.revenue_excluding_tax,
      revenue_including_tax: contract.revenue_including_tax,
      payment_date: contract.payment_date,
      payment_scheduled_date: contract.payment_scheduled_date,
      invoice_sent_date: contract.invoice_sent_date,
      placement_company_name: contract.placement_company_name || '',
      placement_facility_name: contract.placement_facility_name || '',
      placement_company: contract.placement_company || '',
    })
  }

  const handleSaveEdit = async (contractId: string) => {
    try {
      await patchContract(contractId, editData)
    } catch {
      return
    }
    setEditingContractId(null)
    setEditData({})
  }

  const handleCancelEdit = () => {
    setEditingContractId(null)
    setEditData({})
  }

  const handleStartCancel = (contract: Contract) => {
    setCancellingContractId(contract.id)
    setCancelFormData({
      refund_required: contract.refund_required || false,
      refund_rate: contract.refund_rate ?? null,
      refund_date: contract.refund_date || null,
    })
  }

  const handleSaveCancel = async (contractId: string) => {
    try {
      await patchContract(contractId, {
        is_cancelled: true,
        refund_required: cancelFormData.refund_required,
        cancelled_at: new Date().toISOString(),
        refund_rate: cancelFormData.refund_rate,
        refund_date: cancelFormData.refund_date,
      })
    } catch {
      return
    }
    setCancellingContractId(null)
    setCancelFormData({
      refund_required: false,
      refund_rate: null,
      refund_date: null,
    })
  }

  const handleCancelCancel = () => {
    setCancellingContractId(null)
    setCancelFormData({
      refund_required: false,
      refund_rate: null,
      refund_date: null,
    })
  }

  const handleStartEditCancel = (contract: Contract) => {
    setEditingCancelId(contract.id)
    setCancelEditData({
      refund_date: contract.refund_date || null,
      refund_amount: contract.refund_amount || null,
      cancellation_reason: contract.cancellation_reason || null,
      resignation_date: contract.resignation_date || null,
      refund_rate: contract.refund_rate ?? null,
    })
  }

  const handleSaveEditCancel = async (contractId: string) => {
    try {
      await patchContract(contractId, {
        refund_date: cancelEditData.refund_date,
        refund_amount: cancelEditData.refund_amount,
        cancellation_reason: cancelEditData.cancellation_reason,
        resignation_date: cancelEditData.resignation_date,
        refund_rate: cancelEditData.refund_rate,
      })
    } catch {
      return
    }
    setEditingCancelId(null)
    setCancelEditData({
      refund_date: null,
      refund_amount: null,
      cancellation_reason: null,
      resignation_date: null,
      refund_rate: null,
    })
  }

  const handleCancelEditCancel = () => {
    setEditingCancelId(null)
    setCancelEditData({
      refund_date: null,
      refund_amount: null,
      cancellation_reason: null,
      resignation_date: null,
      refund_rate: null,
    })
  }

  const cancelledContracts = useMemo(() => cancelledRaw, [cancelledRaw])

  const refundSummary = useMemo(() => {
    const total = cancelledContracts.reduce((sum, c) => sum + (c.refund_amount ?? 0), 0)
    const count = cancelledContracts.filter((c) => (c.refund_amount ?? 0) > 0).length
    return { total, count }
  }, [cancelledContracts])

  const summary = useMemo(() => {
    const totalRevenue = contracts.reduce((sum, c) => sum + c.revenue_excluding_tax, 0)
    const totalRevenueTax = contracts.reduce((sum, c) => sum + c.revenue_including_tax, 0)
    const paidCount = contracts.filter((c) => c.payment_date).length
    const pendingCount = contracts.filter((c) => !c.payment_date).length

    return {
      count: contracts.length,
      totalRevenue,
      totalRevenueTax,
      paidCount,
      pendingCount,
    }
  }, [contracts])

  const periodLabel = useMemo(() => {
    if (fromMonth === toMonth) {
      const [y, m] = fromMonth.split('-')
      return `${y}年${Number(m)}月`
    }
    const [fy, fm] = fromMonth.split('-')
    const [ty, tm] = toMonth.split('-')
    return `${fy}年${Number(fm)}月〜${ty}年${Number(tm)}月`
  }, [fromMonth, toMonth])

  const handleExportCsv = useCallback(() => {
    const ymd = new Date().toISOString().slice(0, 10)
    const mainHeader = [
      '氏名',
      '担当',
      '経由',
      '承諾日',
      '入社日',
      '職種',
      '雇用形態',
      '売上税抜',
      '売上税込',
      '請求書発行',
      '入金予定日',
      '入金日',
      '入職先',
      'ステータス',
    ]
    const mainRows = contracts.map((contract) => {
      const candidateData = (
        contract as { candidate?: { name?: string; consultant_id?: string; source?: { name?: string } } }
      ).candidate
      const consultantIdRow = candidateData?.consultant_id
      const consultant = users.find((u) => u.id === consultantIdRow)
      const placement =
        [contract.placement_company_name, contract.placement_facility_name].filter(Boolean).join(' / ') ||
        contract.placement_company ||
        ''
      return [
        candidateData?.name || '',
        consultant?.name || '',
        candidateData?.source?.name || '',
        contract.accepted_date,
        contract.entry_date || '',
        contract.job_type || '',
        contract.employment_type || '',
        contract.revenue_excluding_tax,
        contract.revenue_including_tax,
        contract.invoice_sent_date ? '済' : '未',
        contract.payment_scheduled_date || '',
        contract.payment_date || '',
        placement,
        contract.is_cancelled ? 'キャンセル済' : contract.payment_date ? '入金済み' : '入金待ち',
      ]
    })
    downloadCsv(`成約一覧_${periodLabel.replace(/[〜]/g, '-')}_${ymd}.csv`, mainHeader, mainRows)

    if (cancelledContracts.length > 0) {
      const cancelHeader = [
        '氏名',
        '担当',
        '返金あり/なし',
        '返金率',
        '返金日',
        '返金額',
        '退職日',
        '入職先',
        '備考',
      ]
      const cancelRows = cancelledContracts.map((contract) => {
        const candidateData = (contract as { candidate?: { name?: string; consultant_id?: string } }).candidate
        const consultantIdRow = candidateData?.consultant_id
        const consultant = users.find((u) => u.id === consultantIdRow)
        const placement =
          [contract.placement_company_name, contract.placement_facility_name].filter(Boolean).join(' / ') ||
          contract.placement_company ||
          ''
        return [
          candidateData?.name || '',
          consultant?.name || '',
          contract.refund_required ? '返金あり' : '返金なし',
          contract.refund_rate != null ? `${contract.refund_rate}%` : '',
          contract.refund_date || '',
          contract.refund_amount ?? '',
          contract.resignation_date || '',
          placement,
          contract.cancellation_reason || '',
        ]
      })
      downloadCsv(`キャンセルリスト_${periodLabel.replace(/[〜]/g, '-')}_${ymd}.csv`, cancelHeader, cancelRows)
    }
  }, [contracts, cancelledContracts, users, periodLabel])


  // ローディング中の表示
  if (isLoading) {
    return (
      <AppLayout title="成約管理">
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">読み込み中...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="成約管理">
      <div className="space-y-6">
        {/* ヘッダー */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">成約管理</h1>
            <p className="text-sm text-gray-500 mt-1">
              成約した求職者の売上・入金状況を管理
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs text-gray-500 hidden sm:inline">期間</span>
            <Select
              value={fromMonth}
              onValueChange={(v) => {
                setFromMonth(v)
                if (v > toMonth) setToMonth(v)
              }}
            >
              <SelectTrigger className="w-[150px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="開始月" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-gray-400 text-sm">〜</span>
            <Select
              value={toMonth}
              onValueChange={(v) => {
                setToMonth(v)
                if (v < fromMonth) setFromMonth(v)
              }}
            >
              <SelectTrigger className="w-[150px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="終了月" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="担当者" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全員</SelectItem>
                {consultantFilterOptions.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button type="button" variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
              <Download className="w-4 h-4" />
              CSV
            </Button>
          </div>
        </div>

        <p className="text-xs text-slate-500 -mt-2">表示期間: {periodLabel}</p>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Trophy className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">成約件数</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.count}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      件
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Banknote className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">売上（税抜）</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(summary.totalRevenue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">入金済み</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.paidCount}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      件
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">入金待ち</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.pendingCount}
                    <span className="text-sm font-normal text-gray-500 ml-1">
                      件
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-100 bg-red-50/40">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <Undo2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">返金合計（期間内キャンセル）</p>
                  <p className="text-xl font-bold text-red-700">
                    {formatCurrency(refundSummary.total)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{refundSummary.count} 件に返金額あり</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 成約一覧テーブル */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">成約一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>氏名</TableHead>
                    <TableHead>担当</TableHead>
                    <TableHead>経由</TableHead>
                    <TableHead>承諾日</TableHead>
                    <TableHead>入社日</TableHead>
                    <TableHead>職種</TableHead>
                    <TableHead>雇用形態</TableHead>
                    <TableHead className="text-right">売上</TableHead>
                    <TableHead>請求書発行</TableHead>
                    <TableHead>入金予定日</TableHead>
                    <TableHead>入金日</TableHead>
                    <TableHead>入職先</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="w-20">編集</TableHead>
                    <TableHead className="w-20">キャンセル</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={15}
                        className="text-center py-8 text-gray-500"
                      >
                        該当する成約データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    contracts.map((contract) => {
                      // API経由で取得したデータからcandidateの情報を取得
                      const candidateData = (contract as { candidate?: { name?: string; consultant_id?: string; source?: { name?: string } } }).candidate
                      const consultantId = candidateData?.consultant_id
                      const consultant = users.find((u) => u.id === consultantId)
                      const candidateName = candidateData?.name || '不明'
                      const source = candidateData?.source?.name || '-'

                      return (
                        <TableRow
                          key={contract.id}
                          className={contract.is_cancelled ? 'bg-red-50/60' : undefined}
                        >
                          <TableCell className="font-medium">
                            <Link 
                              href={`/candidates/${contract.candidate_id}`}
                              className="text-slate-800 hover:text-indigo-600 hover:underline"
                            >
                              {candidateName}
                            </Link>
                          </TableCell>
                          <TableCell>{consultant?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {source}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {editingContractId === contract.id ? (
                              <Input
                                type="date"
                                value={editData.accepted_date || contract.accepted_date}
                                onChange={(e) => setEditData(prev => ({ ...prev, accepted_date: e.target.value }))}
                                className="w-32 h-8 text-sm"
                              />
                            ) : (
                              formatDate(contract.accepted_date)
                            )}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatDate(contract.entry_date)}
                          </TableCell>
                          <TableCell className="text-sm max-w-[100px] truncate" title={contract.job_type || ''}>
                            {contract.job_type || '-'}
                          </TableCell>
                          <TableCell className="text-sm max-w-[100px] truncate" title={contract.employment_type || ''}>
                            {contract.employment_type || '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {editingContractId === contract.id ? (
                              <Input
                                type="number"
                                value={editData.revenue_excluding_tax ?? contract.revenue_excluding_tax}
                                onChange={(e) => {
                                  const value = Number(e.target.value)
                                  setEditData(prev => ({ 
                                    ...prev, 
                                    revenue_excluding_tax: value,
                                    revenue_including_tax: Math.round(value * 1.1)
                                  }))
                                }}
                                className="w-32 h-8 text-sm text-right"
                              />
                            ) : (
                              <div className="text-sm">
                                <div className="font-medium">{formatCurrency(contract.revenue_excluding_tax)}</div>
                                <div className="text-gray-500">{formatCurrency(contract.revenue_including_tax)}</div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingContractId === contract.id ? (
                              <div className="relative">
                                <Select
                                  value={editData.invoice_sent_date !== undefined
                                    ? (editData.invoice_sent_date ? 'sent' : 'unsent')
                                    : (contract.invoice_sent_date ? 'sent' : 'unsent')
                                  }
                                  onValueChange={(value) => {
                                    if (value === 'sent') {
                                      setEditData(prev => ({
                                        ...prev,
                                        invoice_sent_date: prev.invoice_sent_date || contract.invoice_sent_date || new Date().toISOString().split('T')[0],
                                      }))
                                    } else {
                                      setEditData(prev => ({ ...prev, invoice_sent_date: null }))
                                    }
                                  }}
                                >
                                  <SelectTrigger className="min-w-[100px] h-8 border border-slate-200 bg-white rounded-md shadow-sm hover:bg-slate-50 px-3 text-sm">
                                    <SelectValue asChild>
                                      <span className="flex items-center gap-1.5">
                                        {editData.invoice_sent_date !== undefined
                                          ? (editData.invoice_sent_date ? (
                                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">済</Badge>
                                            ) : (
                                              <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs">未</Badge>
                                            ))
                                          : (contract.invoice_sent_date ? (
                                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">済</Badge>
                                            ) : (
                                              <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs">未</Badge>
                                            ))
                                        }
                                      </span>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="sent">
                                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">済</Badge>
                                    </SelectItem>
                                    <SelectItem value="unsent">
                                      <Badge className="bg-gray-100 text-gray-700 border-gray-200">未</Badge>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : contract.invoice_sent_date ? (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                済
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                                未
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingContractId === contract.id ? (
                              <Input
                                type="date"
                                value={editData.payment_scheduled_date || contract.payment_scheduled_date || ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, payment_scheduled_date: e.target.value || null }))}
                                className="w-32 h-8 text-sm"
                              />
                            ) : (
                              formatDate(contract.payment_scheduled_date)
                            )}
                          </TableCell>
                          <TableCell>
                            {editingContractId === contract.id ? (
                              <Input
                                type="date"
                                value={editData.payment_date || contract.payment_date || ''}
                                onChange={(e) => setEditData(prev => ({ ...prev, payment_date: e.target.value || null }))}
                                className="w-32 h-8 text-sm"
                              />
                            ) : (
                              formatDate(contract.payment_date)
                            )}
                          </TableCell>
                          <TableCell className="max-w-[280px]">
                            {editingContractId === contract.id ? (
                              <div className="space-y-2 min-w-[240px]">
                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">法人名</label>
                                  <Input
                                    type="text"
                                    value={editData.placement_company_name ?? contract.placement_company_name ?? ''}
                                    onChange={(e) => setEditData(prev => ({ ...prev, placement_company_name: e.target.value || null }))}
                                    className="w-full h-8 text-sm"
                                    placeholder="法人名を入力"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500 mb-1 block">園名</label>
                                  <Input
                                    type="text"
                                    value={editData.placement_facility_name ?? contract.placement_facility_name ?? ''}
                                    onChange={(e) => setEditData(prev => ({ ...prev, placement_facility_name: e.target.value || null }))}
                                    className="w-full h-8 text-sm"
                                    placeholder="園名を入力"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm">
                                {contract.placement_company_name && (
                                  <div className="font-medium">{contract.placement_company_name}</div>
                                )}
                                {contract.placement_facility_name && (
                                  <div className="text-gray-500">{contract.placement_facility_name}</div>
                                )}
                                {!contract.placement_company_name && !contract.placement_facility_name && (
                                  contract.placement_company || '-'
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {contract.is_cancelled ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200">
                                キャンセル済
                              </Badge>
                            ) : editingContractId === contract.id ? (
                              <div className="relative">
                                <Select
                                  value={editData.payment_date !== undefined 
                                    ? (editData.payment_date ? 'paid' : 'pending')
                                    : (contract.payment_date ? 'paid' : 'pending')
                                  }
                                  onValueChange={(value) => {
                                    if (value === 'paid') {
                                      // 入金済みに変更：入金日が未設定の場合は今日の日付を設定
                                      setEditData(prev => ({ 
                                        ...prev, 
                                        payment_date: prev.payment_date || contract.payment_date || new Date().toISOString().split('T')[0]
                                      }))
                                    } else {
                                      // 入金待ちに変更：入金日を削除
                                      setEditData(prev => ({ 
                                        ...prev, 
                                        payment_date: null
                                      }))
                                    }
                                  }}
                                >
                                  <SelectTrigger className="min-w-[120px] h-8 border border-slate-200 bg-white rounded-md shadow-sm hover:bg-slate-50 px-3 text-sm">
                                    <SelectValue asChild>
                                      <span className="flex items-center gap-1.5">
                                        {editData.payment_date !== undefined 
                                          ? (editData.payment_date ? (
                                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                              入金済み
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                                              入金待ち
                                            </Badge>
                                          ))
                                          : (contract.payment_date ? (
                                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                              入金済み
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                                              入金待ち
                                            </Badge>
                                          ))
                                        }
                                      </span>
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="paid">
                                      <div className="flex items-center gap-2">
                                        <Badge className="bg-green-100 text-green-700 border-green-200">
                                          入金済み
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="pending">
                                      <div className="flex items-center gap-2">
                                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                                          入金待ち
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            ) : contract.payment_date ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                入金済み
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                                入金待ち
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingContractId === contract.id ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSaveEdit(contract.id)}
                                  className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(contract)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartCancel(contract)}
                              className={`h-7 w-7 p-0 ${
                                contract.is_cancelled
                                  ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                  : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                              }`}
                              title="キャンセル対応"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* キャンセルリスト */}
        {cancelledContracts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">キャンセルリスト</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>氏名</TableHead>
                      <TableHead>担当</TableHead>
                      <TableHead>返金あり/なし</TableHead>
                      <TableHead>返金率</TableHead>
                      <TableHead>返金日</TableHead>
                      <TableHead className="text-right">返金額</TableHead>
                      <TableHead>退職日</TableHead>
                      <TableHead>入職先</TableHead>
                      <TableHead>備考（理由）</TableHead>
                      <TableHead className="w-20">編集</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cancelledContracts.map((contract) => {
                      // API経由で取得したデータからcandidateの情報を取得
                      const candidateData = (contract as { candidate?: { name?: string; consultant_id?: string } }).candidate
                      const consultantId = candidateData?.consultant_id
                      const consultant = users.find((u) => u.id === consultantId)
                      const candidateName = candidateData?.name || '不明'

                      return (
                        <TableRow key={contract.id}>
                          <TableCell className="font-medium">
                            <Link 
                              href={`/candidates/${contract.candidate_id}`}
                              className="text-slate-800 hover:text-indigo-600 hover:underline"
                            >
                              {candidateName}
                            </Link>
                          </TableCell>
                          <TableCell>{consultant?.name || '-'}</TableCell>
                          <TableCell>
                            {contract.refund_required ? (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                                返金あり
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                                返金なし
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {contract.refund_rate != null ? `${contract.refund_rate}%` : '-'}
                          </TableCell>
                          <TableCell>
                            {contract.refund_date ? formatDate(contract.refund_date) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {contract.refund_amount ? formatCurrency(contract.refund_amount) : '-'}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {formatDate(contract.resignation_date)}
                          </TableCell>
                          <TableCell className="max-w-[180px]">
                            <div className="text-sm">
                              {contract.placement_company_name && (
                                <div className="font-medium truncate">{contract.placement_company_name}</div>
                              )}
                              {contract.placement_facility_name && (
                                <div className="text-gray-500 truncate">{contract.placement_facility_name}</div>
                              )}
                              {!contract.placement_company_name && !contract.placement_facility_name && (
                                <span className="text-gray-400">{contract.placement_company || '-'}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <div className="text-sm text-gray-700 truncate" title={contract.cancellation_reason || ''}>
                              {contract.cancellation_reason || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEditCancel(contract)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-violet-600 hover:bg-violet-50"
                              title="返金情報を編集"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* キャンセル確定ダイアログ */}
        <Dialog open={cancellingContractId !== null} onOpenChange={(open) => !open && handleCancelCancel()}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>入社キャンセル確定</DialogTitle>
              <DialogDescription>
                この成約をキャンセルにしますか？返金の有無・返金日・返金率を入力できます。売上合計は成約一覧に残ります。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">返金の有無</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="refund_required_dialog"
                      checked={!cancelFormData.refund_required}
                      onChange={() =>
                        setCancelFormData((prev) => ({
                          ...prev,
                          refund_required: false,
                          refund_rate: null,
                        }))
                      }
                      className="w-4 h-4 border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm">返金なし</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="refund_required_dialog"
                      checked={cancelFormData.refund_required}
                      onChange={() =>
                        setCancelFormData((prev) => ({
                          ...prev,
                          refund_required: true,
                        }))
                      }
                      className="w-4 h-4 border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm">返金あり</span>
                  </label>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cancel_refund_date_initial">返金日</Label>
                  <Input
                    id="cancel_refund_date_initial"
                    type="date"
                    value={cancelFormData.refund_date || ''}
                    onChange={(e) =>
                      setCancelFormData((prev) => ({
                        ...prev,
                        refund_date: e.target.value || null,
                      }))
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">分からなければ空のままで確定し、あとからキャンセルリストで編集できます</p>
                </div>
                {cancelFormData.refund_required && (
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="refund_rate_cancel">返金率</Label>
                    <Select
                      value={cancelFormData.refund_rate != null ? String(cancelFormData.refund_rate) : 'none'}
                      onValueChange={(v) =>
                        setCancelFormData((prev) => ({
                          ...prev,
                          refund_rate: v === 'none' ? null : Number(v),
                        }))
                      }
                    >
                      <SelectTrigger id="refund_rate_cancel" className="w-full">
                        <SelectValue placeholder="選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">未選択</SelectItem>
                        {REFUND_RATE_OPTIONS.map((r) => (
                          <SelectItem key={r} value={String(r)}>
                            {r}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  返金額・退職日・備考はキャンセルリストから後から入力できます
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelCancel}>
                キャンセル
              </Button>
              <Button 
                onClick={() => cancellingContractId && handleSaveCancel(cancellingContractId)}
                className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
              >
                確定
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* キャンセルリスト編集ダイアログ */}
        <Dialog open={editingCancelId !== null} onOpenChange={(open) => !open && handleCancelEditCancel()}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>返金情報の編集</DialogTitle>
              <DialogDescription>
                返金日・返金額・返金率・退職日・備考を入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cancel_refund_rate">返金率</Label>
                <Select
                  value={cancelEditData.refund_rate != null ? String(cancelEditData.refund_rate) : 'none'}
                  onValueChange={(v) =>
                    setCancelEditData((prev) => ({
                      ...prev,
                      refund_rate: v === 'none' ? null : Number(v),
                    }))
                  }
                >
                  <SelectTrigger id="cancel_refund_rate">
                    <SelectValue placeholder="選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未選択</SelectItem>
                    {REFUND_RATE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancel_refund_date">返金日</Label>
                <Input
                  id="cancel_refund_date"
                  type="date"
                  value={cancelEditData.refund_date || ''}
                  onChange={(e) => setCancelEditData(prev => ({ ...prev, refund_date: e.target.value || null }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancel_refund_amount">返金額</Label>
                <Input
                  id="cancel_refund_amount"
                  type="number"
                  value={cancelEditData.refund_amount ?? ''}
                  onChange={(e) => setCancelEditData(prev => ({ ...prev, refund_amount: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="金額を入力"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancel_resignation_date">退職日</Label>
                <Input
                  id="cancel_resignation_date"
                  type="date"
                  value={cancelEditData.resignation_date || ''}
                  onChange={(e) => setCancelEditData(prev => ({ ...prev, resignation_date: e.target.value || null }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancel_cancellation_reason">備考（理由）</Label>
                <Textarea
                  id="cancel_cancellation_reason"
                  value={cancelEditData.cancellation_reason || ''}
                  onChange={(e) => setCancelEditData(prev => ({ ...prev, cancellation_reason: e.target.value || null }))}
                  placeholder="キャンセル理由を入力（任意）"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelEditCancel}>
                キャンセル
              </Button>
              <Button 
                onClick={() => editingCancelId && handleSaveEditCancel(editingCancelId)}
                className="bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white"
              >
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AppLayout>
  )
}

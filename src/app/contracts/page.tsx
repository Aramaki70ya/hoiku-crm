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

// 年月の選択肢を生成
function generateMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`
    options.push({ value, label })
  }
  return options
}

export default function ContractsPage() {
  // 現在の年月をデフォルトに設定
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedConsultant, setSelectedConsultant] = useState<string>('all')
  
  // API経由でデータを取得
  const { contracts: apiContracts, isLoading, updateContract } = useContracts({
    month: selectedMonth,
    consultantId: selectedConsultant,
  })
  const { users, consultants: consultantUsers } = useUsers()
  
  // ローカル状態で編集中のデータを管理
  const [localContracts, setLocalContracts] = useState<Contract[]>([])
  
  // APIから取得したデータをローカル状態にマージ
  const contracts = useMemo(() => {
    const contractMap = new Map<string, Contract>()
    apiContracts.forEach(c => contractMap.set(c.id, c))
    localContracts.forEach(c => contractMap.set(c.id, c))
    return Array.from(contractMap.values())
  }, [apiContracts, localContracts])
  const [editingContractId, setEditingContractId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Contract>>({})
  const [cancellingContractId, setCancellingContractId] = useState<string | null>(null)
  const [cancelFormData, setCancelFormData] = useState<{
    refund_required: boolean
  }>({
    refund_required: false,
  })
  const [editingCancelId, setEditingCancelId] = useState<string | null>(null)
  const [cancelEditData, setCancelEditData] = useState<{
    refund_date: string | null
    refund_amount: number | null
    cancellation_reason: string | null
  }>({
    refund_date: null,
    refund_amount: null,
    cancellation_reason: null,
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
    // API経由で更新
    await updateContract(contractId, editData)
    
    // ローカル状態も更新
    setLocalContracts(prev => {
      const existing = prev.find(c => c.id === contractId)
      if (existing) {
        return prev.map(c => 
          c.id === contractId 
            ? { ...c, ...editData, updated_at: new Date().toISOString() }
            : c
        )
      }
      const apiContract = apiContracts.find(c => c.id === contractId)
      if (apiContract) {
        return [...prev, { ...apiContract, ...editData, updated_at: new Date().toISOString() }]
      }
      return prev
    })
    
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
    })
  }

  const handleSaveCancel = async (contractId: string) => {
    // API経由で更新
    await updateContract(contractId, {
      is_cancelled: true,
      refund_required: cancelFormData.refund_required,
    })
    
    // ローカル状態も更新
    setLocalContracts(prev => {
      const existing = prev.find(c => c.id === contractId)
      if (existing) {
        return prev.map(c => 
          c.id === contractId 
            ? { 
                ...c, 
                is_cancelled: true,
                refund_required: cancelFormData.refund_required,
                updated_at: new Date().toISOString() 
              }
            : c
        )
      }
      const apiContract = apiContracts.find(c => c.id === contractId)
      if (apiContract) {
        return [...prev, { 
          ...apiContract, 
          is_cancelled: true,
          refund_required: cancelFormData.refund_required,
          updated_at: new Date().toISOString() 
        }]
      }
      return prev
    })
    
    setCancellingContractId(null)
    setCancelFormData({
      refund_required: false,
    })
  }

  const handleCancelCancel = () => {
    setCancellingContractId(null)
    setCancelFormData({
      refund_required: false,
    })
  }

  const handleStartEditCancel = (contract: Contract) => {
    setEditingCancelId(contract.id)
    setCancelEditData({
      refund_date: contract.refund_date || null,
      refund_amount: contract.refund_amount || null,
      cancellation_reason: contract.cancellation_reason || null,
    })
  }

  const handleSaveEditCancel = async (contractId: string) => {
    // API経由で更新
    await updateContract(contractId, {
      refund_date: cancelEditData.refund_date,
      refund_amount: cancelEditData.refund_amount,
      cancellation_reason: cancelEditData.cancellation_reason,
    })
    
    // ローカル状態も更新
    setLocalContracts(prev => {
      const existing = prev.find(c => c.id === contractId)
      if (existing) {
        return prev.map(c => 
          c.id === contractId 
            ? { 
                ...c, 
                refund_date: cancelEditData.refund_date,
                refund_amount: cancelEditData.refund_amount,
                cancellation_reason: cancelEditData.cancellation_reason,
                updated_at: new Date().toISOString() 
              }
            : c
        )
      }
      const apiContract = apiContracts.find(c => c.id === contractId)
      if (apiContract) {
        return [...prev, { 
          ...apiContract, 
          refund_date: cancelEditData.refund_date,
          refund_amount: cancelEditData.refund_amount,
          cancellation_reason: cancelEditData.cancellation_reason,
          updated_at: new Date().toISOString() 
        }]
      }
      return prev
    })
    
    setEditingCancelId(null)
    setCancelEditData({
      refund_date: null,
      refund_amount: null,
      cancellation_reason: null,
    })
  }

  const handleCancelEditCancel = () => {
    setEditingCancelId(null)
    setCancelEditData({
      refund_date: null,
      refund_amount: null,
      cancellation_reason: null,
    })
  }

  // 選択した月の成約データをフィルター（キャンセル済みを除く）
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      // キャンセル済みは除外
      return !contract.is_cancelled
    })
  }, [contracts])

  // キャンセル済みの成約データをフィルター
  const cancelledContracts = useMemo(() => {
    return contracts.filter((contract) => {
      // キャンセル済みのみ
      return contract.is_cancelled
    })
  }, [contracts])

  // サマリー計算
  const summary = useMemo(() => {
    const totalRevenue = filteredContracts.reduce(
      (sum, c) => sum + c.revenue_excluding_tax,
      0
    )
    const totalRevenueTax = filteredContracts.reduce(
      (sum, c) => sum + c.revenue_including_tax,
      0
    )
    const paidCount = filteredContracts.filter((c) => c.payment_date).length
    const pendingCount = filteredContracts.filter((c) => !c.payment_date).length

    return {
      count: filteredContracts.length,
      totalRevenue,
      totalRevenueTax,
      paidCount,
      pendingCount,
    }
  }, [filteredContracts])


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

          <div className="flex items-center gap-3">
            {/* 月選択 */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 担当者フィルター */}
            <Select
              value={selectedConsultant}
              onValueChange={setSelectedConsultant}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="担当者" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全員</SelectItem>
                {consultantUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  {filteredContracts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={12}
                        className="text-center py-8 text-gray-500"
                      >
                        該当する成約データがありません
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredContracts.map((contract) => {
                      // API経由で取得したデータからcandidateの情報を取得
                      const candidateData = (contract as { candidate?: { name?: string; consultant_id?: string; source?: { name?: string } } }).candidate
                      const consultantId = candidateData?.consultant_id
                      const consultant = users.find((u) => u.id === consultantId)
                      const candidateName = candidateData?.name || '不明'
                      const source = candidateData?.source?.name || '-'

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
                            {contract.invoice_sent_date ? (
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
                                キャンセル済み
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
                                  <SelectTrigger className="w-auto h-auto border-0 bg-transparent hover:bg-transparent p-0 [&>svg]:hidden">
                                    <SelectValue asChild>
                                      <div>
                                        {editData.payment_date !== undefined 
                                          ? (editData.payment_date ? (
                                            <Badge className="bg-green-100 text-green-700 border-green-200 cursor-pointer">
                                              入金済み
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 cursor-pointer">
                                              入金待ち
                                            </Badge>
                                          ))
                                          : (contract.payment_date ? (
                                            <Badge className="bg-green-100 text-green-700 border-green-200 cursor-pointer">
                                              入金済み
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 cursor-pointer">
                                              入金待ち
                                            </Badge>
                                          ))
                                        }
                                      </div>
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
                      <TableHead>返金日</TableHead>
                      <TableHead className="text-right">返金額</TableHead>
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
                          <TableCell>
                            {contract.refund_date ? formatDate(contract.refund_date) : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {contract.refund_amount ? formatCurrency(contract.refund_amount) : '-'}
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
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>入社キャンセル確定</DialogTitle>
              <DialogDescription>
                この成約をキャンセルにしますか？返金の有無を選択してください。
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="refund_required"
                    checked={cancelFormData.refund_required}
                    onChange={(e) => {
                      setCancelFormData(prev => ({
                        ...prev,
                        refund_required: e.target.checked,
                      }))
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                  />
                  <Label htmlFor="refund_required" className="cursor-pointer">
                    返金あり
                  </Label>
                </div>
                <p className="text-xs text-gray-500">
                  返金日や返金額は後からキャンセルリストで入力できます
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
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>返金情報の編集</DialogTitle>
              <DialogDescription>
                返金日、返金額、備考を入力してください
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                  value={cancelEditData.refund_amount || ''}
                  onChange={(e) => setCancelEditData(prev => ({ ...prev, refund_amount: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="金額を入力"
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

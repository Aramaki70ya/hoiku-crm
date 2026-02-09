'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Settings, Save, Target, DollarSign, Users } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useUsers } from '@/hooks/useUsers'
import type { UserMonthlyTarget } from '@/types/database'

interface MonthlyTarget {
  total_sales_budget: number
  registration_to_first_contact_rate: number
  first_contact_to_interview_rate: number
  interview_to_closed_rate: number
  closed_unit_price: number
  interview_target: number
}

interface MemberTarget {
  user_id: string
  user_name: string
  sales_budget: number
  interview_target: number
  contract_target: number
}

export default function SettingsPage() {
  // 現在の年月を取得
  const getCurrentYearMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentYearMonth())
  const [monthlyTarget, setMonthlyTarget] = useState<MonthlyTarget>({
    total_sales_budget: 29000000,
    registration_to_first_contact_rate: 0.65,
    first_contact_to_interview_rate: 0.80,
    interview_to_closed_rate: 0.60,
    closed_unit_price: 600000,
    interview_target: 8,
  })
  const [memberTargets, setMemberTargets] = useState<MemberTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // ユーザー一覧を取得（コンサルタントのみ）
  const { consultants } = useUsers()
  // consultantsは毎回新しい配列参照になるため、IDの文字列で安定した依存に
  const consultantIds = consultants.map(c => c.id).sort().join(',')

  // 月リストを生成（過去6ヶ月〜未来3ヶ月）
  const generateMonthOptions = () => {
    const options: { value: string; label: string }[] = []
    const now = new Date()
    for (let i = -6; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = `${d.getFullYear()}年${d.getMonth() + 1}月`
      options.push({ value, label })
    }
    return options
  }

  const monthOptions = generateMonthOptions()

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function fetchData() {
      try {
        setLoading(true)
        setFetchError(null)

        // 全体目標取得
        const targetsRes = await fetch(`/api/targets?year_month=${selectedMonth}`, { signal })
        if (signal.aborted) return
        if (targetsRes.ok) {
          const { data } = await targetsRes.json()
          if (data) {
            setMonthlyTarget({
              total_sales_budget: data.total_sales_budget || 29000000,
              registration_to_first_contact_rate: Number(data.registration_to_first_contact_rate) || 0.65,
              first_contact_to_interview_rate: Number(data.first_contact_to_interview_rate) || 0.80,
              interview_to_closed_rate: Number(data.interview_to_closed_rate) || 0.60,
              closed_unit_price: data.closed_unit_price || 600000,
              interview_target: data.interview_target || 8,
            })
          }
        }

        // メンバー別目標取得
        const userTargetsRes = await fetch(`/api/user-targets?year_month=${selectedMonth}`, { signal })
        if (signal.aborted) return
        if (userTargetsRes.ok) {
          const { data } = await userTargetsRes.json()
          // コンサルタント一覧とマージ
          const targets: MemberTarget[] = consultants.map(consultant => {
            const existing = data?.find((t: UserMonthlyTarget) => t.user_id === consultant.id)
            return {
              user_id: consultant.id,
              user_name: consultant.name,
              sales_budget: existing?.sales_budget || 0,
              interview_target: existing?.interview_target || 0,
              contract_target: existing?.contract_target || 0,
            }
          })
          setMemberTargets(targets)
        }
      } catch (error) {
        if (signal.aborted) return
        const message = error instanceof Error ? error.message : 'データの取得に失敗しました'
        console.error('Error fetching data:', error)
        setFetchError(
          message === 'Failed to fetch'
            ? 'APIに接続できません。開発サーバーが起動しているか確認してください。'
            : message
        )
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    }
    fetchData()
    return () => controller.abort()
  }, [selectedMonth, consultantIds])

  const handleSave = async () => {
    setSaving(true)
    
    try {
      // 全体目標を保存
      await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year_month: selectedMonth,
          total_sales_budget: monthlyTarget.total_sales_budget,
          registration_to_first_contact_rate: monthlyTarget.registration_to_first_contact_rate,
          first_contact_to_interview_rate: monthlyTarget.first_contact_to_interview_rate,
          interview_to_closed_rate: monthlyTarget.interview_to_closed_rate,
          closed_unit_price: monthlyTarget.closed_unit_price,
          interview_target: monthlyTarget.interview_target,
        }),
      })

      // メンバー別目標を一括保存
      for (const target of memberTargets) {
        await fetch('/api/user-targets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year_month: selectedMonth,
            user_id: target.user_id,
            sales_budget: target.sales_budget,
            interview_target: target.interview_target,
            contract_target: target.contract_target,
          }),
        })
      }

      alert('保存しました')
    } catch (error) {
      console.error('Error saving:', error)
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const updateMemberTarget = (userId: string, field: keyof MemberTarget, value: number) => {
    setMemberTargets(prev =>
      prev.map(t => t.user_id === userId ? { ...t, [field]: value } : t)
    )
  }

  if (loading && !fetchError) {
    return (
      <AppLayout title="設定" description="目標設定">
        <div className="flex items-center justify-center h-64">
          <p>読み込み中...</p>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="設定" description="目標設定">
      <div className="space-y-6">
        {fetchError && (
          <div className="p-4 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
            {fetchError}
          </div>
        )}
        {/* 月選択 */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-violet-500" />
              対象月選択
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Label className="text-sm font-medium text-slate-700 whitespace-nowrap">
                設定対象月
              </Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 全体目標設定 */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-500" />
              全体目標設定（{selectedMonth}）
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 全体予算 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-violet-500" />
                全体売上予算
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-slate-600">¥</span>
                <Input
                  type="number"
                  value={monthlyTarget.total_sales_budget / 10000}
                  onChange={(e) => setMonthlyTarget(prev => ({
                    ...prev,
                    total_sales_budget: Number(e.target.value) * 10000
                  }))}
                  className="w-32"
                />
                <span className="text-slate-600">万</span>
              </div>
            </div>

            {/* KPI目標 */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-slate-700">KPI目標</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">登録→初回率</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={monthlyTarget.registration_to_first_contact_rate * 100}
                      onChange={(e) => setMonthlyTarget(prev => ({
                        ...prev,
                        registration_to_first_contact_rate: Number(e.target.value) / 100
                      }))}
                      className="w-24"
                    />
                    <span className="text-slate-600">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">初回→面接率</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={monthlyTarget.first_contact_to_interview_rate * 100}
                      onChange={(e) => setMonthlyTarget(prev => ({
                        ...prev,
                        first_contact_to_interview_rate: Number(e.target.value) / 100
                      }))}
                      className="w-24"
                    />
                    <span className="text-slate-600">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">面接→成約率</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      value={monthlyTarget.interview_to_closed_rate * 100}
                      onChange={(e) => setMonthlyTarget(prev => ({
                        ...prev,
                        interview_to_closed_rate: Number(e.target.value) / 100
                      }))}
                      className="w-24"
                    />
                    <span className="text-slate-600">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">成約単価</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">¥</span>
                    <Input
                      type="number"
                      value={monthlyTarget.closed_unit_price / 10000}
                      onChange={(e) => setMonthlyTarget(prev => ({
                        ...prev,
                        closed_unit_price: Number(e.target.value) * 10000
                      }))}
                      className="w-24"
                    />
                    <span className="text-slate-600">万</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* メンバー別目標設定 */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-500" />
              メンバー別目標設定（{selectedMonth}）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-100 bg-slate-50">
                    <TableHead className="text-slate-600 font-semibold">メンバー名</TableHead>
                    <TableHead className="text-slate-600 font-semibold">売上予算</TableHead>
                    <TableHead className="text-slate-600 font-semibold">面接設定目標</TableHead>
                    <TableHead className="text-slate-600 font-semibold">成約件数目標</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {memberTargets.map(target => (
                    <TableRow key={target.user_id} className="border-slate-100 hover:bg-violet-50/30">
                      <TableCell className="font-medium text-slate-800">
                        {target.user_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600 text-sm">¥</span>
                          <Input
                            type="number"
                            value={target.sales_budget / 10000}
                            onChange={(e) => updateMemberTarget(target.user_id, 'sales_budget', Number(e.target.value) * 10000)}
                            className="w-24 h-8"
                          />
                          <span className="text-slate-600 text-sm">万</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={target.interview_target}
                            onChange={(e) => updateMemberTarget(target.user_id, 'interview_target', Number(e.target.value))}
                            className="w-20 h-8"
                          />
                          <span className="text-slate-600 text-sm">件</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={target.contract_target}
                            onChange={(e) => updateMemberTarget(target.user_id, 'contract_target', Number(e.target.value))}
                            className="w-20 h-8"
                          />
                          <span className="text-slate-600 text-sm">件</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? '保存中...' : 'すべて保存'}
          </Button>
        </div>
      </div>
    </AppLayout>
  )
}

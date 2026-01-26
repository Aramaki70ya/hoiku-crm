'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Settings, Save, Target, DollarSign } from 'lucide-react'
import { Label } from '@/components/ui/label'

interface MonthlyTarget {
  total_sales_budget: number
  registration_to_first_contact_rate: number
  first_contact_to_interview_rate: number
  interview_to_closed_rate: number
  closed_unit_price: number
  interview_target: number
}

export default function SettingsPage() {
  const [monthlyTarget, setMonthlyTarget] = useState<MonthlyTarget>({
    total_sales_budget: 29000000,
    registration_to_first_contact_rate: 0.65,
    first_contact_to_interview_rate: 0.80,
    interview_to_closed_rate: 0.60,
    closed_unit_price: 600000,
    interview_target: 8,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 現在の年月を取得
  const getCurrentYearMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const yearMonth = getCurrentYearMonth()
        
        // 全体目標取得
        const targetsRes = await fetch(`/api/targets?year_month=${yearMonth}`)
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
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const yearMonth = getCurrentYearMonth()
    
    try {
      // 全体目標を保存
      await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year_month: yearMonth,
          total_sales_budget: monthlyTarget.total_sales_budget,
          registration_to_first_contact_rate: monthlyTarget.registration_to_first_contact_rate,
          first_contact_to_interview_rate: monthlyTarget.first_contact_to_interview_rate,
          interview_to_closed_rate: monthlyTarget.interview_to_closed_rate,
          closed_unit_price: monthlyTarget.closed_unit_price,
          interview_target: monthlyTarget.interview_target,
        }),
      })
      alert('保存しました')
    } catch (error) {
      console.error('Error saving:', error)
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }


  if (loading) {
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
        {/* 全体目標設定 */}
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-500" />
              全体目標設定（{getCurrentYearMonth()}）
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
                <div className="space-y-2">
                  <Label className="text-xs text-slate-500">面接設定目標</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={monthlyTarget.interview_target}
                      onChange={(e) => setMonthlyTarget(prev => ({
                        ...prev,
                        interview_target: Number(e.target.value)
                      }))}
                      className="w-24"
                    />
                    <span className="text-slate-600">件</span>
                  </div>
                </div>
              </div>
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

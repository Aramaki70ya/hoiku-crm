'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { FileText, User, ChevronRight, Loader2 } from 'lucide-react'
import { statusColors } from '@/lib/status-mapping'
import { useUsers } from '@/hooks/useUsers'
import type { CandidateStatus } from '@/types/database'

interface MemoEvent {
  id: string
  candidate_id: string
  title: string
  description: string | null
  created_at: string
  created_by_user?: { id: string; name: string } | null
}

interface DailyReportItem {
  candidate: {
    id: string
    name: string
    kana: string | null
    status: CandidateStatus
    consultant_id: string | null
    desired_job_type: string | null
    memo: string | null
    consultant?: { id: string; name: string } | null
  }
  memos: MemoEvent[]
}

interface DailyReportResponse {
  data: DailyReportItem[]
  targetDate: string | null
  message?: string
}

function DailyReportContent() {
  const [report, setReport] = useState<DailyReportResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { users } = useUsers()

  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/daily-report')
        const json = await res.json()
        if (!res.ok) {
          setError(json.error || 'データの取得に失敗しました')
          setReport(null)
          return
        }
        setReport(json)
      } catch (err) {
        setError('通信エラーが発生しました')
        setReport(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchReport()
  }, [])

  const items = report?.data ?? []
  const memberCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    items.forEach((item) => {
      const id = item.candidate.consultant_id ?? 'unassigned'
      counts[id] = (counts[id] ?? 0) + 1
    })
    return counts
  }, [items])

  const membersWithItems = useMemo(
    () => users.filter((u) => (memberCounts[u.id] ?? 0) > 0),
    [users, memberCounts]
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const targetDate = report?.targetDate
    ? new Date(report.targetDate + 'T12:00:00').toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      })
    : null

  const renderTable = (displayItems: typeof items) => (
    <>
      {displayItems.length === 0 ? (
        <p className="text-slate-500 py-8 text-center">
          該当する求職者はいません
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>求職者</TableHead>
              <TableHead>担当者</TableHead>
              <TableHead>職種</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>メモ内容</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayItems.map(({ candidate, memos }) => (
                  <TableRow key={candidate.id}>
                    <TableCell>
                      <Link
                        href={`/candidates/${candidate.id}`}
                        className="flex items-center gap-2 font-medium text-violet-600 hover:text-violet-800 hover:underline"
                      >
                        <User className="w-4 h-4" />
                        {candidate.name}
                        {candidate.kana && (
                          <span className="text-slate-500 text-sm font-normal">
                            ({candidate.kana})
                          </span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-700">
                        {candidate.consultant?.name ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-700">
                        {candidate.desired_job_type ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          statusColors[candidate.status as CandidateStatus] ??
                          'bg-slate-100 text-slate-700 border-slate-200'
                        }
                      >
                        {candidate.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-md max-h-12 overflow-hidden hover:max-h-40 hover:overflow-y-auto transition-all duration-200 space-y-1">
                        {memos.map((m) => (
                          <p
                            key={m.id}
                            className="text-sm text-slate-700 whitespace-pre-wrap"
                          >
                            {m.description ?? m.title}
                          </p>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/candidates/${candidate.id}`}
                        className="text-slate-400 hover:text-violet-600"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </TableCell>
                  </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )

  return (
    <div className="space-y-6">
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            前営業日のメモ一覧
          </CardTitle>
          {targetDate && (
            <p className="text-sm text-slate-600 mt-1">
              対象日: {targetDate} にメモを追加した求職者のみ表示しています
            </p>
          )}
          {report?.message && (
            <p className="text-sm text-amber-600 mt-1">{report.message}</p>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="bg-white border border-slate-200 shadow-sm">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                すべて ({items.length})
              </TabsTrigger>
              {membersWithItems.map((user) => (
                <TabsTrigger
                  key={user.id}
                  value={user.id}
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                >
                  {user.name} ({memberCounts[user.id]})
                </TabsTrigger>
              ))}
              {memberCounts['unassigned'] ? (
                <TabsTrigger
                  value="unassigned"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                >
                  未割当 ({memberCounts['unassigned']})
                </TabsTrigger>
              ) : null}
            </TabsList>

            <TabsContent value="all">{renderTable(items)}</TabsContent>
            {membersWithItems.map((user) => (
              <TabsContent key={user.id} value={user.id}>
                {renderTable(
                  items.filter((item) => item.candidate.consultant_id === user.id)
                )}
              </TabsContent>
            ))}
            {memberCounts['unassigned'] ? (
              <TabsContent value="unassigned">
                {renderTable(
                  items.filter((item) => !item.candidate.consultant_id)
                )}
              </TabsContent>
            ) : null}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DailyReportPage() {
  return (
    <AppLayout title="日報">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        }
      >
        <DailyReportContent />
      </Suspense>
    </AppLayout>
  )
}

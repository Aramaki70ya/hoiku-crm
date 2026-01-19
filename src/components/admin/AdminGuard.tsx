'use client'

import { useAuth } from '@/hooks/useAuth'
import { mockUsers } from '@/lib/mock-data'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface AdminGuardProps {
  children: React.ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500">読み込み中...</div>
      </div>
    )
  }

  // モックデータからユーザーのroleを取得
  const userData = user ? mockUsers.find(u => u.email === user.email) : null
  const isAdmin = userData?.role === 'admin'

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="bg-white border-slate-200 shadow-sm max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="w-12 h-12 text-slate-400" />
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-2">ログインが必要です</h2>
                <p className="text-slate-500">このページにアクセスするにはログインしてください。</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="bg-white border-slate-200 shadow-sm max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="w-12 h-12 text-rose-400" />
              <div>
                <h2 className="text-lg font-semibold text-slate-800 mb-2">アクセス権限がありません</h2>
                <p className="text-slate-500">このページにアクセスするには管理者権限が必要です。</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}


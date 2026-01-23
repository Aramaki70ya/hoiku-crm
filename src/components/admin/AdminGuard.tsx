'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { User } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface AdminGuardProps {
  children: React.ReactNode
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuth()
  const [appUser, setAppUser] = useState<User | null>(null)
  const [isFetchingRole, setIsFetchingRole] = useState(true)

  useEffect(() => {
    const fetchMe = async () => {
      try {
        setIsFetchingRole(true)
        const response = await fetch('/api/auth/me')
        if (!response.ok) {
          setAppUser(null)
          return
        }
        const data = await response.json()
        setAppUser(data.user ?? null)
      } catch {
        setAppUser(null)
      } finally {
        setIsFetchingRole(false)
      }
    }

    if (!loading) {
      fetchMe()
    }
  }, [loading, user])

  if (loading || isFetchingRole) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500">読み込み中...</div>
      </div>
    )
  }

  const isAdmin = appUser?.role === 'admin'

  if (!user && !appUser) {
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


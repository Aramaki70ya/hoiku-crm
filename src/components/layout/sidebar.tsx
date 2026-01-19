'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  Settings,
  LogOut,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Menu,
  BarChart3,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { mockUsers } from '@/lib/mock-data'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navigation = [
  { name: '全体サマリー', href: '/', icon: LayoutDashboard },
  { name: 'ダッシュボード', href: '/dashboard-summary', icon: BarChart3 },
  { name: '求職者管理', href: '/candidates', icon: Users },
  { name: '成約管理', href: '/contracts', icon: Trophy },
  { name: '面接一覧', href: '/interviews', icon: Calendar },
]

const bottomNavigation = [
  { name: '設定', href: '/settings', icon: Settings },
  { name: '管理画面', href: '/admin', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [isNavVisible, setIsNavVisible] = useState(true)

  return (
    <>
      <div className={cn(
        "flex h-screen flex-col bg-white border-r border-slate-200 shadow-sm relative transition-all duration-300",
        isNavVisible ? "w-64" : "w-0 overflow-hidden"
      )}>
        {/* ロゴ */}
        {isNavVisible && (
          <>
            <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-100">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Hoiku CRM
              </span>
            </div>

            {/* ナビゲーション表示/非表示トグルボタン */}
            <div className="px-3 py-2 border-b border-slate-100">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsNavVisible(false)}
                className="w-full justify-start text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <Menu className="w-4 h-4 mr-2" />
                <span className="text-sm">ナビゲーションを非表示</span>
                <ChevronLeft className="w-4 h-4 ml-auto" />
              </Button>
            </div>
          </>
        )}

      {/* メインナビゲーション */}
      {isNavVisible && (
        <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
        </nav>
      )}

      {/* 下部ナビゲーション */}
      {isNavVisible && (
        <div className="px-3 py-2">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href
          // 管理画面リンクは管理者のみ表示
          if (item.href === '/admin') {
            const userData = user ? mockUsers.find(u => u.email === user.email) : null
            const isAdmin = userData?.role === 'admin'
            if (!isAdmin) return null
          }
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
        </div>
      )}

      {isNavVisible && <Separator className="bg-slate-100" />}

      {/* ユーザー情報 */}
      {isNavVisible && (
        <div className="p-3">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
            <Avatar className="h-9 w-9 border-2 border-violet-200">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-violet-400 to-indigo-500 text-white">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-200"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      </div>

      {/* 非表示時の表示ボタン（サイドバーの外に配置） */}
      {!isNavVisible && (
        <div className="absolute left-0 top-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsNavVisible(true)}
            className="h-10 w-10 rounded-r-lg bg-white border border-slate-200 shadow-md hover:bg-slate-50 text-slate-600 hover:text-slate-900"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </>
  )
}

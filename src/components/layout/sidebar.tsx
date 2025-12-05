'use client'

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
  ClipboardList,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navigation = [
  { name: 'ダッシュボード', href: '/', icon: LayoutDashboard },
  { name: '今日のタスク', href: '/tasks', icon: ClipboardList },
  { name: '求職者管理', href: '/candidates', icon: Users },
  { name: 'メンバー', href: '/members', icon: UserCheck },
  { name: '面接一覧', href: '/interviews', icon: Calendar },
]

const bottomNavigation = [
  { name: '設定', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  return (
    <div className="flex h-screen w-64 flex-col bg-white border-r border-slate-200 shadow-sm">
      {/* ロゴ */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-100">
        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
          <Users className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
          Hoiku CRM
        </span>
      </div>

      {/* メインナビゲーション */}
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

      {/* 下部ナビゲーション */}
      <div className="px-3 py-2">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href
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

      <Separator className="bg-slate-100" />

      {/* ユーザー情報 */}
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
    </div>
  )
}

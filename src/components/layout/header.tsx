'use client'

import { useState } from 'react'
import { Bell, Search, AlertCircle, CheckCircle2, Clock, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface HeaderProps {
  title: string
  description?: string
}

// モック通知データ
const mockNotifications = [
  {
    id: '1',
    type: 'alert',
    title: '面接予定の確認が必要です',
    message: '樋口 佳菜子さんの面接が明日に迫っています',
    time: '2時間前',
    read: false,
  },
  {
    id: '2',
    type: 'info',
    title: '新規求職者登録',
    message: '新しい求職者が登録されました',
    time: '5時間前',
    read: false,
  },
  {
    id: '3',
    type: 'success',
    title: '成約確定',
    message: '吉 怜美さんの成約が確定しました',
    time: '1日前',
    read: false,
  },
]

export function Header({ title, description }: HeaderProps) {
  const [notifications, setNotifications] = useState(mockNotifications)
  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="w-4 h-4 text-amber-500" />
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      default:
        return <Clock className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* 検索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="検索..."
            className="w-64 pl-9 bg-slate-50 border-slate-200 text-slate-700 placeholder:text-slate-400 focus:border-violet-400 focus:ring-violet-400"
          />
        </div>

        {/* 通知 */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-rose-500 text-[10px] text-white">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">通知</h3>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-violet-600 hover:text-violet-700"
                  >
                    すべて既読にする
                  </Button>
                )}
              </div>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>通知はありません</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-violet-50/30' : ''
                      }`}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-slate-900' : 'text-slate-700'
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-2">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}

'use client'

import { Bell, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface HeaderProps {
  title: string
  description?: string
}

export function Header({ title, description }: HeaderProps) {
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
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-500 hover:text-slate-700 hover:bg-slate-100"
        >
          <Bell className="w-5 h-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-rose-500 text-[10px] text-white">
            3
          </Badge>
        </Button>
      </div>
    </header>
  )
}

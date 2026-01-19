'use client'

import { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Header } from './header'

interface AppLayoutProps {
  children: ReactNode
  title: string
  description?: string
}

export function AppLayout({ children, title, description }: AppLayoutProps) {
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/50 relative">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} description={description} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

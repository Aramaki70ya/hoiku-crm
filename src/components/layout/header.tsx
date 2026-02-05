'use client'

interface HeaderProps {
  title: string
  description?: string
}

/**
 * 共通ヘッダー。右上の検索窓・通知ボタンは使わない仕様（削除済み）。
 */
export function Header({ title, description }: HeaderProps) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
      </div>
      {/* 検索・通知はなし。右側は空で統一。data-app-rev で本番が最新デプロイか確認可能 */}
      <div className="w-0 flex-none" aria-hidden data-app-rev="20260205-no-search" />
    </header>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DebugAuthPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [envInfo, setEnvInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      
      // セッション情報を取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      setSessionInfo({
        hasSession: !!session,
        sessionUser: session?.user ? {
          id: session.user.id,
          email: session.user.email,
        } : null,
        hasUser: !!user,
        user: user ? {
          id: user.id,
          email: user.email,
        } : null,
        sessionError: sessionError?.message,
        userError: userError?.message,
      })

      // 環境変数の確認（クライアント側で確認できるもののみ）
      setEnvInfo({
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定',
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '設定済み' : '未設定',
        // 実際の値は表示しない（セキュリティのため）
        urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      })

      // クッキー情報
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        if (key.includes('supabase') || key.includes('auth')) {
          acc[key] = value ? `${value.substring(0, 20)}...` : '(empty)'
        }
        return acc
      }, {} as Record<string, string>)

      setSessionInfo((prev: any) => ({
        ...prev,
        cookies: Object.keys(cookies).length > 0 ? cookies : 'クッキーなし',
      }))

      setLoading(false)
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-slate-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">認証デバッグ情報</h1>

        <Card>
          <CardHeader>
            <CardTitle>環境変数</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <span>NEXT_PUBLIC_SUPABASE_URL:</span>
              <Badge variant={envInfo?.supabaseUrl === '設定済み' ? 'default' : 'destructive'}>
                {envInfo?.supabaseUrl}
              </Badge>
              {envInfo?.urlLength > 0 && (
                <span className="text-sm text-slate-500">({envInfo.urlLength}文字)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
              <Badge variant={envInfo?.supabaseAnonKey === '設定済み' ? 'default' : 'destructive'}>
                {envInfo?.supabaseAnonKey}
              </Badge>
              {envInfo?.keyLength > 0 && (
                <span className="text-sm text-slate-500">({envInfo.keyLength}文字)</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>セッション情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span>セッション状態:</span>
                <Badge variant={sessionInfo?.hasSession ? 'default' : 'destructive'}>
                  {sessionInfo?.hasSession ? 'あり' : 'なし'}
                </Badge>
              </div>
              {sessionInfo?.sessionUser && (
                <div className="ml-4 text-sm space-y-1">
                  <div>ID: {sessionInfo.sessionUser.id}</div>
                  <div>Email: {sessionInfo.sessionUser.email}</div>
                </div>
              )}
              {sessionInfo?.sessionError && (
                <div className="ml-4 text-sm text-red-500">
                  エラー: {sessionInfo.sessionError}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span>getUser()結果:</span>
                <Badge variant={sessionInfo?.hasUser ? 'default' : 'destructive'}>
                  {sessionInfo?.hasUser ? '成功' : '失敗'}
                </Badge>
              </div>
              {sessionInfo?.user && (
                <div className="ml-4 text-sm space-y-1">
                  <div>ID: {sessionInfo.user.id}</div>
                  <div>Email: {sessionInfo.user.email}</div>
                </div>
              )}
              {sessionInfo?.userError && (
                <div className="ml-4 text-sm text-red-500">
                  エラー: {sessionInfo.userError}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2">認証関連クッキー:</div>
              {typeof sessionInfo?.cookies === 'object' ? (
                <div className="ml-4 text-sm space-y-1">
                  {Object.entries(sessionInfo.cookies).map(([key, value]) => (
                    <div key={key}>
                      {key}: {value as string}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ml-4 text-sm text-slate-500">
                  {sessionInfo?.cookies}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API確認</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <button
                onClick={async () => {
                  const res = await fetch('/api/auth/me')
                  const data = await res.json()
                  console.log('API /api/auth/me レスポンス:', data)
                  console.log('API /api/auth/me 詳細:', JSON.stringify(data, null, 2))
                  alert(`ステータス: ${res.status}\n\nレスポンス:\n${JSON.stringify(data, null, 2)}`)
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
              >
                /api/auth/me をテスト
              </button>
              <button
                onClick={async () => {
                  const res = await fetch('/api/users')
                  const data = await res.json()
                  console.log('API /api/users レスポンス:', data)
                  console.log('API /api/users 詳細:', JSON.stringify(data, null, 2))
                  alert(`ステータス: ${res.status}\n\nレスポンス:\n${JSON.stringify(data, null, 2)}`)
                }}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                /api/users をテスト（ユーザー一覧）
              </button>
            </div>
            <div className="text-sm text-slate-600">
              <p>• <code>/api/auth/me</code>: 現在の認証状態とappUserを取得</p>
              <p>• <code>/api/users</code>: ユーザー一覧（認証必須）</p>
              <p className="mt-2 text-red-600">401エラーが出る場合、セッション切れか未ログインの可能性があります</p>
            </div>
          </CardContent>
        </Card>

        <div className="text-sm text-slate-500">
          <p>このページは開発用です。本番環境では削除してください。</p>
        </div>
      </div>
    </div>
  )
}

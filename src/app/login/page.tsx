'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getSupabaseUrl, getSupabaseAnonKey, hasSupabaseConfig } from '@/lib/supabase/config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Supabase に届くか先に確認（Failed to fetch の原因切り分け）
      const url = getSupabaseUrl()
      const key = getSupabaseAnonKey()
      if (hasSupabaseConfig() && url.includes('supabase.co') && !url.includes('demo.supabase.co')) {
        try {
          const healthRes = await fetch(`${url}/auth/v1/health`, {
            method: 'GET',
            headers: { apikey: key },
          })
          if (!healthRes.ok) {
            setError(
              `Supabaseに接続できましたがエラーです（${healthRes.status}）。プロジェクトが一時停止している可能性があります。ダッシュボードで「Restore project」を実行してください。`
            )
            return
          }
        } catch (healthErr) {
          setError(
            'SupabaseのURLに接続できません。.env.local の NEXT_PUBLIC_SUPABASE_URL が正しいか、Supabaseダッシュボードでプロジェクトが「Paused」でないか確認し、開発サーバーを再起動してください。'
          )
          return
        }
      }

      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message === 'Invalid login credentials') {
          setError('メールアドレスまたはパスワードが正しくありません')
        } else {
          setError(error.message)
        }
        return
      }

      // ログイン成功
      console.log('[DEBUG] ログイン成功 - セッション確認中...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('[DEBUG] セッション状態:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        error: sessionError?.message,
      })
      
      // getUser()でも確認
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('[DEBUG] getUser()結果:', {
        hasUser: !!user,
        userId: user?.id,
        email: user?.email,
        error: userError?.message,
      })
      
      // クッキーを確認
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      }, {} as Record<string, string>)
      const supabaseCookies = Object.keys(cookies).filter(k => k.includes('supabase') || k.includes('auth'))
      console.log('[DEBUG] 認証関連クッキー:', supabaseCookies)
      console.log('[DEBUG] 全クッキー:', Object.keys(cookies))
      
      // 環境変数の確認（クライアント側で確認できるもののみ）
      console.log('[DEBUG] 環境変数:', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
        keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      })
      
      // セッションがない場合はエラー
      if (!session && !user) {
        console.error('[DEBUG] 警告: ログイン成功したがセッションが取得できません')
        setError('ログインに成功しましたが、セッションの確認に失敗しました。デバッグページ(/debug-auth)で確認してください。')
        return
      }
      
      // 少し待ってからリダイレクト（クッキーが確実に設定されるまで）
      await new Promise(resolve => setTimeout(resolve, 100))
      
      router.push('/')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ログインに失敗しました'
      if (message.includes('Failed to fetch') || message.includes('fetch')) {
        setError(
          'Supabaseに接続できません。.env.local の設定、Supabaseプロジェクトの稼働、開発サーバーの再起動を確認してください。詳しくは /debug-auth の「Supabase接続テスト」を実行してください。'
        )
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 via-indigo-50 to-cyan-100">
      <Card className="w-full max-w-md mx-4 border-slate-200 bg-white/80 backdrop-blur shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Users className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Hoiku CRM
          </CardTitle>
          <CardDescription className="text-slate-500">
            保育事業部 採用管理システム
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            {error && (
              <div className="text-sm text-red-500 text-center bg-red-50 p-2 rounded space-y-2">
                <p>{error}</p>
                {error.includes('Supabaseに接続できません') && (
                  <Link
                    href="/debug-auth"
                    className="text-violet-600 hover:underline block"
                  >
                    → 接続診断ページで確認
                  </Link>
                )}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ログイン中...
                </>
              ) : (
                'ログイン'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

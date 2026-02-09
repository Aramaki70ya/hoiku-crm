'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, Loader2 } from 'lucide-react'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setChecking(false)
      if (!user) {
        router.replace('/login?error=session_expired')
      }
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 6) {
      setError('パスワードは6文字以上にしてください')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
      router.push('/')
      router.refresh()
    } catch {
      setError('パスワードの更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 via-indigo-50 to-cyan-100">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 via-indigo-50 to-cyan-100">
      <Card className="w-full max-w-md mx-4 border-slate-200 bg-white/80 backdrop-blur shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <KeyRound className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            新しいパスワードを設定
          </CardTitle>
          <CardDescription className="text-slate-500">
            ログインに使うパスワードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">新しいパスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="6文字以上"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">パスワード（確認）</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="もう一度入力"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-sm text-red-500 text-center bg-red-50 p-2 rounded">
                {error}
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
                  設定中...
                </>
              ) : (
                'パスワードを設定してログイン'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

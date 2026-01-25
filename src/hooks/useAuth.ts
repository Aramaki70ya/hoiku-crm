'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabaseRef = useRef<SupabaseClient | null>(null)

  useEffect(() => {
    // createBrowserClient は window 依存のため、useEffect 内でのみ実行（SSR 回避）
    const supabase = createClient()
    supabaseRef.current = supabase

    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      const logData = {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email,
        error: error?.message,
      }
      console.log('[DEBUG useAuth] 初期セッション取得:', logData)
      console.log('[DEBUG useAuth] 詳細:', JSON.stringify(logData, null, 2))
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const logData = {
          event,
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
        }
        console.log('[DEBUG useAuth] 認証状態変更:', logData)
        console.log('[DEBUG useAuth] 詳細:', JSON.stringify(logData, null, 2))
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
      supabaseRef.current = null
    }
  }, [])

  const signOut = useCallback(async () => {
    if (supabaseRef.current) {
      await supabaseRef.current.auth.signOut()
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }, [])

  return { user, loading, signOut }
}


'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { User } from '@/types/database'
import { filterUsersShownInMainCrm } from '@/lib/user-display-filter'

interface UseUsersResult {
  users: User[]
  consultants: User[] // 管理者以外のユーザー
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useUsers(): UseUsersResult {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch('/api/users')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'データ取得に失敗しました')
      }

      const { users: usersData } = await res.json()
      setUsers(filterUsersShownInMainCrm(usersData || []))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // 毎レンダーで新配列を返すと、consultant 絞り込み時に consultantFilterIds → useCandidates の fetch が連鎖する
  const consultants = useMemo(
    () => users.filter((u: User) => u.role !== 'admin'),
    [users],
  )

  return {
    users,
    consultants,
    isLoading,
    error,
    refetch: fetchUsers,
  }
}

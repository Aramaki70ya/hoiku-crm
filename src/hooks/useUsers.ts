'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { User } from '@/types/database'
import {
  filterUsersShownInMainCrm,
  isHiddenFromCrmConsultantLists,
  isSalesConsultantUser,
} from '@/lib/user-display-filter'

export interface UseUsersOptions {
  /** true のとき退職済みユーザーも含める（成約画面など期間に応じた候補表示用） */
  includeRetired?: boolean
}

interface UseUsersResult {
  users: User[]
  consultants: User[] // 営業メンバー
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useUsers(options: UseUsersOptions = {}): UseUsersResult {
  const { includeRetired = false } = options
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
      const raw = usersData || []
      const list = includeRetired
        ? raw.filter((u: User) => !isHiddenFromCrmConsultantLists(u.name))
        : filterUsersShownInMainCrm(raw)
      setUsers(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [includeRetired])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // 毎レンダーで新配列を返すと、consultant 絞り込み時に consultantFilterIds → useCandidates の fetch が連鎖する
  const consultants = useMemo(
    () => users.filter(isSalesConsultantUser),
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

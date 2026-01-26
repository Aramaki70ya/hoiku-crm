'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@/types/database'

interface UseUsersResult {
  users: User[]
  consultants: User[] // 管理者以外のユーザー
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const hiddenUserNames = new Set(['笹嶋', '笹島'])

const normalizeName = (name: string) => name.replace(/\s+/g, '')

const isActiveUser = (user: User) => {
  if (!user.retired_at) return true
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const retiredAt = new Date(user.retired_at)
  retiredAt.setHours(0, 0, 0, 0)
  return retiredAt >= today
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
      const activeUsers = (usersData || [])
        .filter(isActiveUser)
        .filter((user) => !hiddenUserNames.has(normalizeName(user.name)))
      setUsers(activeUsers)
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

  return {
    users,
    consultants: users.filter(u => u.role !== 'admin'),
    isLoading,
    error,
    refetch: fetchUsers,
  }
}

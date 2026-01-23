'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Source } from '@/types/database'

interface UseSourcesResult {
  sources: Source[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  createSource: (data: Partial<Source>) => Promise<Source | null>
  updateSource: (id: string, data: Partial<Source>) => Promise<boolean>
  deleteSource: (id: string) => Promise<boolean>
}

export function useSources(): UseSourcesResult {
  const [sources, setSources] = useState<Source[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSources = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch('/api/sources')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'データ取得に失敗しました')
      }

      const { data } = await res.json()
      setSources(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setSources([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createSource = useCallback(async (data: Partial<Source>): Promise<Source | null> => {
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const responseData = await res.json()
        throw new Error(responseData.error || '登録に失敗しました')
      }

      const { data: newSource } = await res.json()
      setSources(prev => [...prev, newSource])
      return newSource
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      return null
    }
  }, [])

  const updateSource = useCallback(async (id: string, data: Partial<Source>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const responseData = await res.json()
        throw new Error(responseData.error || '更新に失敗しました')
      }

      setSources(prev => prev.map(s => s.id === id ? { ...s, ...data } : s))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      return false
    }
  }, [])

  const deleteSource = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/sources/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const responseData = await res.json()
        throw new Error(responseData.error || '削除に失敗しました')
      }

      setSources(prev => prev.filter(s => s.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      return false
    }
  }, [])

  useEffect(() => {
    fetchSources()
  }, [fetchSources])

  return {
    sources,
    isLoading,
    error,
    refetch: fetchSources,
    createSource,
    updateSource,
    deleteSource,
  }
}

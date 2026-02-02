'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Interview } from '@/types/database'

interface EnrichedInterview extends Interview {
  project?: {
    id: string
    candidate_id: string
    client_name: string
    phase: string
    candidate?: {
      id: string
      name: string
      phone: string | null
      status: string
      consultant_id: string | null
      consultant?: {
        id: string
        name: string
      }
    }
  }
}

interface UseInterviewsOptions {
  month?: string // YYYY-MM形式
  status?: string
  consultantId?: string
}

interface UseInterviewsResult {
  interviews: EnrichedInterview[]
  isLoading: boolean
  error: string | null
  total: number
  refetch: () => Promise<void>
  updateInterview: (id: string, updates: Partial<Interview>) => Promise<boolean>
  createInterview: (data: Partial<Interview>) => Promise<Interview | null>
}

export function useInterviews(options: UseInterviewsOptions = {}): UseInterviewsResult {
  const [interviews, setInterviews] = useState<EnrichedInterview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchInterviews = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.month) params.set('month', options.month)
      if (options.status && options.status !== 'all') params.set('status', options.status)
      if (options.consultantId && options.consultantId !== 'all') params.set('consultant_id', options.consultantId)
      params.set('_t', Date.now().toString())

      const res = await fetch(`/api/interviews?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'データ取得に失敗しました')
      }

      const { data, total: totalCount } = await res.json()
      setInterviews(data || [])
      setTotal(totalCount || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setInterviews([])
    } finally {
      setIsLoading(false)
    }
  }, [options.month, options.status, options.consultantId])

  const updateInterview = useCallback(async (id: string, updates: Partial<Interview>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/interviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '更新に失敗しました')
      }

      // ローカル状態を更新
      setInterviews(prev => prev.map(i => 
        i.id === id ? { ...i, ...updates } : i
      ))

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      return false
    }
  }, [])

  const createInterview = useCallback(async (data: Partial<Interview>): Promise<Interview | null> => {
    try {
      const res = await fetch('/api/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const responseData = await res.json()
        throw new Error(responseData.error || '登録に失敗しました')
      }

      const { data: newInterview } = await res.json()
      setInterviews(prev => [newInterview, ...prev])
      return newInterview
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      return null
    }
  }, [])

  useEffect(() => {
    fetchInterviews()
  }, [fetchInterviews])

  return {
    interviews,
    isLoading,
    error,
    total,
    refetch: fetchInterviews,
    updateInterview,
    createInterview,
  }
}

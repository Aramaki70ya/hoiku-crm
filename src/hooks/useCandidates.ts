'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Candidate, CandidateWithRelations } from '@/types/database'

interface UseCandidatesOptions {
  status?: string
  consultantId?: string
  search?: string
  month?: string
  limit?: number
  offset?: number
}

interface CreateCandidateInput {
  name: string
  kana?: string | null
  phone?: string | null
  email?: string | null
  birth_date?: string | null
  age?: number | null
  prefecture?: string | null
  address?: string | null
  qualification?: string | null
  desired_employment_type?: string | null
  desired_job_type?: string | null
  status?: string
  source_id?: string | null
  registered_at?: string | null
  consultant_id?: string | null
  approach_priority?: 'S' | 'A' | 'B' | 'C' | null
  rank?: 'S' | 'A' | 'B' | 'C' | null
  memo?: string | null
}

interface UseCandidatesResult {
  candidates: CandidateWithRelations[]
  isLoading: boolean
  error: string | null
  total: number
  refetch: () => Promise<void>
  createCandidate: (data: CreateCandidateInput) => Promise<CandidateWithRelations | null>
  updateCandidate: (id: string, updates: Partial<Candidate>) => Promise<boolean>
}

export function useCandidates(options: UseCandidatesOptions = {}): UseCandidatesResult {
  const [candidates, setCandidates] = useState<CandidateWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchCandidates = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.status && options.status !== 'all') params.set('status', options.status)
      if (options.consultantId && options.consultantId !== 'all') params.set('consultant_id', options.consultantId)
      if (options.search) params.set('search', options.search)
      if (options.month) params.set('month', options.month)
      if (options.limit) params.set('limit', options.limit.toString())
      if (options.offset) params.set('offset', options.offset.toString())
      // キャッシュを完全に回避するためタイムスタンプを付与
      params.set('_t', Date.now().toString())

      const res = await fetch(`/api/candidates?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'データ取得に失敗しました')
      }

      const { data, total: totalCount } = await res.json()
      setCandidates(data || [])
      setTotal(totalCount || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setCandidates([])
    } finally {
      setIsLoading(false)
    }
  }, [options.status, options.consultantId, options.search, options.month, options.limit, options.offset])

  const createCandidate = useCallback(async (data: CreateCandidateInput): Promise<CandidateWithRelations | null> => {
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const responseData = await res.json()
        throw new Error(responseData.error || '登録に失敗しました')
      }

      const { data: newCandidate } = await res.json()
      
      // 一覧を再取得して最新状態を反映
      await fetchCandidates()
      
      return newCandidate
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      return null
    }
  }, [fetchCandidates])

  const updateCandidate = useCallback(async (id: string, updates: Partial<Candidate>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '更新に失敗しました')
      }

      // ローカル状態を更新
      setCandidates(prev => prev.map(c => 
        c.id === id ? { ...c, ...updates } : c
      ))

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      return false
    }
  }, [])

  useEffect(() => {
    fetchCandidates()
  }, [fetchCandidates])

  return {
    candidates,
    isLoading,
    error,
    total,
    refetch: fetchCandidates,
    createCandidate,
    updateCandidate,
  }
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Contract, ContractWithRelations } from '@/types/database'

interface UseContractsOptions {
  /** @deprecated fromMonth/toMonth を推奨 */
  month?: string // YYYY-MM形式
  fromMonth?: string
  toMonth?: string
  listMode?: 'accepted' | 'cancelled'
  consultantId?: string
}

interface UseContractsResult {
  contracts: ContractWithRelations[]
  isLoading: boolean
  error: string | null
  total: number
  refetch: () => Promise<void>
  updateContract: (id: string, updates: Partial<Contract>) => Promise<boolean>
  createContract: (data: Partial<Contract>) => Promise<Contract | null>
}

export function useContracts(options: UseContractsOptions = {}): UseContractsResult {
  const [contracts, setContracts] = useState<ContractWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const fetchContracts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.month) {
        params.set('month', options.month)
      } else if (options.fromMonth && options.toMonth) {
        params.set('from_month', options.fromMonth)
        params.set('to_month', options.toMonth)
      }
      if (options.listMode && options.listMode !== 'accepted') {
        params.set('list_mode', options.listMode)
      }
      if (options.consultantId && options.consultantId !== 'all') params.set('consultant_id', options.consultantId)

      const res = await fetch(`/api/contracts?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'データ取得に失敗しました')
      }

      const { data, total: totalCount } = await res.json()
      setContracts(data || [])
      setTotal(totalCount || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setContracts([])
    } finally {
      setIsLoading(false)
    }
  }, [options.month, options.fromMonth, options.toMonth, options.listMode, options.consultantId])

  const updateContract = useCallback(async (id: string, updates: Partial<Contract>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '更新に失敗しました')
      }

      setContracts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      return false
    }
  }, [])

  const createContract = useCallback(async (data: Partial<Contract>): Promise<Contract | null> => {
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const responseData = await res.json()
        throw new Error(responseData.error || '登録に失敗しました')
      }

      const { data: newContract } = await res.json()
      setContracts((prev) => [newContract, ...prev])
      return newContract
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      return null
    }
  }, [])

  useEffect(() => {
    fetchContracts()
  }, [fetchContracts])

  return {
    contracts,
    isLoading,
    error,
    total,
    refetch: fetchContracts,
    updateContract,
    createContract,
  }
}

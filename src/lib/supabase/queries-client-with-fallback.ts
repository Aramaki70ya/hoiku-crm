/**
 * Supabaseデータ取得クエリ（フォールバック付き）
 * デモモード時はmock-data.tsを使用、本番環境ではSupabaseを使用
 */

import { isDemoMode } from './config'
import { createClient } from './client'
import type { Candidate, Project, Interview, User, Source, Contract, StatusHistory } from '@/types/database'

// デモモード時はmock-data.tsからインポート
let mockData: {
  mockCandidates: Candidate[]
  mockUsers: User[]
  mockProjects: Project[]
  mockInterviews: Interview[]
  mockContracts: Contract[]
  mockSources: Source[]
} | null = null

if (isDemoMode()) {
  // デモモード時のみ動的インポート
  mockData = require('@/lib/mock-data')
}

// ========================================
// Candidates (求職者)
// ========================================

function logSupabaseError(context: string, err: unknown): void {
  const msg = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : String(err)
  const code = err && typeof err === 'object' && 'code' in err ? (err as { code?: string }).code : undefined
  console.error(`Error fetching ${context}:`, msg, code ? `[${code}]` : '')
}

export async function getCandidatesClient(): Promise<Candidate[]> {
  if (isDemoMode() && mockData) {
    return mockData.mockCandidates
  }

  try {
    const supabase = createClient()
    // Supabaseのデフォルト limit は1000件なので、全件取得するために range を指定
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('registered_at', { ascending: false })
      .range(0, 9999) // 最大10000件まで取得

    if (error) {
      logSupabaseError('candidates', error)
      if (mockData) {
        console.warn('Falling back to mock data due to error')
        return mockData.mockCandidates
      }
      throw new Error(`Failed to fetch candidates: ${error.message}`)
    }

    return data || []
  } catch (err) {
    logSupabaseError('candidates', err)
    // 開発時のみ: 接続失敗時にモックでフォールバック（.env.local 未設定時など）
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      try {
        const m = require('@/lib/mock-data')
        console.warn('Supabase接続に失敗したためモックデータで表示しています。.env.local を設定してください。')
        return m.mockCandidates ?? []
      } catch {
        // ignore
      }
    }
    throw err instanceof Error ? err : new Error(`Failed to fetch candidates: ${String(err)}`)
  }
}

export async function getCandidateByIdClient(id: string): Promise<Candidate | null> {
  if (isDemoMode() && mockData) {
    return mockData.mockCandidates.find(c => c.id === id) || null
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching candidate:', error)
    if (mockData) {
      return mockData.mockCandidates.find(c => c.id === id) || null
    }
    return null
  }

  return data
}

// ========================================
// Users (ユーザー/コンサルタント)
// ========================================

export async function getUsersClient(): Promise<User[]> {
  if (isDemoMode() && mockData) {
    return mockData.mockUsers
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name')

    if (error) {
      logSupabaseError('users', error)
      if (mockData) {
        return mockData.mockUsers
      }
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    return data || []
  } catch (err) {
    logSupabaseError('users', err)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      try {
        const m = require('@/lib/mock-data')
        console.warn('Supabase接続に失敗したためモックデータで表示しています。.env.local を設定してください。')
        return m.mockUsers ?? []
      } catch {
        // ignore
      }
    }
    throw err instanceof Error ? err : new Error(`Failed to fetch users: ${String(err)}`)
  }
}

export async function getUserByIdClient(id: string): Promise<User | null> {
  if (isDemoMode() && mockData) {
    return mockData.mockUsers.find(u => u.id === id) || null
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    if (mockData) {
      return mockData.mockUsers.find(u => u.id === id) || null
    }
    return null
  }

  return data
}

// ========================================
// Projects (案件)
// ========================================

export async function getProjectsClient(): Promise<Project[]> {
  if (isDemoMode() && mockData) {
    return mockData.mockProjects
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
      .range(0, 9999)

    if (error) {
      logSupabaseError('projects', error)
      if (mockData) return mockData.mockProjects
      throw new Error(`Failed to fetch projects: ${error.message}`)
    }
    return data || []
  } catch (err) {
    logSupabaseError('projects', err)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      try {
        const m = require('@/lib/mock-data')
        return m.mockProjects ?? []
      } catch {
        // ignore
      }
    }
    throw err instanceof Error ? err : new Error(`Failed to fetch projects: ${String(err)}`)
  }
}

export async function getProjectsByCandidateIdClient(candidateId: string): Promise<Project[]> {
  if (isDemoMode() && mockData) {
    return mockData.mockProjects.filter(p => p.candidate_id === candidateId)
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects by candidate:', error)
    if (mockData) {
      return mockData.mockProjects.filter(p => p.candidate_id === candidateId)
    }
    throw new Error(`Failed to fetch projects: ${error.message}`)
  }

  return data || []
}

// ========================================
// Interviews (面接)
// ========================================

export async function getInterviewsClient(): Promise<Interview[]> {
  if (isDemoMode() && mockData) {
    return mockData.mockInterviews
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('interviews')
      .select(`
        *,
        project:projects!inner(id)
      `)
      .order('start_at', { ascending: false })

    if (error) {
      logSupabaseError('interviews', error)
      if (mockData) return mockData.mockInterviews
      throw new Error(`Failed to fetch interviews: ${error.message}`)
    }
    return (data || []).map(({ project, ...interview }: { project?: unknown }) => interview as Interview)
  } catch (err) {
    logSupabaseError('interviews', err)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      try {
        const m = require('@/lib/mock-data')
        return m.mockInterviews ?? []
      } catch {
        // ignore
      }
    }
    throw err instanceof Error ? err : new Error(`Failed to fetch interviews: ${String(err)}`)
  }
}

export async function getInterviewsByProjectIdClient(projectId: string): Promise<Interview[]> {
  if (isDemoMode() && mockData) {
    return mockData.mockInterviews.filter(i => i.project_id === projectId)
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('project_id', projectId)
    .order('start_at', { ascending: false })

  if (error) {
    console.error('Error fetching interviews by project:', error)
    if (mockData) {
      return mockData.mockInterviews.filter(i => i.project_id === projectId)
    }
    throw new Error(`Failed to fetch interviews: ${error.message}`)
  }

  return data || []
}

// ========================================
// Contracts (成約)
// ========================================

export async function getContractsClient(): Promise<Contract[]> {
  if (isDemoMode() && mockData) {
    return mockData.mockContracts
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .order('accepted_date', { ascending: false })

    if (error) {
      logSupabaseError('contracts', error)
      if (mockData) return mockData.mockContracts
      throw new Error(`Failed to fetch contracts: ${error.message}`)
    }
    return data || []
  } catch (err) {
    logSupabaseError('contracts', err)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      try {
        const m = require('@/lib/mock-data')
        return m.mockContracts ?? []
      } catch {
        // ignore
      }
    }
    throw err instanceof Error ? err : new Error(`Failed to fetch contracts: ${String(err)}`)
  }
}

// ========================================
// StatusHistory (ステータス変更履歴)
// ========================================

export async function getStatusHistoryClient(): Promise<StatusHistory[]> {
  if (isDemoMode()) {
    return []
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('status_history')
      .select('id, candidate_id, project_id, old_status, new_status, changed_by, changed_at, note')
      .order('changed_at', { ascending: false })
      .range(0, 49999)

    if (error) {
      logSupabaseError('status_history', error)
      return []
    }
    return (data || []) as StatusHistory[]
  } catch (err) {
    logSupabaseError('status_history', err)
    return []
  }
}

export async function getContractByCandidateIdClient(candidateId: string): Promise<Contract | null> {
  if (isDemoMode() && mockData) {
    return mockData.mockContracts.find(c => c.candidate_id === candidateId) || null
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('candidate_id', candidateId)
    .single()

  if (error) {
    // 成約がない場合はnullを返す（エラーではない）
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching contract:', error)
    if (mockData) {
      return mockData.mockContracts.find(c => c.candidate_id === candidateId) || null
    }
    return null
  }

  return data
}

// ========================================
// Sources (媒体)
// ========================================

export async function getSourcesClient(): Promise<Source[]> {
  if (isDemoMode() && mockData) {
    return mockData.mockSources
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching sources:', error)
    if (mockData) {
      return mockData.mockSources
    }
    throw new Error(`Failed to fetch sources: ${error.message}`)
  }

  return data || []
}

// ========================================
// 集計・統計クエリ
// ========================================

export async function getCandidatesByStatusClient(): Promise<Record<string, number>> {
  if (isDemoMode() && mockData) {
    const counts: Record<string, number> = {}
    mockData.mockCandidates.forEach(candidate => {
      counts[candidate.status] = (counts[candidate.status] || 0) + 1
    })
    return counts
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('candidates')
    .select('status')

  if (error) {
    console.error('Error fetching candidates by status:', error)
    if (mockData) {
      const counts: Record<string, number> = {}
      mockData.mockCandidates.forEach(candidate => {
        counts[candidate.status] = (counts[candidate.status] || 0) + 1
      })
      return counts
    }
    throw new Error(`Failed to fetch candidates by status: ${error.message}`)
  }

  const counts: Record<string, number> = {}
  data?.forEach(candidate => {
    counts[candidate.status] = (counts[candidate.status] || 0) + 1
  })

  return counts
}

export async function getContractsTotalRevenueClient(): Promise<number> {
  if (isDemoMode() && mockData) {
    return mockData.mockContracts.reduce((sum, contract) => sum + (contract.revenue_including_tax || 0), 0)
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('contracts')
    .select('revenue_including_tax')

  if (error) {
    console.error('Error fetching contracts revenue:', error)
    if (mockData) {
      return mockData.mockContracts.reduce((sum, contract) => sum + (contract.revenue_including_tax || 0), 0)
    }
    throw new Error(`Failed to fetch contracts revenue: ${error.message}`)
  }

  return data?.reduce((sum, contract) => sum + (contract.revenue_including_tax || 0), 0) || 0
}

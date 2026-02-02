/**
 * Supabaseデータ取得クエリ（フォールバック付き）
 * デモモード時はmock-data.tsを使用、本番環境ではSupabaseを使用
 */

import { isDemoMode } from './config'
import { createClient } from './client'
import type { Candidate, Project, Interview, User, Source, Contract } from '@/types/database'

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

export async function getCandidatesClient(): Promise<Candidate[]> {
  if (isDemoMode() && mockData) {
    return mockData.mockCandidates
  }

  const supabase = createClient()
  // Supabaseのデフォルト limit は1000件なので、全件取得するために range を指定
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('registered_at', { ascending: false })
    .range(0, 9999) // 最大10000件まで取得

  if (error) {
    console.error('Error fetching candidates:', error)
    // エラー時もデモデータを返す（開発中の利便性のため）
    if (mockData) {
      console.warn('Falling back to mock data due to error')
      return mockData.mockCandidates
    }
    throw new Error(`Failed to fetch candidates: ${error.message}`)
  }

  return data || []
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

  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching users:', error)
    if (mockData) {
      return mockData.mockUsers
    }
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  return data || []
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

  const supabase = createClient()
  // Supabaseのデフォルト limit は1000件なので、全件取得するために range を指定
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .range(0, 9999) // 最大10000件まで取得

  if (error) {
    console.error('Error fetching projects:', error)
    if (mockData) {
      return mockData.mockProjects
    }
    throw new Error(`Failed to fetch projects: ${error.message}`)
  }

  return data || []
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

  const supabase = createClient()
  // projects との INNER JOIN で、有効なプロジェクトを持つ面接のみを取得
  const { data, error } = await supabase
    .from('interviews')
    .select(`
      *,
      project:projects!inner(id)
    `)
    .order('start_at', { ascending: false })

  if (error) {
    console.error('Error fetching interviews:', error)
    if (mockData) {
      return mockData.mockInterviews
    }
    throw new Error(`Failed to fetch interviews: ${error.message}`)
  }

  // project 情報を除去して Interview 型として返す
  return (data || []).map(({ project, ...interview }) => interview as Interview)
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

  const supabase = createClient()
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .order('accepted_date', { ascending: false })

  if (error) {
    console.error('Error fetching contracts:', error)
    if (mockData) {
      return mockData.mockContracts
    }
    throw new Error(`Failed to fetch contracts: ${error.message}`)
  }

  return data || []
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

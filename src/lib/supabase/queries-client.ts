/**
 * Supabaseデータ取得クエリ（クライアント側用）
 * Client Componentから呼び出す場合に使用
 */

import { createClient } from './client'
import type { Candidate, Project, Interview, User, Source, Contract } from '@/types/database'

// ========================================
// Candidates (求職者)
// ========================================

export async function getCandidatesClient(): Promise<Candidate[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('registered_at', { ascending: false })

  if (error) {
    console.error('Error fetching candidates:', error)
    throw new Error(`Failed to fetch candidates: ${error.message}`)
  }

  return data || []
}

export async function getCandidateByIdClient(id: string): Promise<Candidate | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching candidate:', error)
    return null
  }

  return data
}

// ========================================
// Users (ユーザー/コンサルタント)
// ========================================

export async function getUsersClient(): Promise<User[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching users:', error)
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  return data || []
}

export async function getUserByIdClient(id: string): Promise<User | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    return null
  }

  return data
}

// ========================================
// Projects (案件)
// ========================================

export async function getProjectsClient(): Promise<Project[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    throw new Error(`Failed to fetch projects: ${error.message}`)
  }

  return data || []
}

export async function getProjectsByCandidateIdClient(candidateId: string): Promise<Project[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects by candidate:', error)
    throw new Error(`Failed to fetch projects: ${error.message}`)
  }

  return data || []
}

// ========================================
// Interviews (面接)
// ========================================

export async function getInterviewsClient(): Promise<Interview[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .order('start_at', { ascending: false })

  if (error) {
    console.error('Error fetching interviews:', error)
    throw new Error(`Failed to fetch interviews: ${error.message}`)
  }

  return data || []
}

export async function getInterviewsByProjectIdClient(projectId: string): Promise<Interview[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('project_id', projectId)
    .order('start_at', { ascending: false })

  if (error) {
    console.error('Error fetching interviews by project:', error)
    throw new Error(`Failed to fetch interviews: ${error.message}`)
  }

  return data || []
}

// ========================================
// Contracts (成約)
// ========================================

export async function getContractsClient(): Promise<Contract[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .order('accepted_date', { ascending: false })

  if (error) {
    console.error('Error fetching contracts:', error)
    throw new Error(`Failed to fetch contracts: ${error.message}`)
  }

  return data || []
}

export async function getContractByCandidateIdClient(candidateId: string): Promise<Contract | null> {
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
    return null
  }

  return data
}

// ========================================
// Sources (媒体)
// ========================================

export async function getSourcesClient(): Promise<Source[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching sources:', error)
    throw new Error(`Failed to fetch sources: ${error.message}`)
  }

  return data || []
}

// ========================================
// 集計・統計クエリ
// ========================================

export async function getCandidatesByStatusClient(): Promise<Record<string, number>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('candidates')
    .select('status')

  if (error) {
    console.error('Error fetching candidates by status:', error)
    throw new Error(`Failed to fetch candidates by status: ${error.message}`)
  }

  const counts: Record<string, number> = {}
  data?.forEach(candidate => {
    counts[candidate.status] = (counts[candidate.status] || 0) + 1
  })

  return counts
}

export async function getContractsTotalRevenueClient(): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('contracts')
    .select('revenue_including_tax')

  if (error) {
    console.error('Error fetching contracts revenue:', error)
    throw new Error(`Failed to fetch contracts revenue: ${error.message}`)
  }

  return data?.reduce((sum, contract) => sum + (contract.revenue_including_tax || 0), 0) || 0
}

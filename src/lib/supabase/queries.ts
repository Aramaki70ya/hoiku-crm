/**
 * Supabaseデータ取得クエリ
 * 後方互換性のため、クライアント側の関数を再エクスポート
 * 
 * @deprecated 新しいコードでは queries-client.ts または queries-server.ts を直接使用してください
 */

// クライアント側の関数を再エクスポート（後方互換性のため）
export {
  getCandidatesClient as getCandidates,
  getCandidateByIdClient as getCandidateById,
  getUsersClient as getUsers,
  getUserByIdClient as getUserById,
  getProjectsClient as getProjects,
  getProjectsByCandidateIdClient as getProjectsByCandidateId,
  getInterviewsClient as getInterviews,
  getInterviewsByProjectIdClient as getInterviewsByProjectId,
  getContractsClient as getContracts,
  getContractByCandidateIdClient as getContractByCandidateId,
  getSourcesClient as getSources,
  getCandidatesByStatusClient as getCandidatesByStatus,
  getContractsTotalRevenueClient as getContractsTotalRevenue,
} from './queries-client'

// ========================================
// Candidates (求職者)
// ========================================

export async function getCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('registered_at', { ascending: false })

  if (error) {
    console.error('Error fetching candidates:', error)
    return []
  }

  return data || []
}

export async function getCandidateById(id: string): Promise<Candidate | null> {
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

export async function getUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }

  return data || []
}

export async function getUserById(id: string): Promise<User | null> {
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

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    return []
  }

  return data || []
}

export async function getProjectsByCandidateId(candidateId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects by candidate:', error)
    return []
  }

  return data || []
}

// ========================================
// Interviews (面接)
// ========================================

export async function getInterviews(): Promise<Interview[]> {
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .order('start_at', { ascending: false })

  if (error) {
    console.error('Error fetching interviews:', error)
    return []
  }

  return data || []
}

export async function getInterviewsByProjectId(projectId: string): Promise<Interview[]> {
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('project_id', projectId)
    .order('start_at', { ascending: false })

  if (error) {
    console.error('Error fetching interviews by project:', error)
    return []
  }

  return data || []
}

// ========================================
// Contracts (成約)
// ========================================

export async function getContracts(): Promise<Contract[]> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .order('accepted_date', { ascending: false })

  if (error) {
    console.error('Error fetching contracts:', error)
    return []
  }

  return data || []
}

export async function getContractByCandidateId(candidateId: string): Promise<Contract | null> {
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

export async function getSources(): Promise<Source[]> {
  const { data, error } = await supabase
    .from('sources')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching sources:', error)
    return []
  }

  return data || []
}

// ========================================
// 集計・統計クエリ
// ========================================

export async function getCandidatesByStatus(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('candidates')
    .select('status')

  if (error) {
    console.error('Error fetching candidates by status:', error)
    return {}
  }

  const counts: Record<string, number> = {}
  data?.forEach(candidate => {
    counts[candidate.status] = (counts[candidate.status] || 0) + 1
  })

  return counts
}

export async function getContractsTotalRevenue(): Promise<number> {
  const { data, error } = await supabase
    .from('contracts')
    .select('revenue_including_tax')

  if (error) {
    console.error('Error fetching contracts revenue:', error)
    return 0
  }

  return data?.reduce((sum, contract) => sum + (contract.revenue_including_tax || 0), 0) || 0
}

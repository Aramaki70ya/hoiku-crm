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

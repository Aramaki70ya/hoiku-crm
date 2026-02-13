/**
 * ステータスマッピング定義
 * 求職者・案件・面接のステータスはすべて日本語でDB保存される新体系を使用
 */

import type { CandidateStatus, ProjectPhase, InterviewStatus } from '@/types/database'

// ========================================
// 求職者ステータス
// ========================================

/**
 * 求職者ステータス一覧
 */
export const STATUS_LIST: CandidateStatus[] = [
  '初回連絡中',
  '連絡つかず（初回未接触）',
  '提案求人選定中',
  '求人提案済（返信待ち）',
  '書類選考中',
  '面接日程調整中',
  '面接確定済',
  '面接実施済（結果待ち）',
  '内定獲得（承諾確認中）',
  '内定承諾（成約）',
  '内定辞退',
  '音信不通',
  '追客中（中長期フォロー）',
  'クローズ（終了）',
  '見学提案~設定',
  '再ヒアリング・条件変更あり',
  '初回ヒアリング実施済',
]

export type StatusType = CandidateStatus

/**
 * 月次マージシートのステータス（絵文字付き）からシステム内のステータスへのマッピング
 */
export const MONTHLY_STATUS_MAP: Record<string, StatusType> = {
  '🟣 提案求人選定中': '提案求人選定中',
  '🟤 求人提案済（返信待ち）': '求人提案済（返信待ち）',
  '🟢 書類選考中': '書類選考中',
  '🟢 面接日程調整中': '面接日程調整中',
  '🟢 面接確定済': '面接確定済',
  '🟠 面接実施済（結果待ち）': '面接実施済（結果待ち）',
  '🟣 内定獲得（承諾確認中）': '内定獲得（承諾確認中）',
  '🟢 内定承諾（成約）': '内定承諾（成約）',
  '🔴 内定辞退': '内定辞退',
  '⚪ 音信不通': '音信不通',
  '⚪ 追客中（中長期フォロー）': '追客中（中長期フォロー）',
  '⚫ クローズ（終了）': 'クローズ（終了）',
  '🟡見学提案~設定': '見学提案~設定',
  '🟠 再ヒアリング・条件変更あり': '再ヒアリング・条件変更あり',
  '🟢 初回ヒアリング実施済': '初回ヒアリング実施済',
}

/**
 * システム内のステータスから月次マージシートのステータス（絵文字付き）への逆マッピング
 */
export const STATUS_TO_MONTHLY_MAP: Record<StatusType, string> = {
  '初回連絡中': '🟢 初回連絡中',
  '連絡つかず（初回未接触）': '⚪ 連絡つかず（初回未接触）',
  '提案求人選定中': '🟣 提案求人選定中',
  '求人提案済（返信待ち）': '🟤 求人提案済（返信待ち）',
  '書類選考中': '🟢 書類選考中',
  '面接日程調整中': '🟢 面接日程調整中',
  '面接確定済': '🟢 面接確定済',
  '面接実施済（結果待ち）': '🟠 面接実施済（結果待ち）',
  '内定獲得（承諾確認中）': '🟣 内定獲得（承諾確認中）',
  '内定承諾（成約）': '🟢 内定承諾（成約）',
  '内定辞退': '🔴 内定辞退',
  '音信不通': '⚪ 音信不通',
  '追客中（中長期フォロー）': '⚪ 追客中（中長期フォロー）',
  'クローズ（終了）': '⚫ クローズ（終了）',
  '見学提案~設定': '🟡見学提案~設定',
  '再ヒアリング・条件変更あり': '🟠 再ヒアリング・条件変更あり',
  '初回ヒアリング実施済': '🟢 初回ヒアリング実施済',
}

/**
 * 月次マージシートのステータス（絵文字付き）をシステム内のステータスに変換
 */
export function mapMonthlyStatusToSystemStatus(monthlyStatus: string): StatusType | null {
  return MONTHLY_STATUS_MAP[monthlyStatus] || null
}

/**
 * システム内のステータスを月次マージシートのステータス（絵文字付き）に変換
 */
export function mapSystemStatusToMonthlyStatus(systemStatus: StatusType): string {
  return STATUS_TO_MONTHLY_MAP[systemStatus] || systemStatus
}

/**
 * 面接状況カードで使用するステータスの分類
 */
export const INTERVIEW_STATUS_CATEGORIES = {
  adjusting: ['面接日程調整中'] as StatusType[],
  beforeInterview: ['面接確定済'] as StatusType[],
  waitingResult: ['面接実施済（結果待ち）'] as StatusType[],
  waitingReply: ['内定獲得（承諾確認中）'] as StatusType[],
} as const

/**
 * 初回連絡済みとみなすステータス一覧
 */
export const FIRST_CONTACT_STATUSES: StatusType[] = [
  '提案求人選定中',
  '求人提案済（返信待ち）',
  '書類選考中',
  '面接日程調整中',
  '面接確定済',
  '面接実施済（結果待ち）',
  '内定獲得（承諾確認中）',
  '内定承諾（成約）',
  '内定辞退',
  '音信不通',
  '追客中（中長期フォロー）',
  'クローズ（終了）',
  '見学提案~設定',
  '再ヒアリング・条件変更あり',
  '初回ヒアリング実施済',
]

/**
 * 面接フェーズに入ったとみなすステータス一覧（当月の面接数カウント用）
 * 「その月に面接フェーズに入った人」を判定する際に使用
 */
export const INTERVIEW_PHASE_STATUSES: StatusType[] = [
  '面接日程調整中',
  '面接確定済',
  '面接実施済（結果待ち）',
]

/**
 * 面接設定済みとみなすステータス一覧（過去の面接経験判定用）
 * 面接日程調整中のみの場合は「面接経験あり」としない（日程調整だけでキャンセルのケースを考慮）
 */
export const INTERVIEW_SET_STATUSES: StatusType[] = [
  '面接確定済',
  '面接実施済（結果待ち）',
  '内定獲得（承諾確認中）',
  '内定承諾（成約）',
  '内定辞退',
]

/**
 * ステータスの表示用ラベル（求職者管理画面のプルダウン用）
 */
export const statusLabels: Record<StatusType, string> = {
  '初回連絡中': '初回連絡中',
  '連絡つかず（初回未接触）': '連絡つかず（初回未接触）',
  '提案求人選定中': '提案求人選定中',
  '求人提案済（返信待ち）': '求人提案済（返信待ち）',
  '書類選考中': '書類選考中',
  '面接日程調整中': '面接日程調整中',
  '面接確定済': '面接確定済',
  '面接実施済（結果待ち）': '面接実施済（結果待ち）',
  '内定獲得（承諾確認中）': '内定獲得（承諾確認中）',
  '内定承諾（成約）': '内定承諾（成約）',
  '内定辞退': '内定辞退',
  '音信不通': '音信不通',
  '追客中（中長期フォロー）': '追客中（中長期フォロー）',
  'クローズ（終了）': 'クローズ（終了）',
  '見学提案~設定': '見学提案~設定',
  '再ヒアリング・条件変更あり': '再ヒアリング・条件変更あり',
  '初回ヒアリング実施済': '初回ヒアリング実施済',
}

/**
 * ステータスの表示用色（求職者管理画面のプルダウン用）
 */
export const statusColors: Record<StatusType, string> = {
  '初回連絡中': 'bg-blue-100 text-blue-700 border-blue-200',
  '連絡つかず（初回未接触）': 'bg-slate-100 text-slate-700 border-slate-200',
  '提案求人選定中': 'bg-purple-100 text-purple-700 border-purple-200',
  '求人提案済（返信待ち）': 'bg-amber-100 text-amber-700 border-amber-200',
  '書類選考中': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  '面接日程調整中': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  '面接確定済': 'bg-blue-100 text-blue-700 border-blue-200',
  '面接実施済（結果待ち）': 'bg-orange-100 text-orange-700 border-orange-200',
  '内定獲得（承諾確認中）': 'bg-pink-100 text-pink-700 border-pink-200',
  '内定承諾（成約）': 'bg-green-100 text-green-700 border-green-200',
  '内定辞退': 'bg-red-100 text-red-700 border-red-200',
  '音信不通': 'bg-gray-100 text-gray-700 border-gray-200',
  '追客中（中長期フォロー）': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'クローズ（終了）': 'bg-slate-100 text-slate-700 border-slate-200',
  '見学提案~設定': 'bg-lime-100 text-lime-700 border-lime-200',
  '再ヒアリング・条件変更あり': 'bg-orange-100 text-orange-700 border-orange-200',
  '初回ヒアリング実施済': 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

/**
 * プロセスステータス分類（ダッシュボード集計用）
 * 求職者ステータスからプロセス名に変換
 */
export const processStatusLabels: Record<string, string> = {
  '初回連絡中': 'リード管理',
  '連絡つかず（初回未接触）': 'リード管理',
  '初回ヒアリング実施済': '面談フェーズ',
  '提案求人選定中': '提案フェーズ',
  '求人提案済（返信待ち）': '提案フェーズ',
  '書類選考中': '提案フェーズ',
  '見学提案~設定': '提案フェーズ',
  '再ヒアリング・条件変更あり': '提案フェーズ',
  '面接日程調整中': '面接フェーズ',
  '面接確定済': '面接フェーズ',
  '面接実施済（結果待ち）': '面接フェーズ',
  '内定獲得（承諾確認中）': '内定確認中',
  '内定承諾（成約）': '内定承諾',
  '内定辞退': '内定辞退',
  '音信不通': 'フォロー・ロスト',
  '追客中（中長期フォロー）': 'フォロー・ロスト',
  'クローズ（終了）': 'フォロー・ロスト',
}

// ========================================
// 案件フェーズ
// ========================================

/**
 * 案件フェーズ一覧
 */
export const PROJECT_PHASE_LIST: ProjectPhase[] = [
  '提案済',
  '書類選考中',
  '面接予定',
  '面接中',
  '内定',
  '入社確定',
  '不採用',
  '辞退',
]

/**
 * 案件フェーズの表示用ラベル
 */
export const projectPhaseLabels: Record<ProjectPhase, string> = {
  '提案済': '提案済',
  '書類選考中': '書類選考中',
  '面接予定': '面接予定',
  '面接中': '面接中',
  '内定': '内定',
  '入社確定': '入社確定',
  '不採用': '不採用',
  '辞退': '辞退',
}

/**
 * 案件フェーズの優先度（高いほど進んでいる）
 */
export const projectPhasePriority: Record<ProjectPhase, number> = {
  '提案済': 2,
  '書類選考中': 3,
  '面接予定': 4,
  '面接中': 5,
  '内定': 6,
  '入社確定': 7,
  '不採用': 1,
  '辞退': 1,
}

/**
 * 案件フェーズの色
 */
export const projectPhaseColors: Record<ProjectPhase, string> = {
  '提案済': 'bg-purple-100 text-purple-700 border-purple-200',
  '書類選考中': 'bg-blue-100 text-blue-700 border-blue-200',
  '面接予定': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  '面接中': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  '内定': 'bg-pink-100 text-pink-700 border-pink-200',
  '入社確定': 'bg-green-100 text-green-700 border-green-200',
  '不採用': 'bg-red-100 text-red-700 border-red-200',
  '辞退': 'bg-slate-100 text-slate-700 border-slate-200',
}

// ========================================
// 面接ステータス
// ========================================

/**
 * 面接ステータス一覧
 */
export const INTERVIEW_STATUS_LIST: InterviewStatus[] = [
  '予定',
  '実施済',
  'キャンセル',
  '調整中',
]

/**
 * 面接ステータスの表示用ラベル
 */
export const interviewStatusLabels: Record<InterviewStatus, string> = {
  '予定': '予定',
  '実施済': '実施済',
  'キャンセル': 'キャンセル',
  '調整中': '調整中',
}

/**
 * 面接ステータスの色
 */
export const interviewStatusColors: Record<InterviewStatus, string> = {
  '調整中': 'bg-amber-100 text-amber-700 border-amber-200',
  '予定': 'bg-blue-100 text-blue-700 border-blue-200',
  '実施済': 'bg-green-100 text-green-700 border-green-200',
  'キャンセル': 'bg-red-100 text-red-700 border-red-200',
}

// ========================================
// 求職者ステータス → 面接ステータスの連動マッピング
// ========================================

/**
 * 求職者ステータスが面接系に変わった時に、面接テーブルのステータスも同期するためのマッピング
 */
export const candidateStatusToInterviewStatus: Record<string, InterviewStatus> = {
  '面接日程調整中': '調整中',
  '面接確定済': '予定',
  '面接実施済（結果待ち）': '実施済',
}

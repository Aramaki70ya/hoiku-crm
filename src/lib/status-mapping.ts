/**
 * ステータスマッピング定義
 * 月次マージシートのステータス（絵文字付き）とシステム内のステータスの対応関係
 */

/**
 * ステータス一覧（ユーザー定義）
 */
export const STATUS_LIST = [
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
  // 実際のデータに存在する追加ステータス
  '見学提案~設定',
  '再ヒアリング・条件変更あり',
  '初回ヒアリング実施済',
] as const

export type StatusType = typeof STATUS_LIST[number]

/**
 * 月次マージシートのステータス（絵文字付き）からシステム内のステータスへのマッピング
 */
export const MONTHLY_STATUS_MAP: Record<string, StatusType> = {
  // 初回連絡中 - 月次マージシートには直接対応するステータスがない可能性がある
  // '🟢 初回連絡中': '初回連絡中',
  
  // 連絡つかず（初回未接触）- 月次マージシートには直接対応するステータスがない可能性がある
  // '⚪ 連絡つかず': '連絡つかず（初回未接触）',
  
  // 提案求人選定中
  '🟣 提案求人選定中': '提案求人選定中',
  
  // 求人提案済（返信待ち）
  '🟤 求人提案済（返信待ち）': '求人提案済（返信待ち）',
  
  // 書類選考中
  '🟢 書類選考中': '書類選考中',
  
  // 面接日程調整中
  '🟢 面接日程調整中': '面接日程調整中',
  
  // 面接確定済
  '🟢 面接確定済': '面接確定済',
  
  // 面接実施済（結果待ち）
  '🟠 面接実施済（結果待ち）': '面接実施済（結果待ち）',
  
  // 内定獲得（承諾確認中）
  '🟣 内定獲得（承諾確認中）': '内定獲得（承諾確認中）',
  
  // 内定承諾（成約）
  '🟢 内定承諾（成約）': '内定承諾（成約）',
  
  // 内定辞退
  '🔴 内定辞退': '内定辞退',
  
  // 音信不通
  '⚪ 音信不通': '音信不通',
  
  // 追客中（中長期フォロー）
  '⚪ 追客中（中長期フォロー）': '追客中（中長期フォロー）',
  
  // クローズ（終了）
  '⚫ クローズ（終了）': 'クローズ（終了）',
  
  // 実際のデータに存在する追加ステータス
  '🟡見学提案~設定': '見学提案~設定',
  '🟠 再ヒアリング・条件変更あり': '再ヒアリング・条件変更あり',
  '🟢 初回ヒアリング実施済': '初回ヒアリング実施済',
}

/**
 * システム内のステータスから月次マージシートのステータス（絵文字付き）への逆マッピング
 */
export const STATUS_TO_MONTHLY_MAP: Record<StatusType, string> = {
  '初回連絡中': '🟢 初回連絡中', // 仮のマッピング（実際の値に合わせて調整）
  '連絡つかず（初回未接触）': '⚪ 連絡つかず（初回未接触）', // 仮のマッピング（実際の値に合わせて調整）
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
  // 調整中: 面接日程調整中
  adjusting: ['面接日程調整中'] as StatusType[],
  
  // 面接前: 面接確定済
  beforeInterview: ['面接確定済'] as StatusType[],
  
  // 結果待ち: 面接実施済（結果待ち）
  waitingResult: ['面接実施済（結果待ち）'] as StatusType[],
  
  // 本人返事待ち: 内定獲得（承諾確認中）
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
 * 面接設定済みとみなすステータス一覧
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
 * 古いステータス値（CandidateStatus）から新しいステータス体系へのマッピング
 * データベースに保存されている古い値を新しい体系に変換するために使用
 */
export const LEGACY_STATUS_MAP: Record<string, StatusType> = {
  'new': '初回連絡中',
  'contacting': '連絡中', // 古い値だが、新しい体系には「連絡中」がないので「初回連絡中」にマッピング
  'first_contact_done': '初回ヒアリング実施済',
  'proposing': '提案求人選定中',
  'interviewing': '面接確定済', // または '面接実施済（結果待ち）' にマッピングする可能性もある
  'offer': '内定獲得（承諾確認中）',
  'closed_won': '内定承諾（成約）',
  'closed_lost': 'クローズ（終了）',
  'pending': '追客中（中長期フォロー）',
  'on_hold': '音信不通',
}

/**
 * 古いステータス値を新しいステータス体系に変換
 */
export function mapLegacyStatusToNewStatus(legacyStatus: string): StatusType {
  return LEGACY_STATUS_MAP[legacyStatus] || (legacyStatus as StatusType) || '初回連絡中'
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

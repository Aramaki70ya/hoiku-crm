// Supabaseのテーブル型定義

export interface Database {
  public: {
    Tables: {
      candidates: {
        Row: Candidate
        Insert: Omit<Candidate, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Candidate, 'id'>>
      }
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Project, 'id'>>
      }
      interviews: {
        Row: Interview
        Insert: Omit<Interview, 'id' | 'created_at'>
        Update: Partial<Omit<Interview, 'id'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'created_at'>
        Update: Partial<Omit<User, 'id'>>
      }
      sources: {
        Row: Source
        Insert: Omit<Source, 'id'>
        Update: Partial<Omit<Source, 'id'>>
      }
      contracts: {
        Row: Contract
        Insert: Omit<Contract, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Contract, 'id'>>
      }
      memos: {
        Row: Memo
        Insert: Omit<Memo, 'id' | 'created_at'>
        Update: Partial<Omit<Memo, 'id' | 'created_at'>>
      }
      status_history: {
        Row: StatusHistory
        Insert: Omit<StatusHistory, 'id'>
        Update: Partial<Omit<StatusHistory, 'id'>>
      }
      email_logs: {
        Row: EmailLog
        Insert: Omit<EmailLog, 'id' | 'created_at'>
        Update: Partial<Omit<EmailLog, 'id'>>
      }
      timeline_events: {
        Row: TimelineEvent
        Insert: Omit<TimelineEvent, 'id' | 'created_at'>
        Update: Partial<Omit<TimelineEvent, 'id' | 'created_at'>>
      }
    }
  }
}

// 求職者マスタ
export interface Candidate {
  id: string // 20206138形式
  name: string
  kana: string | null
  phone: string | null
  email: string | null
  birth_date: string | null // ISO date string
  age: number | null
  prefecture: string | null
  address: string | null
  qualification: string | null // カンマ区切り（保育士, 幼稚園教諭等）
  desired_employment_type: string | null // 正社員, パート等
  desired_job_type: string | null // 保育士, 栄養士等
  status: CandidateStatus
  source_id: string | null // 媒体マスタへのFK
  registered_at: string | null // ISO date string
  consultant_id: string | null // 担当者へのFK
  approach_priority: 'S' | 'A' | 'B' | 'C' | null // アプローチ優先度（タスク画面用）
  rank: 'S' | 'A' | 'B' | 'C' | null // ランク（求職者管理画面用）
  memo: string | null
  created_at: string
  updated_at: string
}

// 求職者ステータス（新体系・日本語）
export type CandidateStatus =
  | '初回連絡中'
  | '連絡つかず（初回未接触）'
  | '提案求人選定中'
  | '求人提案済（返信待ち）'
  | '書類選考中'
  | '面接日程調整中'
  | '面接確定済'
  | '面接実施済（結果待ち）'
  | '内定獲得（承諾確認中）'
  | '内定承諾（成約）'
  | '内定辞退'
  | '音信不通'
  | '追客中（中長期フォロー）'
  | 'クローズ（終了）'
  | '見学提案~設定'
  | '再ヒアリング・条件変更あり'
  | '初回ヒアリング実施済'

// 案件（選考プロセス）
export interface Project {
  id: string
  candidate_id: string
  client_name: string // 園名/法人名（互換用）
  corporation_name: string | null // 法人名
  garden_name: string | null // 園名
  phase: ProjectPhase
  expected_amount: number | null // ヨミ金額
  probability: 'A' | 'B' | 'C' | null // 確度
  probability_month: 'current' | 'next' | null // ヨミ対象月（当月/翌月）
  month_text: string | null // 月情報（'2025_10', '2025_11', '2025_12'など）
  expected_entry_date: string | null // 入職予定時期
  note: string | null
  created_at: string
  updated_at: string
}

// 案件フェーズ（新体系・日本語）
export type ProjectPhase =
  | '提案済'
  | '書類選考中'
  | '面接予定'
  | '面接中'
  | '内定'
  | '入社確定'
  | '不採用'
  | '辞退'

// 面接・面談ログ
export interface Interview {
  id: string
  project_id: string
  type: InterviewType
  start_at: string // ISO datetime
  end_at: string | null
  location: string | null // 場所/URL
  status: InterviewStatus
  feedback: string | null // 結果・所感
  is_voided: boolean // 無効化フラグ（true: 件数から除外、false: 件数にカウント）
  voided_at: string | null // 無効化日時
  void_reason: string | null // 無効化理由
  created_at: string
}

export type InterviewType =
  | 'first_meeting' // 初回面談
  | 'interview' // 面接
  | 'tour' // 見学
  | 'second_interview' // 二次面接
  | 'final_interview' // 最終面接

// 面接ステータス（新体系・日本語）
export type InterviewStatus =
  | '予定'
  | '実施済'
  | 'キャンセル'
  | '調整中'

// ユーザー（コンサルタント）
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  retired_at: string | null // 退職日（nullは現役）
  created_at: string
}

// 媒体マスタ
export interface Source {
  id: string
  name: string // 媒体名
  category: string | null // カテゴリ（求人版, LINE, バイトル等）
}

// 成約テーブル
export interface Contract {
  id: string
  candidate_id: string
  project_id: string | null // 案件IDへのFK（リードタイム分析用）
  contracted_at: string | null // 成約確定日時（リードタイム分析用）
  accepted_date: string // 承諾日（ISO date string）
  entry_date: string | null // 入社日（ISO date string）
  employment_restriction_until: string | null // 転職勧奨禁止期間
  employment_type: string | null // 雇用形態（正社員、パート等）
  job_type: string | null // 職種（保育士、栄養士等）
  revenue_excluding_tax: number // 売上（税抜）
  revenue_including_tax: number // 売上（税込）
  payment_date: string | null // 入金日（ISO date string）
  payment_scheduled_date: string | null // 入金予定日（ISO date string）
  invoice_sent_date: string | null // 請求書発送日
  calculation_basis: string | null // 算出根拠（例：3,438,000円×20%）
  document_url: string | null // 格納先URL
  placement_company: string | null // 入職先（園名/法人名）※後方互換性のため残す
  placement_company_name: string | null // 入職先（法人名）
  placement_facility_name: string | null // 入職先（園名）
  note: string | null // 備考
  is_cancelled: boolean | null // キャンセル済みかどうか
  refund_required: boolean | null // 返金あり/なし
  refund_date: string | null // 返金日（ISO date string）
  refund_amount: number | null // 返金額
  cancellation_reason: string | null // キャンセル備考（理由）
  created_at: string
  updated_at: string
}

// リレーション付きの型
export interface CandidateWithRelations extends Candidate {
  consultant?: User | null
  source?: Source | null
  projects?: ProjectWithRelations[]
}

export interface ProjectWithRelations extends Project {
  candidate?: Candidate
  interviews?: Interview[]
}

export interface ContractWithRelations extends Contract {
  candidate?: CandidateWithRelations
}

// メモ
export interface Memo {
  id: string
  candidate_id: string
  content: string
  created_by: string | null // ユーザーID
  created_at: string
}

// タイムラインイベント
export interface TimelineEvent {
  id: string
  candidate_id: string
  event_type: TimelineEventType
  title: string
  description: string | null
  created_by: string | null // ユーザーID
  created_at: string
}

export type TimelineEventType =
  | 'memo'              // メモ追加
  | 'status_change'     // ステータス変更
  | 'project_add'       // 案件追加
  | 'yomi_update'       // ヨミ情報更新
  | 'consultant_change' // 担当者変更
  | 'interview_add'     // 面接追加
  | 'interview_status_change' // 面接ステータス変更
  | 'basic_info_change' // 基本情報変更
  | 'contract_add'      // 成約追加
  | 'other'             // その他

export interface TimelineEventWithRelations extends TimelineEvent {
  created_by_user?: User | null
}

// ステータス変更履歴（リードタイム分析・タイムライン表示用）
export interface StatusHistory {
  id: string
  candidate_id: string
  project_id: string | null // 案件に紐づく変更の場合
  old_status: string | null // 変更前ステータス
  new_status: string // 変更後ステータス
  changed_by: string | null // 変更者（Users.id）
  changed_at: string // 変更日時（リードタイム分析用）
  note: string | null // 備考
}

// メール送信履歴（タイムライン表示用）
export interface EmailLog {
  id: string
  candidate_id: string
  template_type: EmailTemplateType
  subject: string
  body: string | null
  to_address: string
  sent_at: string // 送信日時
  sent_by: string | null // 送信者（Users.id）
  status: EmailStatus
  error_message: string | null // エラーメッセージ（失敗時）
  created_at: string
}

export type EmailTemplateType =
  | 'first_contact' // 初回連絡
  | 'interview_invitation' // 面接案内
  | 'interview_reminder' // 面接リマインダー
  | 'offer_notification' // 内定通知
  | 'entry_confirmation' // 入社確認
  | 'followup' // フォローアップ
  | 'other' // その他

export type EmailStatus =
  | 'sent' // 送信済
  | 'failed' // 失敗
  | 'pending' // 保留中

// リレーション付きの型
export interface StatusHistoryWithRelations extends StatusHistory {
  candidate?: Candidate
  project?: Project
  changed_by_user?: User
}

export interface EmailLogWithRelations extends EmailLog {
  candidate?: Candidate
  sent_by_user?: User
}

// 月次目標（全体）
export interface MonthlyTarget {
  id: string
  year_month: string // 例: '2026-01'
  total_sales_budget: number // 全体売上予算（円）
  registration_to_first_contact_rate: number // 登録→初回率
  first_contact_to_interview_rate: number // 初回→面接率
  interview_to_closed_rate: number // 面接→成約率
  closed_unit_price: number // 成約単価（円）
  created_at: string
  updated_at: string
}

// 個人別月次目標
export interface UserMonthlyTarget {
  id: string
  year_month: string // 例: '2026-01'
  user_id: string
  sales_budget: number // 売上予算（円）
  interview_target: number // 面接設定目標
  contract_target: number // 成約件数目標
  created_at: string
  updated_at: string
}

export interface UserMonthlyTargetWithRelations extends UserMonthlyTarget {
  user?: User
}


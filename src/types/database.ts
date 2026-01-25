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

// 求職者ステータス
export type CandidateStatus =
  | 'new' // 新規
  | 'contacting' // 連絡中
  | 'first_contact_done' // 初回済み
  | 'proposing' // 提案中
  | 'interviewing' // 面接中
  | 'offer' // 内定
  | 'closed_won' // 成約
  | 'closed_lost' // NG
  | 'pending' // 追客中
  | 'on_hold' // 意向回収

// 案件（選考プロセス）
export interface Project {
  id: string
  candidate_id: string
  client_name: string // 園名/法人名
  phase: ProjectPhase
  expected_amount: number | null // ヨミ金額
  probability: 'A' | 'B' | 'C' | null // 確度
  expected_entry_date: string | null // 入職予定時期
  note: string | null
  created_at: string
  updated_at: string
}

// 案件フェーズ
export type ProjectPhase =
  | 'proposed' // 提案済
  | 'document_screening' // 書類選考中
  | 'interview_scheduled' // 面接予定
  | 'interviewing' // 面接中
  | 'offer' // 内定
  | 'accepted' // 入社確定
  | 'rejected' // 不採用
  | 'withdrawn' // 辞退

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
  created_at: string
}

export type InterviewType =
  | 'first_meeting' // 初回面談
  | 'interview' // 面接
  | 'tour' // 見学
  | 'second_interview' // 二次面接
  | 'final_interview' // 最終面接

export type InterviewStatus =
  | 'scheduled' // 予定
  | 'completed' // 完了
  | 'cancelled' // キャンセル
  | 'rescheduling' // リスケ中

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


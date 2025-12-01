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
  created_at: string
}

// 媒体マスタ
export interface Source {
  id: string
  name: string // 媒体名
  category: string | null // カテゴリ（求人版, LINE, バイトル等）
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


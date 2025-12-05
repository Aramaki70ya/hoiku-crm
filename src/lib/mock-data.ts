/**
 * モックデータ
 * Supabase接続前のUI確認用
 */

import type { Candidate, Project, Interview, User, Source } from '@/types/database'

export const mockUsers: User[] = [
  { id: '1', email: 'takizawa@example.com', name: '瀧澤', role: 'user', created_at: '2024-01-01' },
  { id: '2', email: 'otsuka@example.com', name: '大塚', role: 'user', created_at: '2024-01-01' },
  { id: '3', email: 'nishida@example.com', name: '西田', role: 'user', created_at: '2024-01-01' },
  { id: '4', email: 'suzuki@example.com', name: '鈴木', role: 'user', created_at: '2024-01-01' },
  { id: '5', email: 'matsuzawa@example.com', name: '松澤', role: 'user', created_at: '2024-01-01' },
  { id: '6', email: 'tobe@example.com', name: '戸部', role: 'user', created_at: '2024-01-01' },
  { id: '7', email: 'goto@example.com', name: '後藤', role: 'user', created_at: '2024-01-01' },
  { id: '8', email: 'koaze@example.com', name: '小畦', role: 'user', created_at: '2024-01-01' },
  { id: '9', email: 'yoshida@example.com', name: '吉田', role: 'user', created_at: '2024-01-01' },
  { id: '10', email: 'ishii@example.com', name: '石井', role: 'admin', created_at: '2024-01-01' },
]

// 1課メンバー
export const team1Members = ['1', '6', '2', '5'] // 瀧澤, 戸部, 大塚, 松澤
// 2課メンバー
export const team2Members = ['3', '4', '7', '8', '9'] // 西田, 鈴木, 後藤, 小畦, 吉田

export const mockSources: Source[] = [
  { id: '1', name: 'LINE', category: 'SNS' },
  { id: '2', name: 'バイトル', category: '求人サイト' },
  { id: '3', name: '求人版', category: '自社メディア' },
  { id: '4', name: 'スタンバイ（求人版）', category: '求人サイト' },
  { id: '5', name: 'グーグル（求人版）', category: '検索' },
  { id: '6', name: 'ジョブカン（SGL）', category: '求人サイト' },
  { id: '7', name: 'Q-mate（indeed）', category: '求人サイト' },
  { id: '8', name: '個人掘起こし', category: '自社' },
]

export const mockCandidates: Candidate[] = [
  {
    id: '20206444',
    name: '樋口 佳菜子',
    kana: 'ヒグチ カナコ',
    phone: '08067135100',
    email: 'h0n0kait0@icloud.com',
    birth_date: '1990-12-26',
    age: 34,
    prefecture: '神奈川県',
    address: '藤沢市本鵠沼1-7-25',
    qualification: '正看護師',
    desired_employment_type: '正社員, パート',
    desired_job_type: '看護師',
    status: 'interviewing',
    source_id: '1',
    registered_at: '2025-11-11',
    consultant_id: '1',
    memo: '面接確定済み 11/28 鵠沼げんきっず保育園',
    created_at: '2025-11-11T00:00:00Z',
    updated_at: '2025-11-25T00:00:00Z',
  },
  {
    id: '20206517',
    name: '吉 怜美',
    kana: 'ヨシ レイミ',
    phone: '09053890990',
    email: 'rayme3103@gmail.com',
    birth_date: '1984-08-11',
    age: 41,
    prefecture: '大阪府',
    address: '大阪市住之江区安立',
    qualification: '保育士',
    desired_employment_type: '正社員',
    desired_job_type: '保育士',
    status: 'interviewing',
    source_id: '2',
    registered_at: '2025-11-23',
    consultant_id: '1',
    memo: '面接確定済み 12/2 東よさみ幼稚園 インターナショナル希望',
    created_at: '2025-11-23T00:00:00Z',
    updated_at: '2025-11-25T00:00:00Z',
  },
  {
    id: '20206512',
    name: '正木 沙知',
    kana: 'マサキ サチ',
    phone: '09059747685',
    email: 'sachi230623_ylym8y@message.kyujinbox.com',
    birth_date: '1986-06-23',
    age: 39,
    prefecture: '大阪府',
    address: '高槻市',
    qualification: '栄養士',
    desired_employment_type: 'パート',
    desired_job_type: '栄養士',
    status: 'interviewing',
    source_id: '2',
    registered_at: '2025-11-21',
    consultant_id: '1',
    memo: '面接確定済み 11/28 日吉台保育園',
    created_at: '2025-11-21T00:00:00Z',
    updated_at: '2025-11-25T00:00:00Z',
  },
  {
    id: '20206510',
    name: '河島 典子',
    kana: 'カワシマ ノリコ',
    phone: '08035293634',
    email: 'norikokawashima87@gmail.com',
    birth_date: null,
    age: 58,
    prefecture: '千葉県',
    address: '我孫子市久寺家1-9-17',
    qualification: '保育士',
    desired_employment_type: '正社員',
    desired_job_type: '園長職',
    status: 'first_contact_done',
    source_id: '4',
    registered_at: '2025-11-21',
    consultant_id: '4',
    memo: '役職希望・1時間以内',
    created_at: '2025-11-21T00:00:00Z',
    updated_at: '2025-11-25T00:00:00Z',
  },
  {
    id: '20206520',
    name: '園生 由',
    kana: 'ソノオ ユイ',
    phone: '08045030032',
    email: 'yui_al8179@yahoo.co.jp',
    birth_date: null,
    age: 28,
    prefecture: '神奈川県',
    address: '藤沢市',
    qualification: '正看護師',
    desired_employment_type: '正社員',
    desired_job_type: '看護師, 保育士',
    status: 'first_contact_done',
    source_id: '6',
    registered_at: '2025-11-25',
    consultant_id: '4',
    memo: null,
    created_at: '2025-11-25T00:00:00Z',
    updated_at: '2025-11-25T00:00:00Z',
  },
  {
    id: '20206295',
    name: '角田 智美',
    kana: 'ツノダ トモミ',
    phone: '09055274694',
    email: 'ao.tomo16@icloud.com',
    birth_date: '1988-12-18',
    age: 36,
    prefecture: '東京都',
    address: '東村山市富士見町４－８－３２',
    qualification: '保育士, 幼稚園教諭',
    desired_employment_type: '正社員',
    desired_job_type: '保育士',
    status: 'closed_won',
    source_id: '4',
    registered_at: '2025-10-17',
    consultant_id: '4',
    memo: '成約済み エメット保育園',
    created_at: '2025-10-17T00:00:00Z',
    updated_at: '2025-11-20T00:00:00Z',
  },
  {
    id: '20206257',
    name: '平山 加奈子',
    kana: 'ヒラヤマ カナコ',
    phone: '09075721803',
    email: 'tjm.gwkfc02@ezweb.ne.jp',
    birth_date: null,
    age: 33,
    prefecture: '徳島県',
    address: '徳島市国府町早淵158-1',
    qualification: '保育士, 幼稚園教諭, 児童発達支援管理責任者, 児童指導員',
    desired_employment_type: '正社員',
    desired_job_type: '保育士',
    status: 'closed_won',
    source_id: '5',
    registered_at: '2025-10-14',
    consultant_id: '3',
    memo: '成約済み ニチイキッズこくふ保育園',
    created_at: '2025-10-14T00:00:00Z',
    updated_at: '2025-11-10T00:00:00Z',
  },
  {
    id: '20206533',
    name: '立木 妙子',
    kana: 'タテキ タエコ',
    phone: '08020160403',
    email: 'chopper5843@icloud.com',
    birth_date: '1983-04-03',
    age: 42,
    prefecture: '東京都',
    address: '西東京市ひばりが丘',
    qualification: '保育士',
    desired_employment_type: '正社員',
    desired_job_type: '保育士',
    status: 'first_contact_done',
    source_id: '4',
    registered_at: '2025-11-27',
    consultant_id: '9',
    memo: null,
    created_at: '2025-11-27T00:00:00Z',
    updated_at: '2025-11-27T00:00:00Z',
  },
  // 追加データ（より多くのステータスをカバー）
  {
    id: '20206401',
    name: '山田 花子',
    kana: 'ヤマダ ハナコ',
    phone: '09012345678',
    email: 'hanako@example.com',
    birth_date: '1992-05-15',
    age: 32,
    prefecture: '東京都',
    address: '世田谷区',
    qualification: '保育士',
    desired_employment_type: '正社員',
    desired_job_type: '保育士',
    status: 'new',
    source_id: '1',
    registered_at: '2025-11-26',
    consultant_id: '1',
    memo: null,
    created_at: '2025-11-26T00:00:00Z',
    updated_at: '2025-11-26T00:00:00Z',
  },
  {
    id: '20206402',
    name: '佐藤 美咲',
    kana: 'サトウ ミサキ',
    phone: '09087654321',
    email: 'misaki@example.com',
    birth_date: '1995-03-20',
    age: 29,
    prefecture: '神奈川県',
    address: '横浜市',
    qualification: '保育士, 幼稚園教諭',
    desired_employment_type: 'パート',
    desired_job_type: '保育士',
    status: 'contacting',
    source_id: '2',
    registered_at: '2025-11-25',
    consultant_id: '2',
    memo: '電話連絡中',
    created_at: '2025-11-25T00:00:00Z',
    updated_at: '2025-11-26T00:00:00Z',
  },
  {
    id: '20206403',
    name: '田中 優子',
    kana: 'タナカ ユウコ',
    phone: '08011112222',
    email: 'yuko@example.com',
    birth_date: '1988-11-08',
    age: 36,
    prefecture: '埼玉県',
    address: 'さいたま市',
    qualification: '保育士',
    desired_employment_type: '正社員',
    desired_job_type: '保育士',
    status: 'proposing',
    source_id: '3',
    registered_at: '2025-11-20',
    consultant_id: '6',
    memo: '提案中：みらい保育園',
    created_at: '2025-11-20T00:00:00Z',
    updated_at: '2025-11-25T00:00:00Z',
  },
  {
    id: '20206404',
    name: '鈴木 真理',
    kana: 'スズキ マリ',
    phone: '09033334444',
    email: 'mari@example.com',
    birth_date: '1990-07-25',
    age: 34,
    prefecture: '千葉県',
    address: '船橋市',
    qualification: '保育士',
    desired_employment_type: '正社員',
    desired_job_type: '保育士',
    status: 'offer',
    source_id: '4',
    registered_at: '2025-11-10',
    consultant_id: '6',
    memo: '内定：ひまわり保育園',
    created_at: '2025-11-10T00:00:00Z',
    updated_at: '2025-11-24T00:00:00Z',
  },
  {
    id: '20206405',
    name: '高橋 愛',
    kana: 'タカハシ アイ',
    phone: '08055556666',
    email: 'ai@example.com',
    birth_date: '1993-01-12',
    age: 31,
    prefecture: '東京都',
    address: '練馬区',
    qualification: '保育士',
    desired_employment_type: '正社員',
    desired_job_type: '保育士',
    status: 'closed_lost',
    source_id: '5',
    registered_at: '2025-11-05',
    consultant_id: '5',
    memo: '他社で決定',
    created_at: '2025-11-05T00:00:00Z',
    updated_at: '2025-11-20T00:00:00Z',
  },
  {
    id: '20206406',
    name: '伊藤 さくら',
    kana: 'イトウ サクラ',
    phone: '09077778888',
    email: 'sakura@example.com',
    birth_date: '1997-04-01',
    age: 27,
    prefecture: '東京都',
    address: '杉並区',
    qualification: '保育士',
    desired_employment_type: 'パート',
    desired_job_type: '保育士',
    status: 'pending',
    source_id: '6',
    registered_at: '2025-10-28',
    consultant_id: '5',
    memo: '来年4月希望',
    created_at: '2025-10-28T00:00:00Z',
    updated_at: '2025-11-15T00:00:00Z',
  },
]

export const mockProjects: Project[] = [
  {
    id: 'p1',
    candidate_id: '20206444',
    client_name: '鵠沼げんきっず保育園',
    phase: 'interview_scheduled',
    expected_amount: 300000,
    probability: 'A',
    expected_entry_date: '2026-01-01',
    note: null,
    created_at: '2025-11-20T00:00:00Z',
    updated_at: '2025-11-25T00:00:00Z',
  },
  {
    id: 'p2',
    candidate_id: '20206517',
    client_name: '東よさみ幼稚園',
    phase: 'interview_scheduled',
    expected_amount: 300000,
    probability: 'A',
    expected_entry_date: '2026-01-01',
    note: 'インターナショナル希望',
    created_at: '2025-11-24T00:00:00Z',
    updated_at: '2025-11-25T00:00:00Z',
  },
  {
    id: 'p3',
    candidate_id: '20206295',
    client_name: 'エメット保育園',
    phase: 'accepted',
    expected_amount: 600000,
    probability: 'A',
    expected_entry_date: '2025-12-01',
    note: null,
    created_at: '2025-10-20T00:00:00Z',
    updated_at: '2025-11-15T00:00:00Z',
  },
  {
    id: 'p4',
    candidate_id: '20206257',
    client_name: 'ニチイキッズこくふ保育園',
    phase: 'accepted',
    expected_amount: 550000,
    probability: 'A',
    expected_entry_date: '2025-12-01',
    note: null,
    created_at: '2025-10-15T00:00:00Z',
    updated_at: '2025-11-10T00:00:00Z',
  },
  {
    id: 'p5',
    candidate_id: '20206403',
    client_name: 'みらい保育園',
    phase: 'proposed',
    expected_amount: 400000,
    probability: 'B',
    expected_entry_date: '2026-01-01',
    note: null,
    created_at: '2025-11-22T00:00:00Z',
    updated_at: '2025-11-25T00:00:00Z',
  },
  {
    id: 'p6',
    candidate_id: '20206404',
    client_name: 'ひまわり保育園',
    phase: 'offer',
    expected_amount: 500000,
    probability: 'A',
    expected_entry_date: '2026-01-01',
    note: null,
    created_at: '2025-11-15T00:00:00Z',
    updated_at: '2025-11-24T00:00:00Z',
  },
  {
    id: 'p7',
    candidate_id: '20206512',
    client_name: '日吉台保育園',
    phase: 'interview_scheduled',
    expected_amount: 300000,
    probability: 'B',
    expected_entry_date: '2026-01-01',
    note: null,
    created_at: '2025-11-25T00:00:00Z',
    updated_at: '2025-11-25T00:00:00Z',
  },
]

export const mockInterviews: Interview[] = [
  {
    id: 'i1',
    project_id: 'p1',
    type: 'interview',
    start_at: '2025-11-28T10:00:00Z',
    end_at: '2025-11-28T11:00:00Z',
    location: '鵠沼げんきっず保育園',
    status: 'scheduled',
    feedback: null,
    created_at: '2025-11-20T00:00:00Z',
  },
  {
    id: 'i2',
    project_id: 'p2',
    type: 'interview',
    start_at: '2025-12-02T14:00:00Z',
    end_at: '2025-12-02T15:00:00Z',
    location: '東よさみ幼稚園',
    status: 'scheduled',
    feedback: null,
    created_at: '2025-11-24T00:00:00Z',
  },
  {
    id: 'i3',
    project_id: 'p7',
    type: 'interview',
    start_at: '2025-11-28T14:00:00Z',
    end_at: '2025-11-28T15:00:00Z',
    location: '日吉台保育園',
    status: 'scheduled',
    feedback: null,
    created_at: '2025-11-25T00:00:00Z',
  },
  {
    id: 'i4',
    project_id: 'p3',
    type: 'interview',
    start_at: '2025-11-15T10:00:00Z',
    end_at: '2025-11-15T11:00:00Z',
    location: 'エメット保育園',
    status: 'completed',
    feedback: '好印象。即内定',
    created_at: '2025-11-10T00:00:00Z',
  },
  {
    id: 'i5',
    project_id: 'p4',
    type: 'interview',
    start_at: '2025-11-08T13:00:00Z',
    end_at: '2025-11-08T14:00:00Z',
    location: 'ニチイキッズこくふ保育園',
    status: 'completed',
    feedback: '経験豊富で即戦力。内定',
    created_at: '2025-11-05T00:00:00Z',
  },
  {
    id: 'i6',
    project_id: 'p6',
    type: 'interview',
    start_at: '2025-11-20T11:00:00Z',
    end_at: '2025-11-20T12:00:00Z',
    location: 'ひまわり保育園',
    status: 'completed',
    feedback: '内定。入社意思確認中',
    created_at: '2025-11-18T00:00:00Z',
  },
]

// ステータスの日本語表示
export const statusLabels: Record<string, string> = {
  new: '新規',
  contacting: '連絡中',
  first_contact_done: '初回済み',
  proposing: '提案中',
  interviewing: '面接中',
  offer: '内定',
  closed_won: '成約',
  closed_lost: 'NG',
  pending: '追客中',
  on_hold: '意向回収',
}

// プロセスステータス（ダッシュボード用）
export const processStatusLabels: Record<string, string> = {
  new: 'リード管理',
  contacting: 'リード管理',
  first_contact_done: '面談フェーズ',
  proposing: '提案フェーズ',
  interviewing: '面接フェーズ',
  offer: '内定確認中',
  closed_won: '内定承諾',
  closed_lost: 'フォロー・ロスト',
  pending: 'フォロー・ロスト',
  on_hold: 'フォロー・ロスト',
}

// ステータスの色（明るいテーマ用）
export const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  contacting: 'bg-amber-100 text-amber-700 border-amber-200',
  first_contact_done: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  proposing: 'bg-purple-100 text-purple-700 border-purple-200',
  interviewing: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  offer: 'bg-pink-100 text-pink-700 border-pink-200',
  closed_won: 'bg-green-100 text-green-700 border-green-200',
  closed_lost: 'bg-red-100 text-red-700 border-red-200',
  pending: 'bg-orange-100 text-orange-700 border-orange-200',
  on_hold: 'bg-slate-100 text-slate-700 border-slate-200',
}

// 面接ステータスの色
export const interviewStatusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  cancelled: 'bg-red-100 text-red-700 border-red-200',
  rescheduling: 'bg-amber-100 text-amber-700 border-amber-200',
}

export const interviewStatusLabels: Record<string, string> = {
  scheduled: '予定',
  completed: '完了',
  cancelled: 'キャンセル',
  rescheduling: 'リスケ中',
}

// メンバー別予算・実績データ
export interface MemberStats {
  userId: string
  budget: number // 売上予算
  sales: number // 成約額
  meetingTarget: number // 面談設定目標
  meetingCount: number // 面談設定数
  yomiA: number // Aヨミ（当月）
  yomiB: number // Bヨミ（当月）
  yomiC: number // Cヨミ（当月）
  yomiD: number // Dヨミ（当月）
  yomiANext: number // Aヨミ（翌月）
  yomiBNext: number // Bヨミ（翌月）
  yomiCNext: number // Cヨミ（翌月）
  yomiDNext: number // Dヨミ（翌月）
}

export const mockMemberStats: MemberStats[] = [
  // 1課
  { userId: '1', budget: 3000000, sales: 0, meetingTarget: 8, meetingCount: 0, yomiA: 600000, yomiB: 400000, yomiC: 200000, yomiD: 0, yomiANext: 0, yomiBNext: 0, yomiCNext: 0, yomiDNext: 0 },
  { userId: '6', budget: 3000000, sales: 1650000, meetingTarget: 8, meetingCount: 0, yomiA: 500000, yomiB: 300000, yomiC: 100000, yomiD: 0, yomiANext: 0, yomiBNext: 0, yomiCNext: 0, yomiDNext: 0 },
  { userId: '2', budget: 3000000, sales: 0, meetingTarget: 8, meetingCount: 0, yomiA: 0, yomiB: 400000, yomiC: 0, yomiD: 0, yomiANext: 0, yomiBNext: 0, yomiCNext: 0, yomiDNext: 0 },
  { userId: '5', budget: 3000000, sales: 0, meetingTarget: 8, meetingCount: 0, yomiA: 0, yomiB: 0, yomiC: 300000, yomiD: 0, yomiANext: 600000, yomiBNext: 400000, yomiCNext: 200000, yomiDNext: 100000 },
  // 2課
  { userId: '3', budget: 3500000, sales: 550000, meetingTarget: 8, meetingCount: 2, yomiA: 0, yomiB: 0, yomiC: 0, yomiD: 0, yomiANext: 0, yomiBNext: 0, yomiCNext: 0, yomiDNext: 0 },
  { userId: '4', budget: 3500000, sales: 600000, meetingTarget: 8, meetingCount: 3, yomiA: 0, yomiB: 0, yomiC: 0, yomiD: 0, yomiANext: 0, yomiBNext: 0, yomiCNext: 0, yomiDNext: 0 },
  { userId: '7', budget: 3000000, sales: 0, meetingTarget: 8, meetingCount: 0, yomiA: 0, yomiB: 0, yomiC: 0, yomiD: 0, yomiANext: 0, yomiBNext: 0, yomiCNext: 0, yomiDNext: 0 },
  { userId: '8', budget: 3000000, sales: 0, meetingTarget: 8, meetingCount: 1, yomiA: 0, yomiB: 0, yomiC: 0, yomiD: 0, yomiANext: 0, yomiBNext: 0, yomiCNext: 0, yomiDNext: 0 },
  { userId: '9', budget: 3000000, sales: 0, meetingTarget: 8, meetingCount: 0, yomiA: 0, yomiB: 0, yomiC: 0, yomiD: 0, yomiANext: 0, yomiBNext: 0, yomiCNext: 0, yomiDNext: 0 },
]

// 全体予算
export const totalBudget = 29000000

// 目標数値の前提条件
export const kpiAssumptions = {
  interviewToClosedRate: 0.60, // 面接人数からの成約率 60%
  firstContactToInterviewRate: 0.80, // 初回ヒアリングからの面接率 80%
  registrationToFirstContactRate: 0.65, // 登録からの初回ヒアリング率 65%
  revenuePerClosed: 600000, // 成約者一人当たりの単価 60万円
}

// 優先度ラベル
export const priorityLabels: Record<string, string> = {
  S: '最優先',
  A: '高',
  B: '中',
  C: '低',
}

export const priorityColors: Record<string, string> = {
  S: 'bg-rose-100 text-rose-700 border-rose-200',
  A: 'bg-orange-100 text-orange-700 border-orange-200',
  B: 'bg-blue-100 text-blue-700 border-blue-200',
  C: 'bg-slate-100 text-slate-700 border-slate-200',
}

// 登録経路による優先度自動判定ルール
export const sourcePriorityRules: Record<string, string> = {
  '1': 'S', // LINE → S
  '2': 'A', // バイトル → A
  '3': 'A', // 求人版 → A
  '4': 'B', // スタンバイ → B
  '5': 'B', // グーグル → B
  '6': 'A', // ジョブカン → A
  '7': 'B', // Q-mate → B
  '8': 'S', // 個人掘起こし → S
}

// 求職者優先度・コメント情報
export interface CandidatePriority {
  candidateId: string
  priority: 'S' | 'A' | 'B' | 'C'
  taskComment: string | null
  lastUpdated: string
}

export const mockCandidatePriorities: CandidatePriority[] = [
  { candidateId: '20206444', priority: 'S', taskComment: '本日面接確認の電話必須', lastUpdated: '2025-11-28' },
  { candidateId: '20206517', priority: 'S', taskComment: '12/2面接前の最終確認', lastUpdated: '2025-11-28' },
  { candidateId: '20206512', priority: 'S', taskComment: '本日面接！事前連絡済み', lastUpdated: '2025-11-28' },
  { candidateId: '20206510', priority: 'A', taskComment: '求人提案中、返答待ち', lastUpdated: '2025-11-27' },
  { candidateId: '20206520', priority: 'A', taskComment: '希望条件ヒアリング済み、案件探し中', lastUpdated: '2025-11-26' },
  { candidateId: '20206533', priority: 'A', taskComment: '初回ヒアリング完了、提案準備', lastUpdated: '2025-11-27' },
  { candidateId: '20206401', priority: 'S', taskComment: '新規登録！本日中に初回連絡', lastUpdated: '2025-11-28' },
  { candidateId: '20206402', priority: 'B', taskComment: '電話つながらず、明日再連絡', lastUpdated: '2025-11-26' },
  { candidateId: '20206403', priority: 'A', taskComment: '提案中、園見学の日程調整', lastUpdated: '2025-11-25' },
  { candidateId: '20206404', priority: 'S', taskComment: '内定！入社意思確認急ぎ', lastUpdated: '2025-11-24' },
  { candidateId: '20206405', priority: 'C', taskComment: '他社決定、フォロー終了', lastUpdated: '2025-11-20' },
  { candidateId: '20206406', priority: 'C', taskComment: '来年4月希望、定期フォロー', lastUpdated: '2025-11-15' },
  { candidateId: '20206295', priority: 'C', taskComment: '成約済み、入社フォロー', lastUpdated: '2025-11-20' },
  { candidateId: '20206257', priority: 'C', taskComment: '成約済み、入社フォロー', lastUpdated: '2025-11-10' },
]

-- Hoiku CRM データベーススキーマ
-- Supabaseの SQL Editor で実行してください

-- 拡張機能
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. ユーザーテーブル（コンサルタント）
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. 媒体マスタ
-- ========================================
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT
);

-- 初期データ投入（よく使う媒体）
INSERT INTO sources (name, category) VALUES
  ('LINE', 'SNS'),
  ('バイトル', '求人サイト'),
  ('求人版', '自社メディア'),
  ('スタンバイ（求人版）', '求人サイト'),
  ('グーグル（求人版）', '検索'),
  ('ジョブカン（SGL）', '求人サイト'),
  ('ジョブカン（女性）', '求人サイト'),
  ('Q-mate（indeed）', '求人サイト'),
  ('Q-mate（求人ボックス）', '求人サイト'),
  ('求人ボックス（求人版）', '求人サイト'),
  ('求人ボックス（サポーター）', '求人サイト'),
  ('NAVIS', '求人サイト'),
  ('アイデム', '求人サイト'),
  ('お祝い勤', '求人サイト'),
  ('ほいくis', '求人サイト'),
  ('エントリーポケット', '求人サイト'),
  ('個人掘起こし', '自社'),
  ('受電', '自社'),
  ('LP', '自社'),
  ('SMS', '自社'),
  ('その他', 'その他')
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 3. 求職者マスタ
-- ========================================
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY, -- 20206138形式（既存ルール踏襲）
  name TEXT NOT NULL,
  kana TEXT,
  phone TEXT,
  email TEXT,
  birth_date DATE,
  age INTEGER,
  prefecture TEXT,
  address TEXT,
  qualification TEXT, -- カンマ区切り
  desired_employment_type TEXT, -- 正社員, パート等
  desired_job_type TEXT, -- 保育士, 栄養士等
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'contacting', 'first_contact_done', 'proposing',
    'interviewing', 'offer', 'closed_won', 'closed_lost', 'pending', 'on_hold'
  )),
  source_id UUID REFERENCES sources(id),
  registered_at DATE,
  consultant_id UUID REFERENCES users(id),
  approach_priority TEXT CHECK (approach_priority IN ('S', 'A', 'B', 'C')), -- アプローチ優先度（タスク画面用）
  rank TEXT CHECK (rank IN ('S', 'A', 'B', 'C')), -- ランク（求職者管理画面用）
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 更新時にupdated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 4. 案件テーブル（選考プロセス）
-- ========================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL, -- 園名/法人名（互換用）
  corporation_name TEXT, -- 法人名
  garden_name TEXT, -- 園名
  phase TEXT NOT NULL DEFAULT 'proposed' CHECK (phase IN (
    'proposed', 'document_screening', 'interview_scheduled',
    'interviewing', 'offer', 'accepted', 'rejected', 'withdrawn'
  )),
  expected_amount INTEGER, -- ヨミ金額
  probability TEXT CHECK (probability IN ('A', 'B', 'C')),
  expected_entry_date DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. 面接・面談ログ
-- ========================================
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'first_meeting', 'interview', 'tour', 'second_interview', 'final_interview'
  )),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'completed', 'cancelled', 'rescheduling'
  )),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 6. Row Level Security (RLS) の設定
-- ========================================

-- RLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは全データを閲覧可能（将来的に担当者制限を追加）
CREATE POLICY "Authenticated users can view all users"
  ON users FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all sources"
  ON sources FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all candidates"
  ON candidates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert candidates"
  ON candidates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update candidates"
  ON candidates FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all projects"
  ON projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects"
  ON projects FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view all interviews"
  ON interviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert interviews"
  ON interviews FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update interviews"
  ON interviews FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete interviews"
  ON interviews FOR DELETE TO authenticated USING (true);

-- ========================================
-- 7. 成約テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  accepted_date DATE NOT NULL, -- 承諾日
  employment_restriction_until DATE, -- 転職勧奨禁止期間
  employment_type TEXT, -- 雇用形態（正社員、パート等）
  job_type TEXT, -- 職種（保育士、栄養士等）
  revenue_excluding_tax INTEGER NOT NULL, -- 売上（税抜）
  revenue_including_tax INTEGER NOT NULL, -- 売上（税込）
  payment_date DATE, -- 入金日
  invoice_sent_date DATE, -- 請求書発送日
  calculation_basis TEXT, -- 算出根拠（例：3,438,000円×20%）
  document_url TEXT, -- 格納先URL
  placement_company TEXT, -- 入職先（園名/法人名）
  note TEXT, -- 備考
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLSを有効化
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all contracts"
  ON contracts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contracts"
  ON contracts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contracts"
  ON contracts FOR UPDATE TO authenticated USING (true);

-- ========================================
-- 8. インデックス
-- ========================================
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_consultant ON candidates(consultant_id);
CREATE INDEX IF NOT EXISTS idx_candidates_registered ON candidates(registered_at);
CREATE INDEX IF NOT EXISTS idx_projects_candidate ON projects(candidate_id);
CREATE INDEX IF NOT EXISTS idx_projects_phase ON projects(phase);
CREATE INDEX IF NOT EXISTS idx_interviews_project ON interviews(project_id);
CREATE INDEX IF NOT EXISTS idx_interviews_start ON interviews(start_at);
CREATE INDEX IF NOT EXISTS idx_contracts_candidate ON contracts(candidate_id);
CREATE INDEX IF NOT EXISTS idx_contracts_accepted_date ON contracts(accepted_date);
CREATE INDEX IF NOT EXISTS idx_contracts_payment_date ON contracts(payment_date);


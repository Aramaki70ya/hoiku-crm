-- Hoiku CRM 拡張スキーマ（スプレッドシート構造を反映）
-- 既存のschema.sqlとschema_additional.sqlに追加する内容

-- ========================================
-- 18. 面接管理テーブル（数値管理シート用）
-- ========================================
CREATE TABLE IF NOT EXISTS interview_management (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  consultant_id UUID REFERENCES users(id),
  probability TEXT CHECK (probability IN ('A', 'B', 'C')), -- 確度（A, B, C）
  probability_percentage INTEGER, -- 確度パーセンテージ（30%, 50%等）
  employment_type TEXT, -- 雇用形態
  job_type TEXT, -- 職種
  commission_rate INTEGER, -- 手数料率（%）
  expected_period TEXT, -- 時期（1月頃、次年度4月等）
  area TEXT, -- エリア
  interview_date DATE, -- 面接日
  garden_name TEXT, -- 園名
  corporation_name TEXT, -- 法人名
  concurrent_application BOOLEAN DEFAULT false, -- 併願
  contract_rate INTEGER, -- 契約書（%）
  concurrent_status TEXT, -- 併願の状況
  interview_practice BOOLEAN DEFAULT false, -- 面接練習
  strategy TEXT, -- 戦略
  candidate_notes TEXT, -- 本人メモ
  corporation_notes TEXT, -- 法人メモ
  interview_result TEXT, -- 面接後の詳細
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_management_candidate ON interview_management(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_management_consultant ON interview_management(consultant_id);
CREATE INDEX IF NOT EXISTS idx_interview_management_interview_date ON interview_management(interview_date);

CREATE TRIGGER update_interview_management_updated_at
  BEFORE UPDATE ON interview_management
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE interview_management ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all interview_management"
  ON interview_management FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert interview_management"
  ON interview_management FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update interview_management"
  ON interview_management FOR UPDATE TO authenticated USING (true);

-- ========================================
-- 19. 求職者詳細情報テーブル（求職者管理シート用）
-- ========================================
CREATE TABLE IF NOT EXISTS candidate_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE UNIQUE,
  first_meeting_date DATE, -- 初回面談日
  experience TEXT, -- 経験（カンマ区切りまたはJSONB）
  desired_salary TEXT, -- 給与希望
  desired_children_count TEXT, -- 園児数希望
  desired_working_hours TEXT, -- 勤務時間その他
  proposed_gardens TEXT, -- 提案園（カンマ区切り）
  first_contact_done BOOLEAN DEFAULT false, -- 初回
  first_contact_date DATE, -- 初回面談日
  first_contact_score INTEGER, -- 初回点数
  ac_done BOOLEAN DEFAULT false, -- AC
  proposal_done BOOLEAN DEFAULT false, -- 提案
  first_proposal_date DATE, -- 初提案日
  batch_done BOOLEAN DEFAULT false, -- 一括
  batch_completion_date DATE, -- 一括完了日
  partnership_started BOOLEAN DEFAULT false, -- 提携開始
  partnership_start_date DATE, -- 提携開始日
  partnership_completed BOOLEAN DEFAULT false, -- 提携完了
  partnership_completion_date DATE, -- 提携完了日
  development_started BOOLEAN DEFAULT false, -- 開拓開始
  development_start_date DATE, -- 開拓開始日
  development_completed BOOLEAN DEFAULT false, -- 開拓完了
  development_completion_date DATE, -- 開拓完了日
  speed_score INTEGER, -- スピード
  volume_score INTEGER, -- ボリューム
  intention_obtained BOOLEAN DEFAULT false, -- 意向獲得
  intention_obtained_date DATE, -- 意向獲得日
  interview_date DATE, -- 面接日
  closing_probability TEXT, -- 成約確度
  concurrent_setting BOOLEAN DEFAULT false, -- 併願設定
  interview_preparation BOOLEAN DEFAULT false, -- 面接対策
  pre_interview_followup BOOLEAN DEFAULT false, -- 面接前フォロー
  preparation_score INTEGER, -- 対策点数
  interview_result TEXT, -- 合否
  acceptance_date DATE, -- 承諾日
  factor_analysis TEXT, -- 要因分析
  closing_notes TEXT, -- クロージング
  followup_core TEXT, -- 追客コア
  followup_deadline DATE, -- 追客期限
  response_score INTEGER, -- 対応点数
  days_first_to_batch INTEGER, -- 初回→一括（日数）
  days_first_to_proposal INTEGER, -- 初回→提案（日数）
  days_proposal_to_intention INTEGER, -- 提案→意向（日数）
  days_intention_to_interview INTEGER, -- 意向→面接（日数）
  resignation_status TEXT, -- 退職状況
  resignation_reason TEXT, -- 退職理由
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_details_candidate ON candidate_details(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_details_first_meeting ON candidate_details(first_meeting_date);

CREATE TRIGGER update_candidate_details_updated_at
  BEFORE UPDATE ON candidate_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE candidate_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all candidate_details"
  ON candidate_details FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert candidate_details"
  ON candidate_details FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update candidate_details"
  ON candidate_details FOR UPDATE TO authenticated USING (true);

-- ========================================
-- 20. 連絡履歴テーブル（連絡先一覧用）
-- ========================================
CREATE TABLE IF NOT EXISTS contact_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  consultant_id UUID REFERENCES users(id),
  source_id UUID REFERENCES sources(id),
  contact_date DATE NOT NULL,
  day_of_week TEXT, -- 曜日
  contact_time TIME, -- 時間
  phone_reservation TEXT, -- 電話予約
  status TEXT, -- ステータス
  applied_job TEXT, -- 応募・気になる求人
  notes TEXT, -- 備考
  followup_interruption_reason TEXT, -- フォロー中断理由
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_history_candidate ON contact_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_contact_history_date ON contact_history(contact_date DESC);
CREATE INDEX IF NOT EXISTS idx_contact_history_consultant ON contact_history(consultant_id);

ALTER TABLE contact_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all contact_history"
  ON contact_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contact_history"
  ON contact_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contact_history"
  ON contact_history FOR UPDATE TO authenticated USING (true);

-- ========================================
-- 21. 担当者別数値管理テーブル（数値管理シート用）
-- ========================================
CREATE TABLE IF NOT EXISTS consultant_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  consultant_id UUID NOT NULL REFERENCES users(id),
  assignment_date DATE, -- 割り振り日（=入力日）
  lead_source TEXT, -- リード獲得先
  category TEXT, -- カテゴリ
  status_emoji TEXT, -- ステータス（絵文字付き）
  expected_amount_min INTEGER, -- ヨミ金額(MIN)
  expected_probability_current TEXT, -- ヨミ確度(当月)
  expected_probability_next TEXT, -- ヨミ確度(翌月)
  closed_amount INTEGER, -- 成約金額
  interview_flag BOOLEAN DEFAULT false, -- 面接フラグ
  interview_flag_date DATE, -- 面接フラグ日
  closed_date DATE, -- 成約日
  area TEXT, -- エリア
  interview_date DATE, -- 面接日
  job_type TEXT, -- 職種
  entry_period TEXT, -- 入職時期
  garden_name TEXT, -- 園名
  corporation_name TEXT, -- 法人名
  concurrent_application BOOLEAN DEFAULT false, -- 併願
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultant_metrics_candidate ON consultant_metrics(candidate_id);
CREATE INDEX IF NOT EXISTS idx_consultant_metrics_consultant ON consultant_metrics(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_metrics_assignment_date ON consultant_metrics(assignment_date);

CREATE TRIGGER update_consultant_metrics_updated_at
  BEFORE UPDATE ON consultant_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE consultant_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all consultant_metrics"
  ON consultant_metrics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert consultant_metrics"
  ON consultant_metrics FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update consultant_metrics"
  ON consultant_metrics FOR UPDATE TO authenticated USING (true);

-- ========================================
-- 22. 成約データ拡張（成約データシート用）
-- ========================================
-- contractsテーブルに追加するカラム（ALTER TABLEで追加）
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS employment_restriction_until DATE; -- 既存
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS invoice_sent_date DATE; -- 既存
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS calculation_basis TEXT; -- 既存
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS document_url TEXT; -- 既存

-- ========================================
-- 23. 面接予定期限テーブル（動いている人シート用）
-- ========================================
CREATE TABLE IF NOT EXISTS interview_deadlines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  consultant_id UUID REFERENCES users(id),
  priority TEXT CHECK (priority IN ('高', '中', '低')), -- 優先順位
  registration_date DATE, -- 登録日
  interview_deadline DATE, -- 面接設定期限
  category TEXT, -- カテゴリ
  status_emoji TEXT, -- ステータス（絵文字付き）
  interview_flag BOOLEAN DEFAULT false, -- 面接フラグ
  interview_date DATE, -- 面接日
  scheduled_garden TEXT, -- 面接予定園
  expected_amount INTEGER, -- 読み金額
  city TEXT, -- 市町村区以下
  entry_period TEXT, -- 入職時期
  job_type TEXT, -- 職種
  employment_type TEXT, -- 雇用形態
  notes TEXT, -- 備考
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_deadlines_candidate ON interview_deadlines(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_deadlines_consultant ON interview_deadlines(consultant_id);
CREATE INDEX IF NOT EXISTS idx_interview_deadlines_deadline ON interview_deadlines(interview_deadline);

CREATE TRIGGER update_interview_deadlines_updated_at
  BEFORE UPDATE ON interview_deadlines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE interview_deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all interview_deadlines"
  ON interview_deadlines FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert interview_deadlines"
  ON interview_deadlines FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update interview_deadlines"
  ON interview_deadlines FOR UPDATE TO authenticated USING (true);

-- ========================================
-- 24. プロジェクトに日時フィールドを追加
-- ========================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS scheduled_datetime TIMESTAMPTZ; -- 面接予定日時

-- ========================================
-- 25. カテゴリマスタテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初期データ投入
INSERT INTO categories (name, description) VALUES
  ('リード管理', '新規リードの管理'),
  ('面談フェーズ', '初回ヒアリング実施済み'),
  ('提案フェーズ', '求人提案済み'),
  ('面接フェーズ', '面接日程調整中・確定済み'),
  ('内定承諾', '内定承諾済み'),
  ('フォロー・ロスト', '追客中・クローズ'),
  ('意向回収', '意向回収済み')
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all categories"
  ON categories FOR SELECT TO authenticated USING (true);



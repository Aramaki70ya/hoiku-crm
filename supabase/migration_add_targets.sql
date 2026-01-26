-- 月次目標テーブル（全体のKPI目標）
CREATE TABLE IF NOT EXISTS monthly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month VARCHAR(7) NOT NULL, -- 例: '2026-01'
  total_sales_budget BIGINT NOT NULL DEFAULT 0, -- 全体売上予算（円）
  registration_to_first_contact_rate DECIMAL(5,4) DEFAULT 0.65, -- 登録→初回率
  first_contact_to_interview_rate DECIMAL(5,4) DEFAULT 0.80, -- 初回→面接率
  interview_to_closed_rate DECIMAL(5,4) DEFAULT 0.60, -- 面接→成約率
  closed_unit_price BIGINT DEFAULT 600000, -- 成約単価（円）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(year_month)
);

-- 個人別月次目標テーブル
CREATE TABLE IF NOT EXISTS user_monthly_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_month VARCHAR(7) NOT NULL, -- 例: '2026-01'
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sales_budget BIGINT NOT NULL DEFAULT 0, -- 売上予算（円）
  interview_target INT NOT NULL DEFAULT 8, -- 面接設定目標
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(year_month, user_id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_monthly_targets_year_month ON monthly_targets(year_month);
CREATE INDEX IF NOT EXISTS idx_user_monthly_targets_year_month ON user_monthly_targets(year_month);
CREATE INDEX IF NOT EXISTS idx_user_monthly_targets_user_id ON user_monthly_targets(user_id);

-- RLSポリシー
ALTER TABLE monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_monthly_targets ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーは閲覧・編集可能
CREATE POLICY "Authenticated users can view monthly_targets" ON monthly_targets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert monthly_targets" ON monthly_targets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update monthly_targets" ON monthly_targets
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can view user_monthly_targets" ON user_monthly_targets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert user_monthly_targets" ON user_monthly_targets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update user_monthly_targets" ON user_monthly_targets
  FOR UPDATE TO authenticated USING (true);

-- 初期データ（2026年1月）
INSERT INTO monthly_targets (year_month, total_sales_budget, registration_to_first_contact_rate, first_contact_to_interview_rate, interview_to_closed_rate, closed_unit_price)
VALUES ('2026-01', 29000000, 0.65, 0.80, 0.60, 600000)
ON CONFLICT (year_month) DO NOTHING;

-- 個人別初期データ（サンプル）
-- 1課
INSERT INTO user_monthly_targets (year_month, user_id, sales_budget, interview_target)
SELECT '2026-01', id, 3000000, 8 FROM users WHERE name = '瀧澤'
ON CONFLICT (year_month, user_id) DO NOTHING;

INSERT INTO user_monthly_targets (year_month, user_id, sales_budget, interview_target)
SELECT '2026-01', id, 3000000, 8 FROM users WHERE name = '戸部'
ON CONFLICT (year_month, user_id) DO NOTHING;

INSERT INTO user_monthly_targets (year_month, user_id, sales_budget, interview_target)
SELECT '2026-01', id, 3000000, 8 FROM users WHERE name = '大塚'
ON CONFLICT (year_month, user_id) DO NOTHING;

INSERT INTO user_monthly_targets (year_month, user_id, sales_budget, interview_target)
SELECT '2026-01', id, 3000000, 8 FROM users WHERE name = '松澤'
ON CONFLICT (year_month, user_id) DO NOTHING;

-- 2課
INSERT INTO user_monthly_targets (year_month, user_id, sales_budget, interview_target)
SELECT '2026-01', id, 3500000, 8 FROM users WHERE name = '西田'
ON CONFLICT (year_month, user_id) DO NOTHING;

INSERT INTO user_monthly_targets (year_month, user_id, sales_budget, interview_target)
SELECT '2026-01', id, 3500000, 8 FROM users WHERE name = '鈴木'
ON CONFLICT (year_month, user_id) DO NOTHING;

INSERT INTO user_monthly_targets (year_month, user_id, sales_budget, interview_target)
SELECT '2026-01', id, 3000000, 8 FROM users WHERE name = '後藤'
ON CONFLICT (year_month, user_id) DO NOTHING;

INSERT INTO user_monthly_targets (year_month, user_id, sales_budget, interview_target)
SELECT '2026-01', id, 3000000, 8 FROM users WHERE name = '小畦'
ON CONFLICT (year_month, user_id) DO NOTHING;

INSERT INTO user_monthly_targets (year_month, user_id, sales_budget, interview_target)
SELECT '2026-01', id, 3000000, 8 FROM users WHERE name = '吉田'
ON CONFLICT (year_month, user_id) DO NOTHING;

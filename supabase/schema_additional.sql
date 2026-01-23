-- Hoiku CRM 追加テーブルスキーマ
-- 既存のschema.sqlに追加する内容

-- ========================================
-- 9. メモテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS memos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memos_candidate ON memos(candidate_id);
CREATE INDEX IF NOT EXISTS idx_memos_created_at ON memos(created_at DESC);

ALTER TABLE memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all memos"
  ON memos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert memos"
  ON memos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update memos"
  ON memos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete memos"
  ON memos FOR DELETE TO authenticated USING (true);

-- ========================================
-- 10. システム設定テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初期設定データ
INSERT INTO settings (key, value, description) VALUES
  ('total_budget', '29000000', '全体予算（円）'),
  ('kpi_assumptions', '{"interviewToClosedRate": 0.60, "firstContactToInterviewRate": 0.80, "registrationToFirstContactRate": 0.65, "revenuePerClosed": 600000}', 'KPI目標値'),
  ('system_settings', '{"enableNotifications": true, "enableEmailAlerts": false, "defaultPageSize": 50, "sessionTimeout": 30}', 'システム設定')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 管理者のみ設定を変更可能
CREATE POLICY "Authenticated users can view settings"
  ON settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ========================================
-- 11. アプローチ優先度テーブル（タスク画面用）
-- ========================================
CREATE TABLE IF NOT EXISTS approach_priorities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  approach_priority TEXT NOT NULL CHECK (approach_priority IN ('S', 'A', 'B', 'C')),
  task_comment TEXT,
  last_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_approach_priorities_candidate ON approach_priorities(candidate_id);
CREATE INDEX IF NOT EXISTS idx_approach_priorities_priority ON approach_priorities(approach_priority);

CREATE TRIGGER update_approach_priorities_updated_at
  BEFORE UPDATE ON approach_priorities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE approach_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all approach_priorities"
  ON approach_priorities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert approach_priorities"
  ON approach_priorities FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update approach_priorities"
  ON approach_priorities FOR UPDATE TO authenticated USING (true);

-- ========================================
-- 12. 求職者ランクテーブル（求職者管理画面用）
-- ========================================
CREATE TABLE IF NOT EXISTS candidate_ranks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  rank TEXT NOT NULL CHECK (rank IN ('S', 'A', 'B', 'C')),
  last_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_ranks_candidate ON candidate_ranks(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_ranks_rank ON candidate_ranks(rank);

CREATE TRIGGER update_candidate_ranks_updated_at
  BEFORE UPDATE ON candidate_ranks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE candidate_ranks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all candidate_ranks"
  ON candidate_ranks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert candidate_ranks"
  ON candidate_ranks FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update candidate_ranks"
  ON candidate_ranks FOR UPDATE TO authenticated USING (true);

-- ========================================
-- 13. 通知テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('alert', 'info', 'success', 'warning')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  related_candidate_id TEXT REFERENCES candidates(id) ON DELETE SET NULL,
  related_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の通知のみ閲覧可能
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- システムが通知を作成可能（サービスロール）
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT TO service_role WITH CHECK (true);

-- ========================================
-- 14. タイムラインイベントテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'status_change', 'memo_added', 'project_added', 'interview_scheduled',
    'interview_completed', 'contract_created', 'note_added'
  )),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB, -- 追加情報（変更前後のステータス、金額など）
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_events_candidate ON timeline_events(candidate_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_created_at ON timeline_events(candidate_id, created_at DESC);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all timeline_events"
  ON timeline_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert timeline_events"
  ON timeline_events FOR INSERT TO authenticated WITH CHECK (true);

-- ========================================
-- 15. ステータス変更履歴テーブル（リードタイム分析・タイムライン表示用）
-- ========================================
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- 案件に紐づく変更の場合
  old_status TEXT, -- 変更前ステータス
  new_status TEXT NOT NULL, -- 変更後ステータス
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(), -- 変更日時（リードタイム分析用）
  note TEXT -- 備考
);

CREATE INDEX IF NOT EXISTS idx_status_history_candidate ON status_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_status_history_project ON status_history(project_id);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON status_history(candidate_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_new_status ON status_history(new_status); -- ステータス別集計用

ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all status_history"
  ON status_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert status_history"
  ON status_history FOR INSERT TO authenticated WITH CHECK (true);

-- ========================================
-- 15-2. メール送信履歴テーブル（タイムライン表示用）
-- ========================================
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL CHECK (template_type IN (
    'first_contact', -- 初回連絡
    'interview_invitation', -- 面接案内
    'interview_reminder', -- 面接リマインダー
    'offer_notification', -- 内定通知
    'entry_confirmation', -- 入社確認
    'followup', -- フォローアップ
    'other' -- その他
  )),
  subject TEXT NOT NULL, -- 件名
  body TEXT, -- 本文
  to_address TEXT NOT NULL, -- 送信先メールアドレス
  sent_at TIMESTAMPTZ DEFAULT NOW(), -- 送信日時
  sent_by UUID REFERENCES users(id), -- 送信者
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')), -- 送信状態
  error_message TEXT, -- エラーメッセージ（失敗時）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_candidate ON email_logs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(candidate_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_template_type ON email_logs(template_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_by ON email_logs(sent_by);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all email_logs"
  ON email_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert email_logs"
  ON email_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update email_logs"
  ON email_logs FOR UPDATE TO authenticated USING (true);

-- ========================================
-- 15-3. contractsテーブルの拡張（リードタイム分析用）
-- ========================================
-- 成約確定日時（リードタイム分析用）
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contracted_at TIMESTAMPTZ;
-- 案件IDとの紐付け
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
-- 入社日
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS entry_date DATE;
-- 法人名（分離）
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS placement_company_name TEXT;
-- 園名（分離）
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS placement_facility_name TEXT;
-- キャンセル関連
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS refund_required BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS refund_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS refund_amount INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
-- 入金予定日
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_scheduled_date DATE;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_contracts_project ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contracted_at ON contracts(contracted_at);
CREATE INDEX IF NOT EXISTS idx_contracts_entry_date ON contracts(entry_date);
CREATE INDEX IF NOT EXISTS idx_contracts_is_cancelled ON contracts(is_cancelled);

-- ========================================
-- 16. トリガー: ステータス変更時に履歴を記録
-- ========================================
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- ステータス変更履歴に記録（リードタイム分析用）
    INSERT INTO status_history (candidate_id, old_status, new_status, changed_by, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), NOW());
    
    -- タイムラインイベントも作成
    INSERT INTO timeline_events (candidate_id, event_type, title, description, metadata, created_by)
    VALUES (
      NEW.id,
      'status_change',
      'ステータス変更',
      OLD.status || ' → ' || NEW.status,
      jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_candidate_status_change
  AFTER UPDATE ON candidates
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_status_change();

-- ========================================
-- 17. トリガー: 成約時に自動でcontractsテーブルに追加
-- ========================================
CREATE OR REPLACE FUNCTION create_contract_on_closed_won()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'closed_won' AND OLD.status != 'closed_won' THEN
    -- 既存の成約データがない場合のみ作成
    IF NOT EXISTS (
      SELECT 1 FROM contracts WHERE candidate_id = NEW.id
    ) THEN
      INSERT INTO contracts (
        candidate_id,
        accepted_date,
        contracted_at, -- 成約確定日時（リードタイム分析用）
        revenue_excluding_tax,
        revenue_including_tax
      ) VALUES (
        NEW.id,
        CURRENT_DATE,
        NOW(), -- 成約確定日時を記録
        0,
        0
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_create_contract
  AFTER UPDATE ON candidates
  FOR EACH ROW
  WHEN (NEW.status = 'closed_won' AND OLD.status != 'closed_won')
  EXECUTE FUNCTION create_contract_on_closed_won();



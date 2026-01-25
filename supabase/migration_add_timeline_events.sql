-- タイムラインイベントテーブルの追加
-- Supabaseの SQL Editor で実行してください

-- ========================================
-- タイムラインイベントテーブル
-- 求職者に関するすべての操作履歴を記録
-- ========================================
CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'memo',              -- メモ追加
    'status_change',     -- ステータス変更
    'project_add',       -- 案件追加
    'yomi_update',       -- ヨミ情報更新
    'consultant_change', -- 担当者変更
    'interview_add',     -- 面接追加
    'interview_status_change', -- 面接ステータス変更
    'basic_info_change', -- 基本情報変更
    'contract_add',      -- 成約追加
    'other'              -- その他
  )),
  title TEXT NOT NULL,        -- イベントタイトル（例：「メモ追加」「ステータス変更」）
  description TEXT,           -- イベント詳細（例：「新規 → コンタクト中」）
  created_by UUID REFERENCES users(id), -- 操作したユーザー（nullの場合はシステム）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_timeline_events_candidate ON timeline_events(candidate_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_created_at ON timeline_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_type ON timeline_events(event_type);

-- RLSを有効化
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

-- ポリシー
CREATE POLICY "Authenticated users can view all timeline_events"
  ON timeline_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert timeline_events"
  ON timeline_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update timeline_events"
  ON timeline_events FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete timeline_events"
  ON timeline_events FOR DELETE TO authenticated USING (true);

-- 匿名ユーザー用ポリシー（開発用）
CREATE POLICY "Anon users can view timeline_events"
  ON timeline_events FOR SELECT TO anon USING (true);

CREATE POLICY "Anon users can insert timeline_events"
  ON timeline_events FOR INSERT TO anon WITH CHECK (true);

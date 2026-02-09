-- ========================================
-- ステータス統一マイグレーション
-- 求職者・案件・面接のステータスをすべて日本語の新体系に移行
-- ========================================
-- 実行前に必ずバックアップを取得してください
-- ========================================

BEGIN;

-- ========================================
-- 1. 求職者ステータス（candidates.status）
--    レガシー英語値 → 新体系（日本語）に変換
-- ========================================

-- 1-1. 既存データの変換
UPDATE candidates SET status = '初回連絡中' WHERE status = 'new';
UPDATE candidates SET status = '初回連絡中' WHERE status = 'contacting';
UPDATE candidates SET status = '初回ヒアリング実施済' WHERE status = 'first_contact_done';
UPDATE candidates SET status = '提案求人選定中' WHERE status = 'proposing';
UPDATE candidates SET status = '面接確定済' WHERE status = 'interviewing';
UPDATE candidates SET status = '内定獲得（承諾確認中）' WHERE status = 'offer';
UPDATE candidates SET status = '内定承諾（成約）' WHERE status = 'closed_won';
UPDATE candidates SET status = 'クローズ（終了）' WHERE status = 'closed_lost';
UPDATE candidates SET status = '追客中（中長期フォロー）' WHERE status = 'pending';
UPDATE candidates SET status = '音信不通' WHERE status = 'on_hold';

-- 1-2. CHECK制約を新体系に変更
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_status_check;
ALTER TABLE candidates ADD CONSTRAINT candidates_status_check CHECK (status IN (
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
  '見学提案~設定',
  '再ヒアリング・条件変更あり',
  '初回ヒアリング実施済'
));

-- 1-3. デフォルト値を変更
ALTER TABLE candidates ALTER COLUMN status SET DEFAULT '初回連絡中';

-- ========================================
-- 2. 案件フェーズ（projects.phase）
--    英語値 → 日本語に変換
-- ========================================

-- 2-1. 既存データの変換
UPDATE projects SET phase = '提案済' WHERE phase = 'proposed';
UPDATE projects SET phase = '書類選考中' WHERE phase = 'document_screening';
UPDATE projects SET phase = '面接予定' WHERE phase = 'interview_scheduled';
UPDATE projects SET phase = '面接中' WHERE phase = 'interviewing';
UPDATE projects SET phase = '内定' WHERE phase = 'offer';
UPDATE projects SET phase = '入社確定' WHERE phase = 'accepted';
UPDATE projects SET phase = '不採用' WHERE phase = 'rejected';
UPDATE projects SET phase = '辞退' WHERE phase = 'withdrawn';

-- 2-2. CHECK制約を新体系に変更
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_phase_check;
ALTER TABLE projects ADD CONSTRAINT projects_phase_check CHECK (phase IN (
  '提案済',
  '書類選考中',
  '面接予定',
  '面接中',
  '内定',
  '入社確定',
  '不採用',
  '辞退'
));

-- 2-3. デフォルト値を変更
ALTER TABLE projects ALTER COLUMN phase SET DEFAULT '提案済';

-- ========================================
-- 3. 面接ステータス（interviews.status）
--    英語値 → 日本語に変換
-- ========================================

-- 3-1. 既存データの変換
UPDATE interviews SET status = '予定' WHERE status = 'scheduled';
UPDATE interviews SET status = '実施済' WHERE status = 'completed';
UPDATE interviews SET status = 'キャンセル' WHERE status = 'cancelled';
UPDATE interviews SET status = '調整中' WHERE status = 'rescheduling';

-- 3-2. CHECK制約を新体系に変更
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_status_check;
ALTER TABLE interviews ADD CONSTRAINT interviews_status_check CHECK (status IN (
  '予定',
  '実施済',
  'キャンセル',
  '調整中'
));

-- 3-3. デフォルト値を変更
ALTER TABLE interviews ALTER COLUMN status SET DEFAULT '予定';

-- ========================================
-- 4. トリガー更新: 成約時の自動contract作成
--    candidates.status = 'closed_won' → '内定承諾（成約）'
-- ========================================

-- 4-1. 既存トリガーを削除
DROP TRIGGER IF EXISTS auto_create_contract ON candidates;

-- 4-2. 関数を更新
CREATE OR REPLACE FUNCTION create_contract_on_closed_won()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = '内定承諾（成約）' AND OLD.status != '内定承諾（成約）' THEN
    -- 既存の成約データがない場合のみ作成
    IF NOT EXISTS (
      SELECT 1 FROM contracts WHERE candidate_id = NEW.id
    ) THEN
      INSERT INTO contracts (
        candidate_id,
        accepted_date,
        contracted_at,
        revenue_excluding_tax,
        revenue_including_tax
      ) VALUES (
        NEW.id,
        CURRENT_DATE,
        NOW(),
        0,
        0
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4-3. トリガーを再作成
CREATE TRIGGER auto_create_contract
  AFTER UPDATE ON candidates
  FOR EACH ROW
  WHEN (NEW.status = '内定承諾（成約）' AND OLD.status != '内定承諾（成約）')
  EXECUTE FUNCTION create_contract_on_closed_won();

COMMIT;

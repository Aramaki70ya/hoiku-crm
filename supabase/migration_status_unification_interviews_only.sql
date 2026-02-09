-- ========================================
-- 面接ステータス（interviews.status）だけ新体系へ
-- 制約を先に外してから UPDATE する
-- ========================================

DO $$
BEGIN
  -- 1. 先に古い制約を外す
  ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_status_check;

  -- 2. 既存データを日本語に変換
  UPDATE interviews SET status = '予定' WHERE status = 'scheduled';
  UPDATE interviews SET status = '実施済' WHERE status = 'completed';
  UPDATE interviews SET status = 'キャンセル' WHERE status = 'cancelled';
  UPDATE interviews SET status = '調整中' WHERE status = 'rescheduling';

  -- 3. 新しい制約を付ける
  ALTER TABLE interviews ADD CONSTRAINT interviews_status_check CHECK (status IN (
    '予定',
    '実施済',
    'キャンセル',
    '調整中'
  ));

  -- 4. デフォルト値
  ALTER TABLE interviews ALTER COLUMN status SET DEFAULT '予定';
END $$;

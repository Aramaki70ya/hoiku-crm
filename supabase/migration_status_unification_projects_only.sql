-- ========================================
-- 案件フェーズ（projects.phase）だけ新体系へ
-- 制約を先に外してから UPDATE する
-- ========================================

DO $$
BEGIN
  -- 1. 先に古い制約を外す
  ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_phase_check;

  -- 2. 既存データを日本語に変換
  UPDATE projects SET phase = '提案済' WHERE phase = 'proposed';
  UPDATE projects SET phase = '書類選考中' WHERE phase = 'document_screening';
  UPDATE projects SET phase = '面接予定' WHERE phase = 'interview_scheduled';
  UPDATE projects SET phase = '面接中' WHERE phase = 'interviewing';
  UPDATE projects SET phase = '内定' WHERE phase = 'offer';
  UPDATE projects SET phase = '入社確定' WHERE phase = 'accepted';
  UPDATE projects SET phase = '不採用' WHERE phase = 'rejected';
  UPDATE projects SET phase = '辞退' WHERE phase = 'withdrawn';

  -- 3. 新しい制約を付ける
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

  -- 4. デフォルト値
  ALTER TABLE projects ALTER COLUMN phase SET DEFAULT '提案済';
END $$;

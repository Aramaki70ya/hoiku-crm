-- ========================================
-- 求職者ステータスだけ先に新体系へ（candidates のみ）
-- このファイルを「1回で」実行すること（DO ブロックでまとめてある）
-- ========================================

DO $$
BEGIN
  -- 1. 先に古い制約を外す（外さないと UPDATE で日本語を入れられない）
  ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_status_check;

  -- 2. 既存データを日本語に変換
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

  -- 3. 新しい制約を付ける（日本語17種類を許可）
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

  -- 4. デフォルト値
  ALTER TABLE candidates ALTER COLUMN status SET DEFAULT '初回連絡中';
END $$;

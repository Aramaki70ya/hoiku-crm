-- ========================================
-- CSV データインポート用SQL
-- 実行順序: Step 1 → CSVインポート → Step 3 → Step 4 → Step 5
-- ========================================

-- ========================================
-- Step 1: CSV取り込み用の一時テーブルを作成
-- ========================================
CREATE TABLE IF NOT EXISTS stg_member_monthly (
  month_text TEXT,
  member_name TEXT,
  candidate_id TEXT,
  assigned_date TEXT,
  candidate_name TEXT,
  lead_source TEXT,
  category TEXT,
  status TEXT,
  expected_amount TEXT,
  prob_current TEXT,
  prob_next TEXT,
  contract_amount TEXT,
  interview_flag TEXT
);

-- ========================================
-- Step 2: CSVをインポート
-- Supabase Dashboard → Table Editor → stg_member_monthly → Import CSV
-- ※ このステップはGUIで実行してください
-- ========================================

-- ========================================
-- Step 3: candidates を upsert
-- ========================================
INSERT INTO candidates (id, name, registered_at, consultant_id, source_id, status)
SELECT DISTINCT ON (s.candidate_id)
  s.candidate_id,
  s.candidate_name,
  TO_DATE(s.assigned_date, 'YYYY/MM/DD'),
  u.id,
  src.id,
  CASE
    WHEN s.status LIKE '%初回連絡中%' THEN 'contacting'
    WHEN s.status LIKE '%連絡つかず%' THEN 'contacting'
    WHEN s.status LIKE '%初回ヒアリング実施済%' THEN 'first_contact_done'
    WHEN s.status LIKE '%提案求人選定中%' THEN 'proposing'
    WHEN s.status LIKE '%求人提案済%' THEN 'proposing'
    WHEN s.status LIKE '%見学提案%' THEN 'proposing'
    WHEN s.status LIKE '%面接日程調整中%' THEN 'interviewing'
    WHEN s.status LIKE '%面接確定%' THEN 'interviewing'
    WHEN s.status LIKE '%面接実施済%' THEN 'interviewing'
    WHEN s.status LIKE '%承諾確認中%' THEN 'offer'
    WHEN s.status LIKE '%内定承諾%' THEN 'closed_won'
    WHEN s.status LIKE '%内定辞退%' THEN 'closed_lost'
    WHEN s.status LIKE '%クローズ%' THEN 'closed_lost'
    WHEN s.status LIKE '%追客中%' THEN 'pending'
    WHEN s.status LIKE '%音信不通%' THEN 'on_hold'
    WHEN s.status LIKE '%再ヒアリング%' THEN 'first_contact_done'
    WHEN s.status LIKE '%書類選考%' THEN 'interviewing'
    ELSE 'new'
  END
FROM stg_member_monthly s
LEFT JOIN users u ON u.name = s.member_name
LEFT JOIN sources src ON src.name = s.lead_source
WHERE s.candidate_id IS NOT NULL 
  AND s.candidate_id != ''
  AND s.candidate_id != 'ID'
ORDER BY s.candidate_id, s.month_text DESC
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  registered_at = COALESCE(candidates.registered_at, EXCLUDED.registered_at),
  consultant_id = EXCLUDED.consultant_id,
  source_id = COALESCE(candidates.source_id, EXCLUDED.source_id),
  status = EXCLUDED.status;

-- ========================================
-- Step 4: projects を insert
-- ========================================
INSERT INTO projects (candidate_id, client_name, phase, expected_amount, probability)
SELECT DISTINCT ON (s.candidate_id)
  s.candidate_id,
  '未設定',
  CASE
    WHEN s.category = '内定承諾' THEN 'accepted'
    WHEN s.category = '内定辞退' THEN 'rejected'
    WHEN s.category = 'フォロー・ロスト' THEN 'withdrawn'
    WHEN s.category = '面接フェーズ' AND s.status LIKE '%面接日程調整中%' THEN 'interview_scheduled'
    WHEN s.category = '面接フェーズ' AND s.status LIKE '%面接確定%' THEN 'interview_scheduled'
    WHEN s.category = '面接フェーズ' AND s.status LIKE '%面接実施済%' THEN 'interviewing'
    WHEN s.category = '面接フェーズ' THEN 'interviewing'
    WHEN s.status LIKE '%承諾確認中%' THEN 'offer'
    ELSE 'proposed'
  END,
  NULLIF(REPLACE(REPLACE(s.expected_amount, ',', ''), '"', ''), '')::INTEGER,
  CASE
    WHEN s.prob_current LIKE '%A%' THEN 'A'
    WHEN s.prob_current LIKE '%B%' THEN 'B'
    WHEN s.prob_current LIKE '%C%' THEN 'C'
    WHEN s.prob_current LIKE '%D%' THEN 'C'
    ELSE NULL
  END
FROM stg_member_monthly s
WHERE s.candidate_id IS NOT NULL 
  AND s.candidate_id != ''
  AND s.candidate_id != 'ID'
  AND EXISTS (SELECT 1 FROM candidates c WHERE c.id = s.candidate_id)
ORDER BY s.candidate_id, s.month_text DESC;

-- ========================================
-- Step 5: interviews を insert（面接フラグ=TRUEのみ）
-- ========================================
INSERT INTO interviews (project_id, type, start_at, status)
SELECT 
  p.id,
  'interview',
  TO_DATE(REPLACE(s.month_text, '_', '-') || '-01', 'YYYY-MM-DD'),
  CASE
    WHEN s.status LIKE '%面接日程調整中%' THEN 'rescheduling'
    WHEN s.status LIKE '%面接確定%' THEN 'scheduled'
    WHEN s.status LIKE '%面接実施済%' THEN 'completed'
    WHEN s.status LIKE '%結果待ち%' THEN 'completed'
    ELSE 'scheduled'
  END
FROM stg_member_monthly s
JOIN projects p ON p.candidate_id = s.candidate_id
WHERE UPPER(s.interview_flag) = 'TRUE'
  AND s.candidate_id IS NOT NULL
  AND s.candidate_id != ''
  AND s.candidate_id != 'ID';

-- ========================================
-- 確認用クエリ
-- ========================================
-- インポートされた件数を確認
-- SELECT COUNT(*) FROM stg_member_monthly;
-- SELECT COUNT(*) FROM candidates;
-- SELECT COUNT(*) FROM projects;
-- SELECT COUNT(*) FROM interviews;

-- ダッシュボード用の集計確認
-- SELECT 
--   u.name,
--   p.phase,
--   COUNT(*) as count
-- FROM projects p
-- JOIN candidates c ON c.id = p.candidate_id
-- JOIN users u ON u.id = c.consultant_id
-- GROUP BY u.name, p.phase
-- ORDER BY u.name, p.phase;

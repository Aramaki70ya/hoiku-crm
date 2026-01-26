-- ========================================
-- 1月分（2026_01）のデータをprojectsテーブルに追加
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================
-- 前提: CSVデータがstg_member_monthlyテーブルにインポート済みであること
-- CSVインポート手順:
--   1. Supabase Dashboard → Table Editor → stg_member_monthly
--   2. Import CSV をクリック
--   3. 「【保育】数値管理シート_最新版 のコピー - 全メンバーマージシート1月分.csv」をアップロード
--   4. カラムマッピングを確認してインポート実行
-- ========================================

-- 1月分（2026_01）のデータをprojectsテーブルに追加
-- 注意: 月次マージシートには園名・法人名の情報がないため、client_nameは'未設定'になります
WITH monthly_data AS (
  SELECT DISTINCT ON (candidate_id, month_text)
    candidate_id,
    category,
    status,
    expected_amount,
    prob_current,
    prob_next,
    month_text
  FROM stg_member_monthly
  WHERE month_text = '2026_01'
    AND candidate_id IS NOT NULL 
    AND candidate_id != ''
  ORDER BY candidate_id, month_text DESC
)
INSERT INTO projects (candidate_id, client_name, phase, expected_amount, probability, probability_month, month_text)
SELECT
  l.candidate_id,
  '未設定', -- 月次マージシートには園名・法人名の情報がないため
  CASE
    WHEN l.category = '内定承諾' THEN 'accepted'
    WHEN l.category = '内定辞退' THEN 'rejected'
    WHEN l.category = 'フォロー・ロスト' THEN 'withdrawn'
    WHEN l.category = '面接フェーズ' AND l.status LIKE '%面接日程調整中%' THEN 'interview_scheduled'
    WHEN l.category = '面接フェーズ' AND l.status LIKE '%面接確定%' THEN 'interview_scheduled'
    WHEN l.category = '面接フェーズ' AND l.status LIKE '%面接実施済%' THEN 'interviewing'
    WHEN l.category = '面接フェーズ' THEN 'interviewing'
    WHEN l.status LIKE '%承諾確認中%' THEN 'offer'
    ELSE 'proposed'
  END,
  NULLIF(REPLACE(REPLACE(l.expected_amount, ',', ''), '"', ''), '')::integer,
  CASE
    WHEN l.prob_current LIKE '%A%' THEN 'A'
    WHEN l.prob_current LIKE '%B%' THEN 'B'
    WHEN l.prob_current LIKE '%C%' THEN 'C'
    WHEN l.prob_current LIKE '%D%' THEN 'C'
    ELSE NULL
  END,
  'current', -- prob_current（当月のヨミ）が設定されている場合は'current'
  l.month_text -- 月情報を保存（'2026_01'）
FROM monthly_data l
WHERE EXISTS (SELECT 1 FROM candidates c WHERE c.id = l.candidate_id)
  AND NOT EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.candidate_id = l.candidate_id 
      AND p.month_text = l.month_text
  );

-- 結果確認（1月分）
SELECT 
  '1月分データ追加結果' as info,
  COUNT(*) as total_projects,
  COUNT(*) FILTER (WHERE expected_amount IS NOT NULL AND expected_amount > 0) as with_yomi,
  COUNT(*) FILTER (WHERE probability = 'A') as yomi_a,
  COUNT(*) FILTER (WHERE probability = 'B') as yomi_b,
  COUNT(*) FILTER (WHERE probability = 'C') as yomi_c
FROM projects
WHERE month_text = '2026_01';

-- 月別データ件数確認
SELECT 
  month_text,
  COUNT(*) as project_count
FROM projects
WHERE month_text IS NOT NULL
GROUP BY month_text
ORDER BY month_text DESC;

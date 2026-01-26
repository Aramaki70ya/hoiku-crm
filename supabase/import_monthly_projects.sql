-- ========================================
-- 月次データからprojectsテーブルに10月、11月、12月のデータを追加
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================
-- 10月（2025_10）、11月（2025_11）、12月（2025_12）のデータをprojectsテーブルに追加
-- 既存のプロジェクトは更新、新規は追加

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
  WHERE month_text IN ('2025_10', '2025_11', '2025_12')
    AND candidate_id IS NOT NULL 
    AND candidate_id != ''
  ORDER BY candidate_id, month_text DESC
),
client_names AS (
  SELECT DISTINCT ON (candidate_id)
    candidate_id,
    NULLIF(COALESCE(NULLIF(garden_name, ''), NULLIF(corporation_name, '')), '') AS client_name,
    interview_date,
    assigned_date
  FROM stg_member_sheet
  WHERE candidate_id IS NOT NULL AND candidate_id != ''
  ORDER BY candidate_id, interview_date DESC, assigned_date DESC
)
INSERT INTO projects (candidate_id, client_name, phase, expected_amount, probability, probability_month, month_text)
SELECT
  l.candidate_id,
  COALESCE(cn.client_name, '未設定'),
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
  NULLIF(l.expected_amount, '')::integer,
  CASE
    WHEN l.prob_current LIKE '%A%' THEN 'A'
    WHEN l.prob_current LIKE '%B%' THEN 'B'
    WHEN l.prob_current LIKE '%C%' THEN 'C'
    WHEN l.prob_current LIKE '%D%' THEN 'C'
    ELSE NULL
  END,
  'current', -- prob_current（当月のヨミ）が設定されている場合は'current'
  l.month_text -- 月情報を保存（'2025_10', '2025_11', '2025_12'など）
FROM monthly_data l
LEFT JOIN client_names cn ON cn.candidate_id = l.candidate_id
WHERE EXISTS (SELECT 1 FROM candidates c WHERE c.id = l.candidate_id)
  AND NOT EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.candidate_id = l.candidate_id 
      AND p.month_text = l.month_text
  );

-- 結果確認（月別）
SELECT 
  '月別データ追加結果' as info,
  COUNT(*) as total_projects,
  COUNT(*) FILTER (WHERE expected_amount IS NOT NULL AND expected_amount > 0) as with_yomi,
  COUNT(*) FILTER (WHERE probability = 'A') as yomi_a,
  COUNT(*) FILTER (WHERE probability = 'B') as yomi_b,
  COUNT(*) FILTER (WHERE probability = 'C') as yomi_c
FROM projects
WHERE probability_month = 'current';

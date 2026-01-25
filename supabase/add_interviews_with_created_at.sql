-- ========================================
-- 11月・12月のinterviewsを追加（created_at付き）
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================

-- まず現在の状態を確認
SELECT 'interviews現在の件数' as info, COUNT(*) as count FROM interviews;
SELECT 'stg_member_monthly面接フラグTRUE件数' as info, COUNT(*) as count 
FROM stg_member_monthly 
WHERE UPPER(interview_flag) = 'TRUE';

-- ========================================
-- 既存のinterviewsを一旦削除して再作成する場合
-- （重複を避けるため）
-- ========================================
-- DELETE FROM interviews;

-- ========================================
-- interviewsを追加（created_atを月の1日に設定）
-- ========================================
INSERT INTO interviews (project_id, type, start_at, status, created_at)
SELECT 
  p.id,
  'interview'::text,
  -- start_at: 月の1日
  TO_DATE(REPLACE(s.month_text, '_', '-') || '-01', 'YYYY-MM-DD')::timestamp,
  CASE
    WHEN s.status LIKE '%面接日程調整中%' THEN 'rescheduling'
    WHEN s.status LIKE '%面接確定%' THEN 'scheduled'
    WHEN s.status LIKE '%面接実施済%' THEN 'completed'
    WHEN s.status LIKE '%結果待ち%' THEN 'completed'
    WHEN s.category = '内定承諾' THEN 'completed'
    WHEN s.category = '内定辞退' THEN 'completed'
    ELSE 'scheduled'
  END,
  -- created_at: 月の1日
  TO_DATE(REPLACE(s.month_text, '_', '-') || '-01', 'YYYY-MM-DD')::timestamp
FROM stg_member_monthly s
JOIN projects p ON p.candidate_id = s.candidate_id
WHERE UPPER(s.interview_flag) = 'TRUE'
  AND s.candidate_id IS NOT NULL
  AND s.candidate_id != ''
  AND s.candidate_id != 'ID'
  -- 重複を避ける: 同じproject_idで同じ月のinterviewがない場合のみ
  AND NOT EXISTS (
    SELECT 1 FROM interviews i 
    WHERE i.project_id = p.id 
    AND DATE_TRUNC('month', i.created_at) = TO_DATE(REPLACE(s.month_text, '_', '-') || '-01', 'YYYY-MM-DD')
  );

-- 結果確認
SELECT 'interviews追加後の件数' as info, COUNT(*) as count FROM interviews;

-- 月別の件数確認
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as interview_count
FROM interviews
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

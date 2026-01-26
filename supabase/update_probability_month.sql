-- ========================================
-- 既存のprojectsテーブルにprobability_monthを設定
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================
-- インポート時にprobability_monthが設定されていなかったデータを修正

-- probabilityが設定されている場合は'current'を設定
UPDATE projects
SET probability_month = 'current'
WHERE probability IS NOT NULL
  AND (probability_month IS NULL OR probability_month = '');

-- 更新結果の確認
SELECT 
  '更新結果確認' as info,
  COUNT(*) FILTER (WHERE probability_month = 'current') as current_count,
  COUNT(*) FILTER (WHERE probability_month = 'next') as next_count,
  COUNT(*) FILTER (WHERE probability_month IS NULL) as null_count,
  COUNT(*) as total_count
FROM projects;

-- ========================================
-- projectsテーブルにmonth_textカラムを追加
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================
-- 月ごとのデータを管理するため、month_textカラムを追加
-- 形式: '2025_10', '2025_11', '2025_12' など

-- month_textカラムを追加
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS month_text TEXT;

-- 既存データにmonth_textを設定（created_atから推測、または'current'として扱う）
-- 注意: 既存データは現在の月として扱う
UPDATE projects
SET month_text = TO_CHAR(NOW(), 'YYYY_MM')
WHERE month_text IS NULL;

-- インデックスを追加（検索性能向上）
CREATE INDEX IF NOT EXISTS idx_projects_month_text ON projects(month_text);
CREATE INDEX IF NOT EXISTS idx_projects_candidate_month ON projects(candidate_id, month_text);

-- 確認
SELECT 
  'month_text追加結果' as info,
  COUNT(*) as total_projects,
  COUNT(*) FILTER (WHERE month_text IS NOT NULL) as with_month_text,
  COUNT(DISTINCT month_text) as distinct_months,
  array_agg(DISTINCT month_text ORDER BY month_text) as months
FROM projects;

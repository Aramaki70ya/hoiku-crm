-- ========================================
-- stg_member_monthlyテーブルの構造を確認
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================

-- テーブルが存在するか確認
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'stg_member_monthly'
ORDER BY ordinal_position;

-- テーブルの行数を確認
SELECT COUNT(*) as row_count FROM stg_member_monthly;

-- 既存データのサンプルを確認（最初の5行）
SELECT * FROM stg_member_monthly LIMIT 5;

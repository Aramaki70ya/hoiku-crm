-- ========================================
-- カラムが存在するか確認する SQL（PostgreSQL / Supabase）
-- ========================================

-- 1. 特定のテーブル・カラムが存在するか true/false で返す
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'contracts'
    AND column_name = 'invoice_sent_date'
) AS invoice_sent_date_exists;

-- 2. 複数カラムを一度に確認したい場合（ある = true、ない = false）
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'invoice_sent_date') AS invoice_sent_date,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'payment_date') AS payment_date,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'payment_scheduled_date') AS payment_scheduled_date;

-- 3. テーブルに存在するカラム一覧を出す（確認用）
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contracts'
ORDER BY ordinal_position;

-- ========================================
-- 1月分の成約データを確認
-- スクリーンショットの数字と一致するか確認
-- ========================================

-- 月次マージシートから1月分の成約データを確認
SELECT 
  member_name as 担当者,
  candidate_id as ID,
  candidate_name as 求職者名,
  contract_amount as 成約金額
FROM stg_member_monthly
WHERE month_text = '2026_01'
  AND category = '内定承諾'
  AND contract_amount IS NOT NULL
  AND contract_amount != ''
  AND contract_amount != '0'
ORDER BY 
  member_name,
  NULLIF(REPLACE(REPLACE(contract_amount, ',', ''), '"', ''), '')::INTEGER DESC;

-- 担当者別の合計を確認
SELECT 
  member_name as 担当者,
  COUNT(*) as 成約件数,
  SUM(NULLIF(REPLACE(REPLACE(contract_amount, ',', ''), '"', ''), '')::INTEGER) as 成約額合計
FROM stg_member_monthly
WHERE month_text = '2026_01'
  AND category = '内定承諾'
  AND contract_amount IS NOT NULL
  AND contract_amount != ''
  AND contract_amount != '0'
GROUP BY member_name
ORDER BY 成約額合計 DESC;

-- 全体の合計
SELECT 
  COUNT(*) as 成約件数,
  SUM(NULLIF(REPLACE(REPLACE(contract_amount, ',', ''), '"', ''), '')::INTEGER) as 成約額合計
FROM stg_member_monthly
WHERE month_text = '2026_01'
  AND category = '内定承諾'
  AND contract_amount IS NOT NULL
  AND contract_amount != ''
  AND contract_amount != '0';

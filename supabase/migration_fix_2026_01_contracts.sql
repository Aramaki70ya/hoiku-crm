-- 2026年1月成約データ修正
-- 実際の1月成約データに合わせてDBを更新する
-- 作成日: 2026-02-09
--
-- 実行方法: Supabase Dashboard → SQL Editor で実行
--
-- 手順:
-- 1. 既存の2026年1月成約を削除
-- 2. 正しい10件の成約データを挿入

-- ========================================
-- 1. 既存の2026年1月成約を削除
-- ========================================
DELETE FROM contracts
WHERE accepted_date >= '2026-01-01' AND accepted_date <= '2026-01-31';

-- ========================================
-- 2. 正しい1月成約データを挿入
-- candidates に存在する candidate_id のみ挿入
-- ========================================
INSERT INTO contracts (
  candidate_id,
  accepted_date,
  employment_restriction_until,
  employment_type,
  job_type,
  revenue_excluding_tax,
  revenue_including_tax,
  payment_date,
  invoice_sent_date,
  calculation_basis,
  document_url,
  placement_company
)
SELECT
  v.candidate_id,
  v.accepted_date::date,
  v.employment_restriction_until::date,
  v.employment_type,
  v.job_type,
  v.revenue_excluding_tax::integer,
  v.revenue_including_tax::integer,
  v.payment_date::date,
  v.invoice_sent_date::date,
  v.calculation_basis,
  v.document_url,
  v.placement_company
FROM (VALUES
  ('20206672', '2026-01-02', NULL, NULL, NULL, 707045, 777750, NULL, NULL, NULL, NULL, NULL),   -- 瀧澤: 長倉 あみ
  ('20206855', '2026-01-23', NULL, NULL, NULL, 534524, 587976, NULL, NULL, NULL, NULL, NULL),   -- 瀧澤
  ('20206056', '2026-01-01', NULL, NULL, NULL, 1409091, 1550000, NULL, NULL, NULL, NULL, NULL), -- 松澤: 杉谷 美保子
  ('20206190', '2026-01-01', NULL, NULL, NULL, 946909, 1041600, NULL, NULL, NULL, NULL, NULL),  -- 後藤: 小熊 知子
  ('20206387', '2026-01-01', NULL, NULL, NULL, 1028558, 1131414, NULL, NULL, NULL, NULL, NULL), -- 吉田: 柴田 実穂
  ('20206619', '2026-01-01', NULL, NULL, NULL, 856964, 942660, NULL, NULL, NULL, NULL, NULL),   -- 吉田: 室井 郁恵
  ('20206795', '2026-01-15', NULL, NULL, NULL, 946636, 1041300, NULL, NULL, NULL, NULL, NULL),  -- 吉田: 小林 美洸
  ('20206879', '2026-01-28', NULL, NULL, NULL, 727636, 800400, NULL, NULL, NULL, NULL, NULL),   -- 小畦: 前田彩花
  ('20206642', '2026-01-01', NULL, NULL, NULL, 1125273, 1237800, NULL, NULL, NULL, NULL, NULL), -- 鈴木: 塚本 佑香
  ('20206656', '2026-01-01', NULL, NULL, NULL, 1009238, 1110162, NULL, NULL, NULL, NULL, NULL)  -- 鈴木: 星野 理沙
) AS v(candidate_id, accepted_date, employment_restriction_until, employment_type, job_type, revenue_excluding_tax, revenue_including_tax, payment_date, invoice_sent_date, calculation_basis, document_url, placement_company)
WHERE EXISTS (
  SELECT 1 FROM candidates WHERE id = v.candidate_id
);

-- ========================================
-- 3. 結果確認
-- ========================================
-- 1月成約の件数と合計金額を表示
SELECT
  COUNT(*) AS total_contracts,
  SUM(revenue_including_tax) AS total_revenue
FROM contracts
WHERE accepted_date >= '2026-01-01' AND accepted_date <= '2026-01-31';

-- 期待値: 10件, ¥10,220,062

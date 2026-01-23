-- Hoiku CRM 成約データ
-- 成約2025_10.csv, 成約2025_11.csv, 成約2025_12.csv から生成
-- 生成日時: 2026-01-21T02:19:08.504Z
-- 
-- 実行順序: 5番目
-- 依存関係: 03_candidates.sql の実行後
-- 件数: 21件（4件の存在しないcandidate_idを除外: 20204369, 20205637, 20205851, 20206086）

-- 成約データの挿入
-- 注意: 存在しないcandidate_idは除外されています
INSERT INTO contracts (candidate_id, accepted_date, employment_restriction_until, employment_type, job_type, revenue_excluding_tax, revenue_including_tax, payment_date, invoice_sent_date, calculation_basis, document_url, placement_company)
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
  ('20191096', '2025-10-01', NULL, '正職員', '保育士', 687600, 756360, '2025-10-31', NULL, '3,438,000円×20％', NULL, 'フェイスフルラバーズ'),
  -- ('20204369', '2025-10-01', NULL, NULL, NULL, 610480, 671528, NULL, NULL, NULL, NULL, NULL), -- 除外: candidatesに存在しない
  -- ('20205637', '2025-10-01', NULL, NULL, NULL, 712085, 783294, NULL, NULL, NULL, NULL, NULL), -- 除外: candidatesに存在しない
  ('20206038', '2025-10-01', NULL, NULL, NULL, 1469633, 1616596, NULL, NULL, NULL, NULL, NULL),
  ('20206055', '2025-10-01', NULL, NULL, NULL, 411720, 452892, NULL, NULL, NULL, NULL, NULL),
  ('20206082', '2025-10-01', NULL, '正社員', '保育士', 240000, 264000, '2025-12-31', NULL, '下限値30万', NULL, '株式会社おはようキッズ'),
  ('20206119', '2025-10-01', NULL, NULL, NULL, 887840, 976624, NULL, NULL, NULL, NULL, NULL),
  ('20206129', '2025-10-01', NULL, NULL, NULL, 702000, 772200, NULL, NULL, NULL, NULL, NULL),
  ('20206167', '2025-10-01', NULL, NULL, NULL, 300000, 330000, NULL, NULL, NULL, NULL, NULL),
  ('20206295', '2025-10-01', NULL, NULL, NULL, 945000, 1039500, NULL, NULL, NULL, NULL, NULL),
  ('20206298', '2025-10-01', NULL, '正社員', '保育士', 365040, 401544, '2026-05-31', NULL, '3,780,000円×25％', NULL, 'ソラスト東村山保育園'),
  -- ('20205851', '2025-11-01', NULL, NULL, NULL, 791000, 870100, NULL, NULL, NULL, NULL, NULL), -- 除外: candidatesに存在しない
  -- ('20206086', '2025-11-01', NULL, NULL, NULL, 200000, 220000, NULL, NULL, NULL, NULL, NULL), -- 除外: candidatesに存在しない
  ('20206130', '2025-11-01', NULL, NULL, NULL, 1099093, 1209002, NULL, NULL, NULL, NULL, NULL),
  ('20206203', '2025-11-01', NULL, NULL, NULL, 309000, 339900, NULL, NULL, NULL, NULL, NULL),
  ('20206257', '2025-11-01', NULL, NULL, NULL, 563659, 620025, NULL, NULL, NULL, NULL, NULL),
  ('20206351', '2025-11-01', NULL, NULL, NULL, 834000, 917400, NULL, NULL, NULL, NULL, NULL),
  ('20206355', '2025-11-01', NULL, NULL, NULL, 814000, 895400, NULL, NULL, NULL, NULL, NULL),
  ('20206512', '2025-11-01', NULL, NULL, NULL, 300000, 330000, NULL, NULL, NULL, NULL, NULL),
  ('20206319', '2025-12-01', NULL, NULL, NULL, 917850, 1009635, NULL, NULL, NULL, NULL, NULL),
  ('20206410', '2025-12-01', NULL, NULL, NULL, 1275600, 1403160, NULL, NULL, NULL, NULL, NULL),
  ('20206510', '2025-12-01', NULL, NULL, NULL, 938570, 1032427, NULL, NULL, NULL, NULL, NULL),
  ('20206580', '2025-12-01', NULL, NULL, NULL, 560000, 616000, NULL, NULL, NULL, NULL, NULL),
  ('20206603', '2025-12-01', NULL, NULL, NULL, 1152000, 1267200, NULL, NULL, NULL, NULL, NULL),
  ('20206615', '2025-12-01', NULL, NULL, NULL, 300000, 330000, NULL, NULL, NULL, NULL, NULL)
) AS v(candidate_id, accepted_date, employment_restriction_until, employment_type, job_type, revenue_excluding_tax, revenue_including_tax, payment_date, invoice_sent_date, calculation_basis, document_url, placement_company)
WHERE EXISTS (
  SELECT 1 FROM candidates WHERE id = v.candidate_id
);

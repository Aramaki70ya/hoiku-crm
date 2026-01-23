-- Hoiku CRM 案件データ
-- 【保育】数値管理シート_最新版（8担当者分）から生成
-- 生成日時: 2026-01-21T02:20:30.500Z
-- 
-- 実行順序: 4番目
-- 依存関係: 03_candidates.sql の実行後
-- 件数: 26件（3件の存在しないcandidate_idを除外: 20205298, 20205959, 20203025）

-- 案件データの挿入
-- 注意: 存在しないcandidate_idは除外されています（20205298, 20205959, 20203025）
INSERT INTO projects (candidate_id, client_name, phase, expected_amount, probability, expected_entry_date, note)
SELECT 
  v.candidate_id, 
  v.client_name, 
  v.phase::text, 
  v.expected_amount::integer, 
  v.probability, 
  v.expected_entry_date::date, 
  v.note
FROM (VALUES
  ('20206577', '瀧澤担当案件', 'withdrawn', 500000, 'C', NULL, '担当: 瀧澤'),
  ('20206672', '瀧澤担当案件', 'accepted', 500000, 'C', NULL, '担当: 瀧澤'),
  ('20206779', '瀧澤担当案件', 'interview_scheduled', 600000, 'C', NULL, '担当: 瀧澤'),
  ('20206640', '瀧澤担当案件', 'interview_scheduled', 600000, 'C', NULL, '担当: 瀧澤'),
  ('20206367', '西田担当案件', 'interview_scheduled', 1020000, 'B', NULL, '担当: 西田'),
  ('20206785', '西田担当案件', 'interview_scheduled', 500000, NULL, NULL, '担当: 西田'),
  -- ('20205298', '鈴木担当案件', 'withdrawn', NULL, NULL, NULL, '担当: 鈴木'), -- 除外: candidatesに存在しない
  ('20206642', '鈴木担当案件', 'interview_scheduled', 1000000, 'B', NULL, '担当: 鈴木'),
  ('20206656', '鈴木担当案件', 'accepted', 1000000, 'A', NULL, '担当: 鈴木'),
  ('20206782', '鈴木担当案件', 'interview_scheduled', 800000, NULL, NULL, '担当: 鈴木'),
  ('20206797', '鈴木担当案件', 'proposed', 180000, 'C', NULL, '担当: 鈴木'),
  ('20206807', '鈴木担当案件', 'proposed', 750000, 'C', NULL, '担当: 鈴木'),
  -- ('20205959', '後藤担当案件', 'withdrawn', NULL, NULL, NULL, '担当: 後藤'), -- 除外: candidatesに存在しない
  ('20205998', '後藤担当案件', 'withdrawn', NULL, NULL, NULL, '担当: 後藤'),
  -- ('20203025', '後藤担当案件', 'interview_scheduled', 1000000, 'C', NULL, '担当: 後藤'), -- 除外: candidatesに存在しない
  ('20206419', '後藤担当案件', 'withdrawn', NULL, 'B', NULL, '担当: 後藤'),
  ('20206474', '後藤担当案件', 'proposed', 1000000, 'C', NULL, '担当: 後藤'),
  ('20206422', '小畦担当案件', 'withdrawn', NULL, NULL, NULL, '担当: 小畦'),
  ('20206758', '小畦担当案件', 'interview_scheduled', 650000, 'C', NULL, '担当: 小畦'),
  ('20206813', '小畦担当案件', 'proposed', 550000, 'C', NULL, '担当: 小畦'),
  ('20206170', '吉田担当案件', 'proposed', NULL, NULL, NULL, '担当: 吉田'),
  ('20206387', '吉田担当案件', 'accepted', NULL, NULL, NULL, '担当: 吉田'),
  ('20206619', '吉田担当案件', 'accepted', NULL, NULL, NULL, '担当: 吉田'),
  ('20206770', '吉田担当案件', 'proposed', NULL, NULL, NULL, '担当: 吉田'),
  ('20206795', '吉田担当案件', 'interview_scheduled', 800000, NULL, NULL, '担当: 吉田'),
  ('20206822', '吉田担当案件', 'proposed', NULL, NULL, NULL, '担当: 吉田'),
  ('20206195', '大塚担当案件', 'interview_scheduled', NULL, 'B', NULL, '担当: 大塚'),
  ('20206375', '大塚担当案件', 'withdrawn', NULL, NULL, NULL, '担当: 大塚'),
  ('20206111', '大塚担当案件', 'proposed', NULL, NULL, NULL, '担当: 大塚')
) AS v(candidate_id, client_name, phase, expected_amount, probability, expected_entry_date, note)
WHERE EXISTS (
  SELECT 1 FROM candidates WHERE id = v.candidate_id
)
ON CONFLICT DO NOTHING;

-- Hoiku CRM 面接データ
-- 【保育】数値管理シート_最新版（8担当者分）から生成
-- 生成日時: 2026-01-21T02:21:27.591Z
-- 
-- 実行順序: 6番目
-- 依存関係: 04_projects.sql の実行後
-- 件数: 34件

-- 注意: interviewsテーブルはproject_idが必須
-- projectsテーブルに対応するレコードが存在する場合のみ挿入可能
-- 以下のクエリでprojectsテーブルから自動的にproject_idを解決して挿入する

-- 20206444: 2025-11-28T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-11-28T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206444'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206623: 2025-12-15T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-12-15T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206623'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206577: 2025-12-18T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-12-18T10:00:00+09:00'::timestamptz, '未定', 'cancelled', NULL
FROM projects p
WHERE p.candidate_id = '20206577'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206672: 2026-01-09T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2026-01-09T10:00:00+09:00'::timestamptz, '未定', 'completed', '成約済み'
FROM projects p
WHERE p.candidate_id = '20206672'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206676: 2026-01-15T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2026-01-15T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206676'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206702: 2026-01-06T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2026-01-06T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206702'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206779: 2026-01-15T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2026-01-15T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206779'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206640: 2026-01-15T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2026-01-15T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206640'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206367: 2025-12-25T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-12-25T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206367'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20205830: 2025-11-19T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-11-19T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20205830'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206518: 2025-12-08T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-12-08T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206518'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206639: 2025-12-22T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-12-22T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206639'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206658: 2026-01-05T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2026-01-05T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206658'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206785: 2026-01-20T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2026-01-20T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206785'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20205298: 2025-11-10T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-11-10T10:00:00+09:00'::timestamptz, '未定', 'cancelled', NULL
FROM projects p
WHERE p.candidate_id = '20205298'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206656: 2026-01-21T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2026-01-21T10:00:00+09:00'::timestamptz, '未定', 'completed', '成約済み'
FROM projects p
WHERE p.candidate_id = '20206656'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206782: 2026-01-16T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2026-01-16T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206782'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206797: 2026-01-16T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2026-01-16T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206797'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206807: 2026-01-19T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2026-01-19T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206807'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206495: 2025-12-09T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-12-09T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206495'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20203025: 2025-11-07T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-11-07T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20203025'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206419: 2025-11-25T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-11-25T10:00:00+09:00'::timestamptz, '未定', 'cancelled', NULL
FROM projects p
WHERE p.candidate_id = '20206419'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206474: 2025-12-05T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-12-05T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206474'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206599: 2025-12-16T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-12-16T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206599'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206673: 2026-01-07T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2026-01-07T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206673'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206758: 2026-01-13T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2026-01-13T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206758'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206170: 2025-11-25T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-11-25T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206170'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206387: 2025-11-25T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-11-25T10:00:00+09:00'::timestamptz, '未定', 'completed', '成約済み'
FROM projects p
WHERE p.candidate_id = '20206387'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206533: 2025-12-08T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-12-08T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206533'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206566: 2025-12-08T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-12-08T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206566'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206163: 2025-12-09T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-12-09T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206163'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206195: 2025-12-09T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-12-09T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206195'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206375: 2025-12-09T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-12-09T10:00:00+09:00'::timestamptz, '未定', 'cancelled', NULL
FROM projects p
WHERE p.candidate_id = '20206375'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 20206506: 2025-12-09T10:00:00+09:00 @ 未定
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '2025-12-09T10:00:00+09:00'::timestamptz, '未定', 'scheduled', NULL
FROM projects p
WHERE p.candidate_id = '20206506'
LIMIT 1
ON CONFLICT DO NOTHING;


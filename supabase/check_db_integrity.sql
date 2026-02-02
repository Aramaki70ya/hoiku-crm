-- DB整合性チェック

-- 1. interviews テーブルで、存在しない project_id を参照しているレコード
SELECT 
  'interviews with invalid project_id' as issue,
  COUNT(*) as count
FROM interviews i
LEFT JOIN projects p ON i.project_id = p.id
WHERE p.id IS NULL;

-- 2. 詳細: 無効な project_id を持つ面接
SELECT 
  i.id as interview_id,
  i.project_id,
  i.status,
  i.start_at,
  i.location
FROM interviews i
LEFT JOIN projects p ON i.project_id = p.id
WHERE p.id IS NULL
ORDER BY i.start_at DESC;

-- 3. projects テーブルで、存在しない candidate_id を参照しているレコード
SELECT 
  'projects with invalid candidate_id' as issue,
  COUNT(*) as count
FROM projects p
LEFT JOIN candidates c ON p.candidate_id = c.id
WHERE c.id IS NULL;

-- 4. candidates テーブルで、存在しない consultant_id を参照しているレコード
SELECT 
  'candidates with invalid consultant_id' as issue,
  COUNT(*) as count
FROM candidates c
LEFT JOIN users u ON c.consultant_id = u.id
WHERE c.consultant_id IS NOT NULL AND u.id IS NULL;

-- 5. 面接一覧ページで表示される有効な面接（1月分）
SELECT 
  i.id,
  i.status as interview_status,
  i.start_at,
  p.client_name,
  c.name as candidate_name,
  u.name as consultant_name
FROM interviews i
JOIN projects p ON i.project_id = p.id
JOIN candidates c ON p.candidate_id = c.id
LEFT JOIN users u ON c.consultant_id = u.id
WHERE i.start_at >= '2025-01-01' AND i.start_at < '2025-02-01'
ORDER BY i.start_at;

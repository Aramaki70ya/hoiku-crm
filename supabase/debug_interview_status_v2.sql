-- 面接一覧と面接状況カードの不一致を調査

-- 1. 面接テーブルの全データ（1月分）
SELECT 
  i.id,
  i.status as interview_status,
  i.start_at,
  p.id as project_id,
  p.phase as project_phase,
  p.client_name,
  c.id as candidate_id,
  c.name as candidate_name,
  c.status as candidate_status,
  c.consultant_id,
  u.name as consultant_name
FROM interviews i
JOIN projects p ON i.project_id = p.id
JOIN candidates c ON p.candidate_id = c.id
LEFT JOIN users u ON c.consultant_id = u.id
WHERE i.start_at >= '2025-01-01' AND i.start_at < '2025-02-01'
ORDER BY u.name, i.start_at;

-- 2. 担当者別の面接ステータス集計
SELECT 
  u.name as consultant_name,
  COUNT(*) FILTER (WHERE i.status = 'rescheduling') as adjusting_count,
  COUNT(*) FILTER (WHERE i.status = 'scheduled') as scheduled_count,
  COUNT(*) FILTER (WHERE i.status = 'completed') as completed_count,
  COUNT(*) FILTER (WHERE i.status = 'cancelled') as cancelled_count
FROM interviews i
JOIN projects p ON i.project_id = p.id
JOIN candidates c ON p.candidate_id = c.id
LEFT JOIN users u ON c.consultant_id = u.id
WHERE i.start_at >= '2025-01-01' AND i.start_at < '2025-02-01'
GROUP BY u.name
ORDER BY u.name;

-- 3. 面接のステータス分布
SELECT status, COUNT(*) 
FROM interviews 
WHERE start_at >= '2025-01-01' AND start_at < '2025-02-01'
GROUP BY status;

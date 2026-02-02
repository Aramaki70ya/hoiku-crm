-- ============================================
-- 2026年1月の面接データ確認（DBの正しいデータ）
-- ============================================

-- 1. 担当者別の面接ステータス集計（面接状況カードで表示されるべきデータ）
SELECT 
  u.name as 担当者,
  COUNT(*) FILTER (WHERE i.status = 'rescheduling') as 調整中,
  COUNT(*) FILTER (WHERE i.status = 'scheduled') as 面接前,
  COUNT(*) FILTER (WHERE i.status = 'completed') as 実施済
FROM interviews i
JOIN projects p ON i.project_id = p.id
JOIN candidates c ON p.candidate_id = c.id
LEFT JOIN users u ON c.consultant_id = u.id
WHERE i.start_at >= '2026-01-01' AND i.start_at < '2026-02-01'
GROUP BY u.name
ORDER BY u.name;

-- 2. 面接一覧と同じ詳細データ
SELECT 
  u.name as 担当者,
  i.status as ステータス,
  c.name as 求職者,
  i.start_at as 日時
FROM interviews i
JOIN projects p ON i.project_id = p.id
JOIN candidates c ON p.candidate_id = c.id
LEFT JOIN users u ON c.consultant_id = u.id
WHERE i.start_at >= '2026-01-01' AND i.start_at < '2026-02-01'
ORDER BY u.name, i.start_at;

-- 3. 面接件数
SELECT COUNT(*) as 面接総数 
FROM interviews i
JOIN projects p ON i.project_id = p.id
WHERE i.start_at >= '2026-01-01' AND i.start_at < '2026-02-01';

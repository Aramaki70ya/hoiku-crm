-- =============================================
-- DB整合性修正: 無効なproject_idを持つ面接を削除
-- =============================================

-- ステップ1: 確認（実行前に必ず確認）
-- 無効なproject_idを持つ面接の件数
SELECT 
  'interviews with invalid project_id (will be deleted)' as action,
  COUNT(*) as count
FROM interviews i
LEFT JOIN projects p ON i.project_id = p.id
WHERE p.id IS NULL;

-- ステップ2: 詳細確認
-- 削除対象の面接一覧
SELECT 
  i.id as interview_id,
  i.project_id,
  i.status,
  i.start_at,
  i.location,
  i.created_at
FROM interviews i
LEFT JOIN projects p ON i.project_id = p.id
WHERE p.id IS NULL
ORDER BY i.created_at DESC;

-- ステップ3: バックアップ（必要に応じて）
-- CREATE TABLE interviews_backup_invalid AS
-- SELECT i.* FROM interviews i
-- LEFT JOIN projects p ON i.project_id = p.id
-- WHERE p.id IS NULL;

-- ステップ4: 削除実行
-- ※ 上記の確認結果を見て問題なければ実行
DELETE FROM interviews
WHERE id IN (
  SELECT i.id 
  FROM interviews i
  LEFT JOIN projects p ON i.project_id = p.id
  WHERE p.id IS NULL
);

-- ステップ5: 削除後の確認
SELECT 
  'remaining invalid interviews (should be 0)' as check,
  COUNT(*) as count
FROM interviews i
LEFT JOIN projects p ON i.project_id = p.id
WHERE p.id IS NULL;

-- ステップ6: 有効な面接の件数確認
SELECT 
  'valid interviews count' as check,
  COUNT(*) as count
FROM interviews i
JOIN projects p ON i.project_id = p.id;

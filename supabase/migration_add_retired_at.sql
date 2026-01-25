-- ========================================
-- マイグレーション: usersテーブルにretired_atカラムを追加
-- 実行日: 2026-01-23
-- 目的: 退職者の管理（期間に応じて表示/非表示を制御）
-- ========================================

-- 1. retired_atカラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS retired_at DATE;

-- 2. インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_users_retired_at ON users(retired_at);

-- 3. 退職者を設定（松澤さん・緑さんは2024年12月31日で退職）
-- ※ 名前でマッチングしているため、該当者がいない場合は何も更新されません
UPDATE users 
SET retired_at = '2024-12-31' 
WHERE name IN ('松澤', '緑');

-- 4. 確認用クエリ（実行後に確認してください）
-- SELECT id, name, email, role, retired_at FROM users ORDER BY name;

-- ========================================
-- オプション: 現役ユーザーのみを取得するビュー
-- ========================================
CREATE OR REPLACE VIEW active_users AS
SELECT * FROM users 
WHERE retired_at IS NULL OR retired_at > CURRENT_DATE;

-- ========================================
-- 使い方：
-- - 現役メンバーのみ取得: SELECT * FROM active_users;
-- - 全メンバー取得: SELECT * FROM users;
-- - 特定の期間で現役だったメンバー: 
--   SELECT * FROM users WHERE retired_at IS NULL OR retired_at >= '2025-01-01';
-- ========================================

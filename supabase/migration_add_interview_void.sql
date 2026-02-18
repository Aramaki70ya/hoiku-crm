-- ========================================
-- 面接の論理無効化機能追加マイグレーション
-- ========================================
-- 実行前に必ずバックアップを取得してください
-- ========================================

BEGIN;

-- ========================================
-- 1. interviews テーブルに無効化関連カラムを追加
-- ========================================

-- 無効化フラグ（デフォルト: false = 有効）
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS is_voided BOOLEAN DEFAULT false;

-- 無効化日時（無効化された日時を記録）
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ DEFAULT NULL;

-- 無効化理由（なぜ面接設定件数から除外したか）
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS void_reason TEXT DEFAULT NULL;

-- ========================================
-- 2. 既存データの初期化
-- ========================================

-- 既存のすべての面接レコードを有効（is_voided = false）として扱う
UPDATE interviews SET is_voided = false WHERE is_voided IS NULL;

-- ========================================
-- 3. インデックスの追加（無効化フラグでの検索を高速化）
-- ========================================

CREATE INDEX IF NOT EXISTS idx_interviews_is_voided 
  ON interviews(is_voided);

-- 無効化されていない面接のみを高速に取得するための部分インデックス
CREATE INDEX IF NOT EXISTS idx_interviews_active 
  ON interviews(project_id, start_at) 
  WHERE is_voided = false;

-- ========================================
-- 4. コメント追加（カラムの説明）
-- ========================================

COMMENT ON COLUMN interviews.is_voided IS '面接が無効化されたかどうか（true: 無効化済み = 件数から除外、false: 有効 = 件数にカウント）';
COMMENT ON COLUMN interviews.voided_at IS '面接が無効化された日時';
COMMENT ON COLUMN interviews.void_reason IS '無効化理由（例: 「面接日程調整段階での辞退」「設定後キャンセル」「調整中のまま未成立」）';

COMMIT;

-- ========================================
-- ロールバック手順（必要時）
-- ========================================
-- BEGIN;
-- DROP INDEX IF EXISTS idx_interviews_active;
-- DROP INDEX IF EXISTS idx_interviews_is_voided;
-- ALTER TABLE interviews DROP COLUMN IF EXISTS void_reason;
-- ALTER TABLE interviews DROP COLUMN IF EXISTS voided_at;
-- ALTER TABLE interviews DROP COLUMN IF EXISTS is_voided;
-- COMMIT;

-- user_monthly_targetsテーブルにcontract_target（成約件数目標）カラムを追加
-- 実行日: 2026-02-09

ALTER TABLE user_monthly_targets 
ADD COLUMN IF NOT EXISTS contract_target INT NOT NULL DEFAULT 0;

-- カラムにコメントを追加
COMMENT ON COLUMN user_monthly_targets.contract_target IS '成約件数目標（月次）';

-- 既存データに初期値を設定（必要に応じて調整）
-- 例: すべてのメンバーの成約件数目標を0から適切な値に更新する場合
-- UPDATE user_monthly_targets SET contract_target = 2 WHERE contract_target = 0;

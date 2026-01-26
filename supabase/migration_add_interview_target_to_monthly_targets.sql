-- monthly_targetsテーブルにinterview_targetカラムを追加
ALTER TABLE monthly_targets 
ADD COLUMN IF NOT EXISTS interview_target INT DEFAULT 8;

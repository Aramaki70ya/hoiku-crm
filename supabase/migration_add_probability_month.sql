-- ========================================
-- projects テーブルに probability_month カラム追加
-- ヨミ確度が「当月」か「翌月」かを示す
-- ========================================

-- カラム追加
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS probability_month TEXT 
CHECK (probability_month IN ('current', 'next'))
DEFAULT 'current';

-- 確認
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'probability_month';

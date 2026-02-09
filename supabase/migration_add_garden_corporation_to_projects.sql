-- 面接先を「園名」「法人名」で分けて登録するためのカラム追加
-- Supabase の SQL Editor で実行してください。

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS corporation_name TEXT,
  ADD COLUMN IF NOT EXISTS garden_name TEXT;

COMMENT ON COLUMN projects.corporation_name IS '法人名';
COMMENT ON COLUMN projects.garden_name IS '園名';

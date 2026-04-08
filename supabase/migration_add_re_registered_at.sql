-- 再登録の「いつ戻ってきたか」を明示（一覧の並びは registered_at のまま）
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS re_registered_at DATE;

COMMENT ON COLUMN candidates.re_registered_at IS '再登録日。氏名に(再登録)で新規作成された行に、スプシの登録日を同期で入れる';

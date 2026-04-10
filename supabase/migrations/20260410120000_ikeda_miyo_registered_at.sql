-- 池田 美予 の登録日を本番に反映
-- 1) 氏名が一致する既存行の registered_at を更新
-- 2) まだ誰もいなければ新規挿入（担当=users.name 瀧澤、媒体=sources.name バイトル）

UPDATE candidates
SET registered_at = '2026-04-06'::date
WHERE trim(name) IN ('池田 美予', '池田美予');

INSERT INTO candidates (
  id,
  name,
  kana,
  phone,
  email,
  birth_date,
  age,
  prefecture,
  address,
  qualification,
  desired_employment_type,
  desired_job_type,
  status,
  source_id,
  registered_at,
  re_registered_at,
  consultant_id,
  approach_priority,
  rank,
  drive_link,
  memo
)
SELECT
  '20206605',
  '池田 美予',
  'イケダ ミヨ',
  '09033334444',
  'miyo.ikeda@example.com',
  '1995-04-06'::date,
  30,
  '東京都',
  '世田谷区',
  '保育士',
  '正社員',
  '保育士',
  '初回連絡中',
  (SELECT id FROM sources WHERE name = 'バイトル' LIMIT 1),
  '2026-04-06'::date,
  NULL,
  (SELECT id FROM users WHERE name = '瀧澤' LIMIT 1),
  'B',
  'B',
  NULL,
  NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM candidates c
  WHERE c.id = '20206605'
     OR trim(c.name) IN ('池田 美予', '池田美予')
);

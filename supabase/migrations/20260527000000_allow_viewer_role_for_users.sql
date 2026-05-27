-- ユーザーロールに「閲覧のみ」を追加し、営業メンバーではない在籍者を表現できるようにする

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user', 'viewer'));

UPDATE users
SET role = 'viewer',
    retired_at = NULL
WHERE name IN ('笹島', '笹嶋');

UPDATE users
SET retired_at = '2025-12-31'
WHERE name = '松澤';

UPDATE users
SET retired_at = '2026-04-30'
WHERE name IN ('西田', '後藤');

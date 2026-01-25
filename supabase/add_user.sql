-- ユーザーを追加するSQL
-- SupabaseのSQL Editorで実行してください

-- aramaki@josei-katuyaku.co.jp のユーザーを追加
-- role は必要に応じて 'admin' または 'user' に変更してください
INSERT INTO users (email, name, role)
VALUES ('aramaki@josei-katuyaku.co.jp', '荒巻', 'admin')
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    role = EXCLUDED.role;

-- 確認: 追加されたユーザーを確認
SELECT * FROM users WHERE email = 'aramaki@josei-katuyaku.co.jp';

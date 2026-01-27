-- ========================================
-- ユーザー作成SQL（簡易版）
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================
-- 
-- このスクリプトは public.users テーブルにユーザー（担当者情報）を作成します。
-- 
-- ⚠️ 重要: このスクリプトだけではログインできません！
-- ログインできるようにするには、認証ユーザー（auth.users）の作成が必要です。
-- 
-- 認証ユーザーの作成方法:
-- 1. Supabaseダッシュボード → Authentication → Users から手動で作成
-- 2. scripts/create-auth-users.js を実行（推奨）
-- 3. create_users.sql を試す（動作しない可能性あり）
-- ========================================

-- public.usersテーブルにユーザーを作成
INSERT INTO public.users (email, name, role)
VALUES
  ('yoshida@josei-katuyaku.co.jp', '吉田', 'user'),
  ('goto@josei-katuyaku.co.jp', '後藤', 'user'),
  ('takizawa@josei-katuyaku.co.jp', '瀧澤', 'user'),
  ('matsuzawa@josei-katuyaku.co.jp', '松沢', 'user'),
  ('suzuki@josei-katuyaku.co.jp', '鈴木', 'user'),
  ('ohtsuka@josei-katuyaku.co.jp', '大塚', 'user'),
  ('tobe@josei-katuyaku.co.jp', '戸部', 'user'),
  ('koaze@josei-katuyaku.co.jp', '小畑', 'user'),
  ('nishida@josei-katuyaku.co.jp', '西田', 'user'),
  ('ishii@josei-katuyaku.co.jp', '石井', 'user'),
  ('sasajima@josei-katuyaku.co.jp', '笹島', 'user')
ON CONFLICT (email) DO UPDATE
SET name = EXCLUDED.name,
    role = COALESCE(EXCLUDED.role, public.users.role);

-- 作成結果の確認
SELECT 
  id,
  email,
  name,
  role,
  created_at
FROM public.users
WHERE email IN (
  'yoshida@josei-katuyaku.co.jp',
  'goto@josei-katuyaku.co.jp',
  'takizawa@josei-katuyaku.co.jp',
  'matsuzawa@josei-katuyaku.co.jp',
  'suzuki@josei-katuyaku.co.jp',
  'ohtsuka@josei-katuyaku.co.jp',
  'tobe@josei-katuyaku.co.jp',
  'koaze@josei-katuyaku.co.jp',
  'nishida@josei-katuyaku.co.jp',
  'ishii@josei-katuyaku.co.jp',
  'sasajima@josei-katuyaku.co.jp'
)
ORDER BY email;

-- ========================================
-- 次のステップ: 認証ユーザー（auth.users）の作成
-- ========================================
-- 
-- 方法1: Supabaseダッシュボードから手動で作成
-- 1. Supabaseダッシュボード → Authentication → Users
-- 2. 「Add user」をクリック
-- 3. 各メールアドレスを入力してユーザーを作成
-- 4. 「Send magic link」または「Set password」でパスワードを設定
--
-- 方法2: パスワードリセットメールを送信
-- 1. Supabaseダッシュボード → Authentication → Users
-- 2. 各ユーザーを選択
-- 3. 「Send password reset email」をクリック
-- 4. ユーザーがメールからパスワードを設定
--
-- 方法3: Supabase Management APIを使用（推奨）
-- 以下のようなAPIリクエストを実行:
-- POST https://<your-project>.supabase.co/auth/v1/admin/users
-- Headers: {
--   "Authorization": "Bearer <service_role_key>",
--   "Content-Type": "application/json"
-- }
-- Body: {
--   "email": "yoshida@josei-katuyaku.co.jp",
--   "password": "temporary_password",
--   "email_confirm": true
-- }
-- ========================================

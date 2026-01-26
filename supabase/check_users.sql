-- ========================================
-- ユーザー作成結果の確認
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================

-- 1. public.usersの確認
SELECT 
  'public.users' as table_name,
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

-- 2. auth.usersの確認（認証ユーザー）
SELECT 
  'auth.users' as table_name,
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
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

-- 3. 統合確認（両方のテーブルを結合）
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  CASE 
    WHEN au.id IS NOT NULL THEN '✅ 認証ユーザー作成済み（ログイン可能）'
    ELSE '❌ 認証ユーザー未作成（ログイン不可）'
  END as auth_status,
  au.email_confirmed_at,
  u.created_at
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email IN (
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
ORDER BY u.email;

-- 4. サマリー
SELECT 
  COUNT(*) as total_users,
  COUNT(au.id) as auth_users_count,
  COUNT(*) - COUNT(au.id) as missing_auth_users
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email IN (
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
);

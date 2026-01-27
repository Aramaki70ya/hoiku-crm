-- ========================================
-- 瀧澤さんのログイン状態チェック
-- Supabase Dashboard → SQL Editor で実行
-- ========================================

SELECT 
  u.email,
  u.name,
  CASE 
    WHEN au.id IS NOT NULL THEN '✅ 認証ユーザーあり（ログイン可能なはず）'
    ELSE '❌ 認証ユーザーなし（ログイン不可）'
  END AS auth_status,
  au.email_confirmed_at,
  au.last_sign_in_at
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email IN ('takizawa@josei-katuyaku.co.jp', 'takizawa@hoiku-crm.local');

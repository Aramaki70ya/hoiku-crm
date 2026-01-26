-- ========================================
-- ユーザー名の確認スクリプト
-- 実際のusersテーブルに存在するユーザー名を確認
-- ========================================

-- 全ユーザーを確認
SELECT 
  '全ユーザー一覧' as info,
  u.id,
  u.email,
  u.name,
  u.role,
  CASE 
    WHEN au.id IS NOT NULL THEN '認証ユーザーあり'
    ELSE '認証ユーザーなし'
  END as auth_status
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
ORDER BY u.name;

-- 「小畑」「松沢」「滝沢」に似た名前を検索（部分一致）
SELECT 
  '類似ユーザー名検索' as info,
  u.id,
  u.email,
  u.name,
  u.role
FROM public.users u
WHERE 
  u.name LIKE '%小畑%' OR
  u.name LIKE '%松沢%' OR
  u.name LIKE '%滝沢%' OR
  u.name LIKE '%小畑%' OR
  u.name LIKE '%松澤%' OR
  u.name LIKE '%滝澤%' OR
  u.name LIKE '%小畠%' OR
  u.name LIKE '%松澤%' OR
  u.name LIKE '%瀧沢%' OR
  u.name LIKE '%瀧澤%'
ORDER BY u.name;

-- ダッシュボードで表示されている可能性のあるユーザー名を確認
-- （営業進捗状況に表示されているユーザー）
SELECT 
  '営業進捗に表示される可能性のあるユーザー' as info,
  DISTINCT u.name,
  COUNT(*) as user_count,
  array_agg(u.email) as emails
FROM public.users u
GROUP BY u.name
ORDER BY u.name;

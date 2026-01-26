-- ========================================
-- 特定ユーザーの削除スクリプト
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================
-- 
-- このスクリプトは、指定したユーザー（小畑、松沢、滝沢、緑、高岡 緑）を削除します。
-- 
-- 削除前に確認:
-- 1. 関連するcandidates.consultant_idをNULLに更新
-- 2. 関連するmemos.created_byをNULLに更新
-- 3. ユーザーを削除
-- ========================================

-- 削除対象ユーザーの確認（間違った表記のみ）
SELECT 
  '削除対象ユーザー確認（間違った表記）' as info,
  u.id,
  u.email,
  u.name,
  u.role,
  CASE 
    WHEN au.id IS NOT NULL THEN '認証ユーザーあり'
    ELSE '認証ユーザーなし'
  END as auth_status,
  (SELECT COUNT(*) FROM candidates WHERE consultant_id = u.id) as candidate_count,
  (SELECT COUNT(*) FROM memos WHERE created_by = u.id) as memo_count
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.name IN (
  '小畑',  -- 正しいのは「小畦」
  '松沢',  -- 正しいのは「松澤」
  '滝沢',  -- 正しいのは「瀧澤」
  '緑',
  '高岡 緑',
  '高岡緑'
)
ORDER BY u.name;

-- 削除処理
DO $$
DECLARE
  target_user RECORD;
  deleted_count INT := 0;
BEGIN
  -- 削除対象ユーザーをループ（間違った表記のみ）
  FOR target_user IN 
    SELECT id, email, name
    FROM public.users
    WHERE name IN (
      '小畑',  -- 正しいのは「小畦」
      '松沢',  -- 正しいのは「松澤」
      '滝沢',  -- 正しいのは「瀧澤」
      '緑',
      '高岡 緑',
      '高岡緑'
    )
  LOOP
    RAISE NOTICE '削除処理開始: % (ID: %, email: %)', target_user.name, target_user.id, target_user.email;
    
    -- 1. candidates.consultant_idをNULLに更新
    UPDATE candidates
    SET consultant_id = NULL
    WHERE consultant_id = target_user.id;
    
    RAISE NOTICE '  - candidates.consultant_idをNULLに更新しました';
    
    -- 2. memos.created_byをNULLに更新
    UPDATE memos
    SET created_by = NULL
    WHERE created_by = target_user.id;
    
    RAISE NOTICE '  - memos.created_byをNULLに更新しました';
    
    -- 3. public.usersから削除
    DELETE FROM public.users
    WHERE id = target_user.id;
    
    RAISE NOTICE '  - public.usersから削除しました';
    
    -- 4. auth.usersからも削除（存在する場合）
    DELETE FROM auth.users
    WHERE id = target_user.id;
    
    RAISE NOTICE '  - auth.usersから削除しました（存在した場合）';
    
    deleted_count := deleted_count + 1;
    RAISE NOTICE '削除完了: %', target_user.name;
  END LOOP;
  
  RAISE NOTICE '削除処理完了: %件のユーザーを削除しました', deleted_count;
END $$;

-- 削除結果の確認
SELECT 
  '削除結果確認（間違った表記）' as info,
  CASE 
    WHEN COUNT(*) = 0 THEN '削除成功（該当ユーザーなし）'
    ELSE '削除失敗（まだ存在するユーザーあり）'
  END as status,
  COUNT(*) as remaining_count,
  array_agg(name) as remaining_names
FROM public.users
WHERE name IN (
  '小畑',  -- 正しいのは「小畦」
  '松沢',  -- 正しいのは「松澤」
  '滝沢',  -- 正しいのは「瀧澤」
  '緑',
  '高岡 緑',
  '高岡緑'
);

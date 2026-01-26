-- ========================================
-- 重複ユーザーのマージスクリプト
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================
-- 
-- このスクリプトは、既存のusersテーブルのレコード（user+{hash}@hoiku.local形式）
-- と認証ユーザー（実際のメールアドレス）を名前でマッチングして統合します。
-- 
-- 処理内容:
-- 1. 既存のusersレコード（user+{hash}@hoiku.local形式）を特定
-- 2. 認証ユーザー（実際のメールアドレス）と名前でマッチング
-- 3. 既存レコードのIDを認証ユーザーのIDに更新
-- 4. 関連テーブル（candidates.consultant_idなど）も更新
-- 5. 重複レコードを削除
-- ========================================

-- まず、重複状況を確認
SELECT 
  '重複状況確認' as info,
  u1.id as old_id,
  u1.email as old_email,
  u1.name as name,
  u2.id as new_id,
  u2.email as new_email,
  CASE 
    WHEN au.id IS NOT NULL THEN '認証ユーザーあり'
    ELSE '認証ユーザーなし'
  END as auth_status
FROM public.users u1
LEFT JOIN public.users u2 ON u1.name = u2.name AND u1.email != u2.email
LEFT JOIN auth.users au ON u2.id = au.id
WHERE (u1.email LIKE 'user+%@hoiku-crm.local' OR u1.email LIKE '%@hoiku-crm.local')
  AND (u2.email NOT LIKE 'user+%@hoiku-crm.local' AND u2.email NOT LIKE '%@hoiku-crm.local')
ORDER BY u1.name;

-- マージ処理
DO $$
DECLARE
  old_user RECORD;
  new_user RECORD;
  updated_count INT := 0;
BEGIN
  -- 既存のusersレコード（user+{hash}@hoiku-crm.local形式）をループ
  FOR old_user IN 
    SELECT id, email, name, role
    FROM public.users
    WHERE email LIKE 'user+%@hoiku-crm.local' OR email LIKE '%@hoiku-crm.local'
  LOOP
    -- 同じ名前で、実際のメールアドレスを持つユーザーを検索
    SELECT id, email, name, role INTO new_user
    FROM public.users
    WHERE name = old_user.name
      AND (email NOT LIKE 'user+%@hoiku-crm.local' AND email NOT LIKE '%@hoiku-crm.local')
      AND id IN (SELECT id FROM auth.users) -- 認証ユーザーが存在するもの
    LIMIT 1;
    
    -- マッチするユーザーが見つかった場合
    IF new_user.id IS NOT NULL THEN
      RAISE NOTICE 'マージ対象: % (旧ID: %, 新ID: %)', old_user.name, old_user.id, new_user.id;
      
      -- 1. candidates.consultant_idを更新（UUID型）
      UPDATE candidates
      SET consultant_id = new_user.id
      WHERE consultant_id = old_user.id;
      
      -- 2. その他の関連テーブルも更新（必要に応じて）
      -- memos.created_by（UUID型）
      UPDATE memos
      SET created_by = new_user.id
      WHERE created_by = old_user.id;
      
      -- timeline_events.created_by_user_id（存在する場合）
      -- UPDATE timeline_events
      -- SET created_by_user_id = new_user.id::text
      -- WHERE created_by_user_id = old_user.id::text;
      
      -- 3. 既存のusersレコードを削除
      DELETE FROM public.users
      WHERE id = old_user.id;
      
      updated_count := updated_count + 1;
      RAISE NOTICE 'マージ完了: %', old_user.name;
    ELSE
      RAISE NOTICE 'マッチする認証ユーザーが見つかりません: % (email: %)', old_user.name, old_user.email;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'マージ処理完了: %件のユーザーをマージしました', updated_count;
END $$;

-- マージ結果の確認
SELECT 
  'マージ結果確認' as info,
  u.id,
  u.email,
  u.name,
  u.role,
  CASE 
    WHEN au.id IS NOT NULL THEN '認証ユーザーあり'
    ELSE '認証ユーザーなし'
  END as auth_status,
  (SELECT COUNT(*) FROM candidates WHERE consultant_id = u.id) as candidate_count
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
ORDER BY u.name;

-- 残っている重複レコードの確認（念のため）
SELECT 
  '残存重複確認' as info,
  name,
  COUNT(*) as count,
  array_agg(email) as emails,
  array_agg(id::text) as ids
FROM public.users
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY name;

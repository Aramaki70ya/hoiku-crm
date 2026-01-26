-- ========================================
-- ユーザー作成SQL（ログイン用ユーザー作成）
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================
-- 
-- このスクリプトは、システムにログインして使うユーザー（コンサルタント/担当者）を作成します。
-- 
-- 作成されるテーブル:
-- 1. auth.users (認証用) - ログインに必要（メールアドレス + パスワードでログイン可能）
-- 2. public.users (アプリケーション用) - ユーザー情報管理用（担当者情報として使用）
--
-- 初期パスワード: "password123" （ログイン後に変更してください）
-- 
-- ⚠️ 注意: auth.usersへの直接INSERTは、Supabaseのバージョンによっては
--    制限されている可能性があります。うまくいかない場合は、
--    scripts/create-auth-users.js を使用するか、
--    Supabaseダッシュボードから手動でユーザーを作成してください。
-- ========================================

-- pgcrypto拡張機能を有効化（パスワードハッシュ化に必要）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 一時パスワード（ログイン後に変更してください）
-- デフォルト: "password123"
DO $$
DECLARE
  default_password TEXT := 'password123';
  user_emails TEXT[] := ARRAY[
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
  ];
  user_names TEXT[] := ARRAY[
    '吉田',
    '後藤',
    '滝沢',
    '松沢',
    '鈴木',
    '大塚',
    '戸部',
    '小畑',
    '西田',
    '石井',
    '笹島'
  ];
  user_email TEXT;
  user_name TEXT;
  user_id UUID;
  encrypted_pwd TEXT;
  i INT;
BEGIN
  -- パスワードをハッシュ化
  encrypted_pwd := crypt(default_password, gen_salt('bf'));
  
  -- 各ユーザーを作成
  FOR i IN 1..array_length(user_emails, 1) LOOP
    user_email := user_emails[i];
    user_name := user_names[i];
    
    -- 既存ユーザーのチェック
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NULL THEN
      -- auth.usersにユーザーを作成
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        user_email,
        encrypted_pwd,
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
      )
      RETURNING id INTO user_id;
      
      RAISE NOTICE 'Created auth user: % (ID: %)', user_email, user_id;
    ELSE
      RAISE NOTICE 'User already exists in auth.users: % (ID: %)', user_email, user_id;
    END IF;
    
    -- public.usersにユーザーを作成（既存の場合は更新）
    INSERT INTO public.users (id, email, name, role)
    VALUES (user_id, user_email, user_name, 'user')
    ON CONFLICT (email) DO UPDATE
    SET name = EXCLUDED.name,
        role = COALESCE(EXCLUDED.role, public.users.role);
    
    RAISE NOTICE 'Created/Updated public user: %', user_email;
  END LOOP;
END $$;

-- 作成結果の確認
SELECT 
  u.id,
  u.email,
  u.name,
  u.role,
  u.created_at,
  CASE 
    WHEN au.id IS NOT NULL THEN '認証ユーザー作成済み'
    ELSE '認証ユーザー未作成'
  END as auth_status
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

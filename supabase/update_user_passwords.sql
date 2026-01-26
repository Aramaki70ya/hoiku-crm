-- ========================================
-- ユーザーパスワード更新SQL
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================
-- 
-- 各ユーザーに異なるパスワードを設定します。
-- このスクリプトを実行する前に、create_users.sqlでユーザーを作成しておいてください。
-- ========================================

-- pgcrypto拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ユーザーとパスワードのマッピング
DO $$
DECLARE
  user_passwords RECORD;
  encrypted_pwd TEXT;
BEGIN
  -- 各ユーザーのパスワードを更新
  FOR user_passwords IN 
    SELECT 
      email,
      password
    FROM (VALUES
      ('yoshida@josei-katuyaku.co.jp', 'Yoshida2025!'),
      ('goto@josei-katuyaku.co.jp', 'Goto2025!'),
      ('takizawa@josei-katuyaku.co.jp', 'Takizawa2025!'),
      ('matsuzawa@josei-katuyaku.co.jp', 'Matsuzawa2025!'),
      ('suzuki@josei-katuyaku.co.jp', 'Suzuki2025!'),
      ('ohtsuka@josei-katuyaku.co.jp', 'Ohtsuka2025!'),
      ('tobe@josei-katuyaku.co.jp', 'Tobe2025!'),
      ('koaze@josei-katuyaku.co.jp', 'Koaze2025!'),
      ('nishida@josei-katuyaku.co.jp', 'Nishida2025!'),
      ('ishii@josei-katuyaku.co.jp', 'Ishii2025!'),
      ('sasajima@josei-katuyaku.co.jp', 'Sasajima2025!')
    ) AS t(email, password)
  LOOP
    -- パスワードをハッシュ化
    encrypted_pwd := crypt(user_passwords.password, gen_salt('bf'));
    
    -- auth.usersのパスワードを更新
    UPDATE auth.users
    SET 
      encrypted_password = encrypted_pwd,
      updated_at = NOW()
    WHERE email = user_passwords.email;
    
    IF FOUND THEN
      RAISE NOTICE 'パスワード更新: %', user_passwords.email;
    ELSE
      RAISE NOTICE '警告: ユーザーが見つかりません: %', user_passwords.email;
    END IF;
  END LOOP;
END $$;

-- 更新結果の確認
SELECT 
  email,
  CASE 
    WHEN encrypted_password IS NOT NULL THEN '✅ パスワード設定済み'
    ELSE '❌ パスワード未設定'
  END as password_status,
  email_confirmed_at,
  updated_at
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

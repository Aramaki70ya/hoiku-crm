-- ========================================
-- 瀧澤さんログイン完全修正（1本で全部やる）
-- Supabase Dashboard → SQL Editor で実行
-- ========================================
-- ・public.users のメール統一（hoiku-crm.local → josei-katuyaku.co.jp）
-- ・auth.users のメールも同様に更新
-- ・auth のパスワードを Takizawa2025! に設定

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. public.users
UPDATE public.users
SET email = 'takizawa@josei-katuyaku.co.jp'
WHERE email = 'takizawa@hoiku-crm.local';

-- 2. auth.users のメール更新（ログインは auth を見るのでここが必須）
UPDATE auth.users
SET email = 'takizawa@josei-katuyaku.co.jp', updated_at = NOW()
WHERE email = 'takizawa@hoiku-crm.local';

-- 3. パスワード設定（josei-katuyaku のメールで探す＝上記更新後）
UPDATE auth.users
SET 
  encrypted_password = crypt('Takizawa2025!', gen_salt('bf')),
  updated_at = NOW()
WHERE email = 'takizawa@josei-katuyaku.co.jp';

-- 確認
SELECT id, email, name, role FROM public.users WHERE name = '瀧澤';
SELECT id, email, 
  CASE WHEN encrypted_password IS NOT NULL THEN '✅ パスワード設定済' ELSE '❌ 未設定' END AS pwd,
  updated_at 
FROM auth.users WHERE email = 'takizawa@josei-katuyaku.co.jp';

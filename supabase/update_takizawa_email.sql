-- ========================================
-- 瀧澤さんのメールを @hoiku-crm.local → @josei-katuyaku.co.jp に統一
-- Supabase Dashboard → SQL Editor で実行
-- ========================================
-- シードデータでは takizawa@hoiku-crm.local だったが、
-- ログイン用に takizawa@josei-katuyaku.co.jp に合わせる。

UPDATE public.users
SET email = 'takizawa@josei-katuyaku.co.jp'
WHERE email = 'takizawa@hoiku-crm.local';

-- 確認
SELECT id, email, name, role FROM public.users WHERE name = '瀧澤';

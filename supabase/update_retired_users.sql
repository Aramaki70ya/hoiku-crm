-- ========================================
-- 退職日設定（担当者の非表示）
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================
-- ルール: users.retired_at（退職日）が過去または当日だと非表示
-- 例: 2026-01-31 の場合、1/31 までは表示、2/1 から非表示

-- 笹嶋/笹島（表示しない対象）
UPDATE public.users
SET retired_at = '2025-12-31'
WHERE name IN ('笹嶋', '笹島');

-- 大塚は2026年1月末で退職
UPDATE public.users
SET retired_at = '2026-01-31'
WHERE name = '大塚';

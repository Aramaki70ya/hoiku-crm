-- 成約キャンセル運用: キャンセル操作日時・退職日・返金率
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS resignation_date date,
  ADD COLUMN IF NOT EXISTS refund_rate integer;

COMMENT ON COLUMN public.contracts.cancelled_at IS 'キャンセル操作日時（キャンセルリストの月次表示用）';
COMMENT ON COLUMN public.contracts.resignation_date IS '退職日';
COMMENT ON COLUMN public.contracts.refund_rate IS '返金率（パーセント整数 例: 50, 80, 100）';

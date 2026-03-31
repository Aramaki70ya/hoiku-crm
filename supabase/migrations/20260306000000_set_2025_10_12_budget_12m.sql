-- 2025年10月・11月・12月の予算を1,200万円に設定
INSERT INTO monthly_targets (
  year_month,
  total_sales_budget,
  registration_to_first_contact_rate,
  first_contact_to_interview_rate,
  interview_to_closed_rate,
  closed_unit_price,
  updated_at
)
VALUES
  ('2025-10', 12000000, 0.65, 0.80, 0.60, 600000, now()),
  ('2025-11', 12000000, 0.65, 0.80, 0.60, 600000, now()),
  ('2025-12', 12000000, 0.65, 0.80, 0.60, 600000, now())
ON CONFLICT (year_month) DO UPDATE SET
  total_sales_budget = EXCLUDED.total_sales_budget,
  registration_to_first_contact_rate = EXCLUDED.registration_to_first_contact_rate,
  first_contact_to_interview_rate = EXCLUDED.first_contact_to_interview_rate,
  interview_to_closed_rate = EXCLUDED.interview_to_closed_rate,
  closed_unit_price = EXCLUDED.closed_unit_price,
  updated_at = EXCLUDED.updated_at;

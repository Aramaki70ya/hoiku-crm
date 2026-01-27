-- ========================================
-- 1月分（2026_01）の成約データをcontractsテーブルに追加
-- Supabase Dashboard → SQL Editor で実行してください
-- ========================================
-- 前提: stg_member_monthlyテーブルに1月分のデータがインポート済みであること
-- 月次マージシートから「内定承諾」かつ「成約金額」が0以外のデータを抽出してcontractsテーブルに追加
-- ========================================

-- 1月分の成約データを抽出してcontractsテーブルに追加
WITH january_contracts AS (
  SELECT DISTINCT ON (candidate_id)
    candidate_id,
    member_name,
    assigned_date,
    candidate_name,
    contract_amount,
    expected_amount
  FROM stg_member_monthly
  WHERE month_text = '2026_01'
    AND category = '内定承諾'
    AND contract_amount IS NOT NULL
    AND contract_amount != ''
    AND contract_amount != '0'
    AND candidate_id IS NOT NULL
    AND candidate_id != ''
  ORDER BY candidate_id, assigned_date DESC
)
INSERT INTO contracts (
  candidate_id,
  accepted_date,
  revenue_including_tax,
  revenue_excluding_tax,
  placement_company,
  note
)
SELECT
  jc.candidate_id,
  -- 承諾日: 割り振り日から推測、または2026年1月1日をデフォルトとする
  COALESCE(
    CASE 
      WHEN jc.assigned_date ~ '^2026/1/' THEN TO_DATE(jc.assigned_date, 'YYYY/MM/DD')
      WHEN jc.assigned_date ~ '^2026/01/' THEN TO_DATE(jc.assigned_date, 'YYYY/MM/DD')
      ELSE NULL
    END,
    '2026-01-01'::DATE
  ) as accepted_date,
  -- 成約金額（税込）: 月次マージシートの成約金額は税込として扱う
  NULLIF(REPLACE(REPLACE(jc.contract_amount, ',', ''), '"', ''), '')::INTEGER as revenue_including_tax,
  -- 成約金額（税抜）: 税込から消費税10%を引いて計算（税込 ÷ 1.1）
  ROUND(NULLIF(REPLACE(REPLACE(jc.contract_amount, ',', ''), '"', ''), '')::INTEGER / 1.1)::INTEGER as revenue_excluding_tax,
  -- 入職先: 未設定（月次マージシートには園名情報がない）
  '未設定' as placement_company,
  -- 備考: 担当者名と求職者名を記録
  CONCAT('担当: ', jc.member_name, ', 求職者: ', jc.candidate_name) as note
FROM january_contracts jc
WHERE EXISTS (SELECT 1 FROM candidates c WHERE c.id = jc.candidate_id)
  AND NOT EXISTS (
    SELECT 1 FROM contracts ct 
    WHERE ct.candidate_id = jc.candidate_id
      AND ct.accepted_date >= '2026-01-01'::DATE
      AND ct.accepted_date < '2026-02-01'::DATE
  );

-- 結果確認
SELECT 
  '1月分成約データ追加結果' as info,
  COUNT(*) as total_contracts,
  SUM(revenue_including_tax) as total_revenue,
  COUNT(*) FILTER (WHERE revenue_including_tax IS NOT NULL) as with_amount
FROM contracts
WHERE accepted_date >= '2026-01-01'::DATE
  AND accepted_date < '2026-02-01'::DATE;

-- 担当者別の成約額確認
SELECT 
  u.name as consultant_name,
  COUNT(*) as contract_count,
  SUM(c.revenue_including_tax) as total_revenue
FROM contracts c
JOIN candidates ca ON ca.id = c.candidate_id
JOIN users u ON u.id = ca.consultant_id
WHERE c.accepted_date >= '2026-01-01'::DATE
  AND c.accepted_date < '2026-02-01'::DATE
GROUP BY u.name
ORDER BY total_revenue DESC;

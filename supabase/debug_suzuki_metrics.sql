-- 鈴木さんの担当・初回の計算をデバッグするSQL
-- 問題: 初回が担当を超えている

-- 1. 鈴木さんの全データを確認（2026年1月）
SELECT 
  candidate_id,
  member_name,
  assigned_date,
  status,
  month_text,
  COUNT(*) as row_count
FROM stg_member_monthly
WHERE month_text = '2026_01'
  AND member_name = '鈴木'
GROUP BY candidate_id, member_name, assigned_date, status, month_text
ORDER BY candidate_id, assigned_date;

-- 2. 担当の計算（割り振り日が2026年1月のユニークなcandidate_id数）
SELECT 
  COUNT(DISTINCT candidate_id) as 担当数,
  COUNT(*) as 総行数
FROM stg_member_monthly
WHERE month_text = '2026_01'
  AND member_name = '鈴木'
  AND assigned_date IS NOT NULL
  AND assigned_date != ''
  AND (
    -- 日付形式のパターンを考慮
    assigned_date LIKE '2026/1/%' OR
    assigned_date LIKE '2026/01/%' OR
    assigned_date LIKE '2026-1-%' OR
    assigned_date LIKE '2026-01-%' OR
    (TO_DATE(assigned_date, 'YYYY/MM/DD') >= '2026-01-01'::DATE
     AND TO_DATE(assigned_date, 'YYYY/MM/DD') < '2026-02-01'::DATE)
  );

-- 3. 初回の計算（割り振り日が2026年1月かつ、ステータスが初回連絡済み以降）
-- 初回連絡済み以降のステータス:
-- '提案求人選定中', '求人提案済（返信待ち）', '書類選考中', '面接日程調整中', 
-- '面接確定済', '面接実施済（結果待ち）', '内定獲得（承諾確認中）', 
-- '内定承諾（成約）', '内定辞退', '音信不通', '追客中（中長期フォロー）', 'クローズ（終了）'

SELECT 
  COUNT(DISTINCT candidate_id) as 初回数,
  COUNT(*) as 総行数
FROM stg_member_monthly
WHERE month_text = '2026_01'
  AND member_name = '鈴木'
  AND assigned_date IS NOT NULL
  AND assigned_date != ''
  AND status IS NOT NULL
  AND status != ''
  AND (
    -- 日付形式のパターンを考慮
    assigned_date LIKE '2026/1/%' OR
    assigned_date LIKE '2026/01/%' OR
    assigned_date LIKE '2026-1-%' OR
    assigned_date LIKE '2026-01-%' OR
    (TO_DATE(assigned_date, 'YYYY/MM/DD') >= '2026-01-01'::DATE
     AND TO_DATE(assigned_date, 'YYYY/MM/DD') < '2026-02-01'::DATE)
  )
  AND (
    status LIKE '%提案求人選定中%' OR
    status LIKE '%求人提案済%' OR
    status LIKE '%書類選考中%' OR
    status LIKE '%面接日程調整中%' OR
    status LIKE '%面接確定済%' OR
    status LIKE '%面接実施済%' OR
    status LIKE '%内定獲得%' OR
    status LIKE '%内定承諾%' OR
    status LIKE '%内定辞退%' OR
    status LIKE '%音信不通%' OR
    status LIKE '%追客中%' OR
    status LIKE '%クローズ%'
  );

-- 4. 問題のあるデータを特定（assigned_dateが当月でないのに、ステータスが初回連絡済み以降のもの）
SELECT 
  candidate_id,
  assigned_date,
  status,
  CASE 
    WHEN assigned_date IS NULL OR assigned_date = '' THEN 'assigned_dateが空'
    WHEN assigned_date NOT LIKE '2026/1/%' 
         AND assigned_date NOT LIKE '2026/01/%'
         AND assigned_date NOT LIKE '2026-1-%'
         AND assigned_date NOT LIKE '2026-01-%'
         AND NOT (TO_DATE(assigned_date, 'YYYY/MM/DD') >= '2026-01-01'::DATE
                  AND TO_DATE(assigned_date, 'YYYY/MM/DD') < '2026-02-01'::DATE)
    THEN 'assigned_dateが当月でない'
    ELSE 'OK'
  END as date_check,
  CASE
    WHEN status LIKE '%提案求人選定中%' OR
         status LIKE '%求人提案済%' OR
         status LIKE '%書類選考中%' OR
         status LIKE '%面接日程調整中%' OR
         status LIKE '%面接確定済%' OR
         status LIKE '%面接実施済%' OR
         status LIKE '%内定獲得%' OR
         status LIKE '%内定承諾%' OR
         status LIKE '%内定辞退%' OR
         status LIKE '%音信不通%' OR
         status LIKE '%追客中%' OR
         status LIKE '%クローズ%'
    THEN '初回連絡済み以降'
    ELSE '初回連絡前'
  END as status_check
FROM stg_member_monthly
WHERE month_text = '2026_01'
  AND member_name = '鈴木'
  AND status IS NOT NULL
  AND status != ''
ORDER BY candidate_id, assigned_date;

-- 5. 同じcandidate_idで複数の行がある場合の確認
SELECT 
  candidate_id,
  COUNT(*) as row_count,
  COUNT(DISTINCT assigned_date) as distinct_assigned_dates,
  STRING_AGG(DISTINCT assigned_date, ', ') as assigned_dates,
  STRING_AGG(DISTINCT status, ' | ') as statuses
FROM stg_member_monthly
WHERE month_text = '2026_01'
  AND member_name = '鈴木'
GROUP BY candidate_id
HAVING COUNT(*) > 1
ORDER BY row_count DESC;

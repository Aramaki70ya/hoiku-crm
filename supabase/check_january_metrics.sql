-- ========================================
-- 1月分の営業進捗指標を確認するSQL
-- 月次マージシート（stg_member_monthly）から計算
-- ========================================

-- 1. 1月分のデータが存在するか確認
SELECT 
  month_text,
  COUNT(*) as 総レコード数,
  COUNT(DISTINCT member_name) as 担当者数,
  COUNT(DISTINCT candidate_id) as 求職者数
FROM stg_member_monthly
WHERE month_text = '2026_01'
GROUP BY month_text;

-- 2. 担当者ごとの基本統計
SELECT 
  member_name as 担当者,
  COUNT(DISTINCT candidate_id) as 総レコード数,
  COUNT(DISTINCT CASE WHEN assigned_date IS NOT NULL AND assigned_date != '' THEN candidate_id END) as 割り振り日あり,
  COUNT(DISTINCT CASE WHEN interview_flag IS NOT NULL AND UPPER(interview_flag) = 'TRUE' THEN candidate_id END) as 面接フラグTRUE,
  COUNT(DISTINCT CASE WHEN status = '🟢 内定承諾（成約）' THEN candidate_id END) as 成約ステータス
FROM stg_member_monthly
WHERE month_text = '2026_01'
GROUP BY member_name
ORDER BY 総レコード数 DESC;

-- 3. 担当者ごとの営業進捗指標（詳細計算）
WITH monthly_data AS (
  SELECT 
    member_name,
    candidate_id,
    assigned_date,
    status,
    interview_flag,
    month_text
  FROM stg_member_monthly
  WHERE month_text = '2026_01'
)
SELECT 
  member_name as 担当者,
  -- 担当: 割り振り日が2026年1月の数
  COUNT(DISTINCT CASE 
    WHEN assigned_date IS NOT NULL 
      AND assigned_date != ''
      AND (
        assigned_date LIKE '2026/1/%' OR
        assigned_date LIKE '2026/01/%' OR
        (TO_DATE(assigned_date, 'YYYY/MM/DD') >= '2026-01-01'::DATE
         AND TO_DATE(assigned_date, 'YYYY/MM/DD') < '2026-02-01'::DATE)
      ) THEN candidate_id
  END) as 担当,
  -- 初回: 割り振り日が2026年1月かつ、ステータスが初回連絡済み以降
  COUNT(DISTINCT CASE 
    WHEN assigned_date IS NOT NULL 
      AND assigned_date != ''
      AND (
        assigned_date LIKE '2026/1/%' OR
        assigned_date LIKE '2026/01/%' OR
        (TO_DATE(assigned_date, 'YYYY/MM/DD') >= '2026-01-01'::DATE
         AND TO_DATE(assigned_date, 'YYYY/MM/DD') < '2026-02-01'::DATE)
      )
      AND status IN (
        '🟣 提案求人選定中',
        '🟤 求人提案済（返信待ち）',
        '🟢 書類選考中',
        '🟢 面接日程調整中',
        '🟢 面接確定済',
        '🟠 面接実施済（結果待ち）',
        '🟣 内定獲得（承諾確認中）',
        '🟢 内定承諾（成約）',
        '🔴 内定辞退',
        '⚪ 音信不通',
        '⚪ 追客中（中長期フォロー）',
        '⚫ クローズ（終了）'
      ) THEN candidate_id
  END) as 初回,
  -- 面接: 面接フラグ=TRUEかつ、ステータスが面接確定以降
  COUNT(DISTINCT CASE 
    WHEN UPPER(interview_flag) = 'TRUE'
    AND status IN (
      '🟢 面接確定済',
      '🟠 面接実施済（結果待ち）',
      '🟣 内定獲得（承諾確認中）',
      '🟢 内定承諾（成約）',
      '🔴 内定辞退'
    ) THEN candidate_id
  END) as 面接,
  -- 成約: 面接フラグ=TRUEかつ、ステータスが「内定承諾（成約）」
  COUNT(DISTINCT CASE 
    WHEN UPPER(interview_flag) = 'TRUE'
    AND status = '🟢 内定承諾（成約）' THEN candidate_id
  END) as 成約
FROM monthly_data
GROUP BY member_name
ORDER BY 担当 DESC;

-- 4. 面接フラグの詳細確認（瀧澤の例）
SELECT 
  member_name,
  candidate_id,
  assigned_date,
  status,
  interview_flag,
  CASE 
    WHEN interview_flag IS NULL THEN 'NULL'
    WHEN interview_flag = '' THEN '空文字'
    ELSE interview_flag::TEXT
  END as interview_flag_detail
FROM stg_member_monthly
WHERE month_text = '2026_01'
  AND member_name = '瀧澤'
  AND status IN (
    '🟢 面接確定済',
    '🟠 面接実施済（結果待ち）',
    '🟣 内定獲得（承諾確認中）',
    '🟢 内定承諾（成約）',
    '🔴 内定辞退'
  )
ORDER BY candidate_id;

-- 5. 割り振り日の形式確認
SELECT 
  member_name,
  assigned_date,
  COUNT(*) as 件数
FROM stg_member_monthly
WHERE month_text = '2026_01'
  AND assigned_date IS NOT NULL
  AND assigned_date != ''
GROUP BY member_name, assigned_date
ORDER BY member_name, assigned_date
LIMIT 20;

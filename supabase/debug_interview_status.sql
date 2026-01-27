-- ========================================
-- 面接状況のデータ整合性を確認するSQL
-- 月次マージシートから面接状況を計算して、期待値と比較
-- 
-- ステータス一覧:
-- 🟡 初回連絡中
-- ⚪ 連絡つかず（初回未接触）
-- 🟣 提案求人選定中
-- 🟤 求人提案済（返信待ち）
-- 🟢 書類選考中
-- 🟢 面接日程調整中
-- 🟢 面接確定済
-- 🟠 面接実施済（結果待ち）
-- 🟣 内定獲得（承諾確認中）
-- 🟢 内定承諾（成約）
-- 🔴 内定辞退
-- ⚪ 音信不通
-- ⚪ 追客中（中長期フォロー）
-- ⚫ クローズ（終了）
-- ========================================

-- 1. 1月分の面接フラグ=TRUEのデータを確認
SELECT 
  member_name as "担当者",
  candidate_name as "求職者名",
  assigned_date as "割り振り日",
  status as "ステータス",
  interview_flag as "面接フラグ",
  prob_current as "ヨミ確度(当月)",
  expected_amount as "ヨミ金額",
  month_text as "年月"
FROM stg_member_monthly
WHERE month_text = '2026_01'
  AND (
    interview_flag IS NOT NULL 
    AND interview_flag != ''
    AND (
      UPPER(interview_flag::TEXT) = 'TRUE' 
      OR interview_flag::TEXT = '1'
      OR interview_flag::TEXT = 'YES'
    )
  )
ORDER BY member_name, candidate_name;

-- 2. 担当者ごとの面接状況集計（期待値）
WITH interview_data AS (
  SELECT 
    member_name,
    candidate_name,
    status,
    prob_current,
    expected_amount,
    interview_flag
  FROM stg_member_monthly
  WHERE month_text = '2026_01'
    AND (
      interview_flag IS NOT NULL 
      AND interview_flag != ''
      AND (
        UPPER(interview_flag::TEXT) = 'TRUE' 
        OR interview_flag::TEXT = '1'
        OR interview_flag::TEXT = 'YES'
      )
    )
)
SELECT 
  member_name as "担当者",
  -- 調整中: 🟢 面接日程調整中
  COUNT(DISTINCT CASE WHEN status = '🟢 面接日程調整中' THEN candidate_name END) as "調整中_件数",
  STRING_AGG(DISTINCT CASE WHEN status = '🟢 面接日程調整中' THEN candidate_name END, ', ') as "調整中_氏名",
  -- 面接前: 🟢 面接確定済
  COUNT(DISTINCT CASE WHEN status = '🟢 面接確定済' THEN candidate_name END) as "面接前_件数",
  STRING_AGG(DISTINCT CASE WHEN status = '🟢 面接確定済' THEN candidate_name END, ', ') as "面接前_氏名",
  -- 結果待ち: 🟠 面接実施済（結果待ち）
  COUNT(DISTINCT CASE WHEN status = '🟠 面接実施済（結果待ち）' THEN candidate_name END) as "結果待ち_件数",
  STRING_AGG(DISTINCT CASE WHEN status = '🟠 面接実施済（結果待ち）' THEN candidate_name END, ', ') as "結果待ち_氏名",
  -- 本人返事待ち: 🟣 内定獲得（承諾確認中）
  COUNT(DISTINCT CASE WHEN status = '🟣 内定獲得（承諾確認中）' THEN candidate_name END) as "本人返事待ち_件数",
  STRING_AGG(DISTINCT CASE WHEN status = '🟣 内定獲得（承諾確認中）' THEN candidate_name END, ', ') as "本人返事待ち_氏名"
FROM interview_data
GROUP BY member_name
ORDER BY member_name;

-- 3. 瀧澤の詳細データ（例）
SELECT 
  candidate_name as "求職者名",
  status as "ステータス",
  prob_current as "ヨミ確度",
  expected_amount as "ヨミ金額",
  interview_flag as "面接フラグ",
  assigned_date as "割り振り日"
FROM stg_member_monthly
WHERE month_text = '2026_01'
  AND member_name = '瀧澤'
  AND (
    interview_flag IS NOT NULL 
    AND interview_flag != ''
    AND (
      UPPER(interview_flag::TEXT) = 'TRUE' 
      OR interview_flag::TEXT = '1'
      OR interview_flag::TEXT = 'YES'
    )
  )
ORDER BY status, candidate_name;

-- 4. 面接フラグの値の種類を確認
SELECT 
  interview_flag,
  COUNT(*) as "件数",
  COUNT(DISTINCT member_name) as "担当者数"
FROM stg_member_monthly
WHERE month_text = '2026_01'
GROUP BY interview_flag
ORDER BY "件数" DESC;

-- 5. ステータスの値の種類を確認（面接フラグ=TRUEの場合）
SELECT 
  status,
  COUNT(*) as "件数",
  COUNT(DISTINCT member_name) as "担当者数",
  COUNT(DISTINCT candidate_name) as "求職者数"
FROM stg_member_monthly
WHERE month_text = '2026_01'
  AND (
    interview_flag IS NOT NULL 
    AND interview_flag != ''
    AND (
      UPPER(interview_flag::TEXT) = 'TRUE' 
      OR interview_flag::TEXT = '1'
      OR interview_flag::TEXT = 'YES'
    )
  )
GROUP BY status
ORDER BY "件数" DESC;

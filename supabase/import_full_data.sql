-- ========================================
-- 元データCSVから本テーブルへ一括反映（完全版）
-- 実行順序:
-- 1) ステージングテーブル作成
-- 2) SupabaseでCSVをImport
-- 3) 本テーブルへ反映
-- ========================================

-- ========================================
-- Step 0: （必要なら）リセット
-- ========================================
-- 注意: 本番データを消すので、必要な時だけ実行
-- DELETE FROM interviews;
-- DELETE FROM contracts;
-- DELETE FROM projects;
-- DELETE FROM candidates;
-- DELETE FROM sources;
-- DELETE FROM users;

-- ========================================
-- Step 1: ステージングテーブル作成
-- ========================================
CREATE TABLE IF NOT EXISTS stg_contacts (
  consultant_name TEXT,
  source_name TEXT,
  registered_at TEXT,
  status_text TEXT,
  candidate_id TEXT,
  candidate_name TEXT,
  phone TEXT,
  email TEXT,
  birth_date TEXT,
  age TEXT,
  prefecture TEXT,
  address TEXT,
  employment_type TEXT,
  qualification TEXT,
  desired_job_type TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS stg_member_sheet (
  member_name TEXT,
  candidate_id TEXT,
  assigned_date TEXT,
  candidate_name TEXT,
  lead_source TEXT,
  category TEXT,
  status_text TEXT,
  expected_amount TEXT,
  prob_current TEXT,
  prob_next TEXT,
  contract_amount TEXT,
  interview_flag TEXT,
  interview_flag_date TEXT,
  interview_days TEXT,
  contract_date TEXT,
  area TEXT,
  interview_date TEXT,
  garden_name TEXT,
  corporation_name TEXT,
  concurrent TEXT
);

CREATE TABLE IF NOT EXISTS stg_member_monthly (
  month_text TEXT,
  member_name TEXT,
  candidate_id TEXT,
  assigned_date TEXT,
  candidate_name TEXT,
  lead_source TEXT,
  category TEXT,
  status TEXT,
  expected_amount TEXT,
  prob_current TEXT,
  prob_next TEXT,
  contract_amount TEXT,
  interview_flag TEXT
);

CREATE TABLE IF NOT EXISTS stg_contracts (
  candidate_id TEXT,
  accepted_date TEXT,
  employment_restriction_until TEXT,
  candidate_name TEXT,
  source_name TEXT,
  consultant_name TEXT,
  employment_type TEXT,
  job_type TEXT,
  registered_at TEXT,
  payment_date TEXT,
  revenue_excluding_tax TEXT,
  revenue_including_tax TEXT,
  invoice_sent_date TEXT,
  calculation_basis TEXT,
  document_url TEXT,
  placement_company TEXT
);

-- ========================================
-- Step 2: CSVをImport（Supabase Table Editor）
-- ========================================
-- stg_contacts.csv
-- stg_member_sheet.csv
-- stg_member_monthly.csv
-- stg_contracts.csv

-- ========================================
-- Step 3: users / sources を作成
-- ========================================
WITH raw_names AS (
  SELECT consultant_name AS name FROM stg_contacts
  UNION ALL
  SELECT member_name FROM stg_member_sheet
  UNION ALL
  SELECT member_name FROM stg_member_monthly
  UNION ALL
  SELECT consultant_name FROM stg_contracts
),
normalized_names AS (
  SELECT DISTINCT NULLIF(TRIM(SPLIT_PART(name, '・', 1)), '') AS name
  FROM raw_names
  WHERE name IS NOT NULL AND name != '' AND name != 'なし'
)
INSERT INTO users (email, name, role)
SELECT
  'user+' || md5(name) || '@hoiku.local',
  name,
  'user'
FROM normalized_names
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name;

WITH raw_sources AS (
  SELECT source_name AS name FROM stg_contacts
  UNION ALL
  SELECT lead_source FROM stg_member_sheet
  UNION ALL
  SELECT lead_source FROM stg_member_monthly
  UNION ALL
  SELECT source_name FROM stg_contracts
),
normalized_sources AS (
  SELECT DISTINCT NULLIF(TRIM(name), '') AS name
  FROM raw_sources
  WHERE name IS NOT NULL AND name != '' AND name != '#N/A'
)
INSERT INTO sources (name, category)
SELECT name, NULL
FROM normalized_sources
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- Step 4: candidates を作成（求職者管理ベース）
-- ========================================
INSERT INTO candidates (
  id,
  name,
  phone,
  email,
  birth_date,
  age,
  prefecture,
  address,
  qualification,
  desired_employment_type,
  desired_job_type,
  status,
  registered_at,
  consultant_id,
  source_id,
  memo
)
SELECT DISTINCT ON (c.candidate_id)
  c.candidate_id,
  NULLIF(c.candidate_name, ''),
  NULLIF(REGEXP_REPLACE(c.phone, '\D', '', 'g'), ''),
  NULLIF(c.email, ''),
  CASE
    WHEN c.birth_date ~ '^\d{4}-\d{2}-\d{2}$' THEN c.birth_date::date
    WHEN c.birth_date ~ '^\d{4}/\d{1,2}/\d{1,2}$' THEN TO_DATE(c.birth_date, 'YYYY/MM/DD')
    ELSE NULL
  END,
  CASE WHEN c.age ~ '^\d+$' THEN c.age::integer ELSE NULL END,
  NULLIF(c.prefecture, ''),
  NULLIF(c.address, ''),
  NULLIF(c.qualification, ''),
  NULLIF(c.employment_type, ''),
  NULLIF(c.desired_job_type, ''),
  CASE
    WHEN c.status_text LIKE '%初回済み%' THEN 'first_contact_done'
    WHEN c.status_text LIKE '%初回連絡中%' THEN 'contacting'
    WHEN c.status_text LIKE '%意向回収%' THEN 'on_hold'
    WHEN c.status_text LIKE '%追客中%' THEN 'pending'
    WHEN c.status_text LIKE '%成約%' THEN 'closed_won'
    WHEN c.status_text LIKE '%NG%' THEN 'closed_lost'
    ELSE 'new'
  END,
  CASE
    WHEN c.registered_at ~ '^\d{4}-\d{2}-\d{2}$' THEN c.registered_at::date
    WHEN c.registered_at ~ '^\d{4}/\d{1,2}/\d{1,2}$' THEN TO_DATE(c.registered_at, 'YYYY/MM/DD')
    ELSE NULL
  END,
  u.id,
  s.id,
  NULLIF(c.notes, '')
FROM stg_contacts c
LEFT JOIN users u ON u.name = TRIM(SPLIT_PART(c.consultant_name, '・', 1))
LEFT JOIN sources s ON s.name = c.source_name
WHERE c.candidate_id IS NOT NULL AND c.candidate_id != ''
  AND c.candidate_name IS NOT NULL AND c.candidate_name != ''
ORDER BY c.candidate_id, c.registered_at DESC NULLS LAST
ON CONFLICT (id) DO UPDATE SET
  name = COALESCE(EXCLUDED.name, candidates.name),
  phone = COALESCE(EXCLUDED.phone, candidates.phone),
  email = COALESCE(EXCLUDED.email, candidates.email),
  birth_date = COALESCE(EXCLUDED.birth_date, candidates.birth_date),
  age = COALESCE(EXCLUDED.age, candidates.age),
  prefecture = COALESCE(EXCLUDED.prefecture, candidates.prefecture),
  address = COALESCE(EXCLUDED.address, candidates.address),
  qualification = COALESCE(EXCLUDED.qualification, candidates.qualification),
  desired_employment_type = COALESCE(EXCLUDED.desired_employment_type, candidates.desired_employment_type),
  desired_job_type = COALESCE(EXCLUDED.desired_job_type, candidates.desired_job_type),
  status = COALESCE(EXCLUDED.status, candidates.status),
  registered_at = COALESCE(candidates.registered_at, EXCLUDED.registered_at),
  consultant_id = COALESCE(candidates.consultant_id, EXCLUDED.consultant_id),
  source_id = COALESCE(candidates.source_id, EXCLUDED.source_id),
  memo = COALESCE(EXCLUDED.memo, candidates.memo);

-- stg_member_sheet から不足分を補完
INSERT INTO candidates (id, name, registered_at, consultant_id)
SELECT DISTINCT
  ms.candidate_id,
  NULLIF(ms.candidate_name, ''),
  CASE
    WHEN ms.assigned_date ~ '^\d{4}-\d{2}-\d{2}$' THEN ms.assigned_date::date
    WHEN ms.assigned_date ~ '^\d{4}/\d{1,2}/\d{1,2}$' THEN TO_DATE(ms.assigned_date, 'YYYY/MM/DD')
    ELSE NULL
  END,
  u.id
FROM stg_member_sheet ms
LEFT JOIN users u ON u.name = TRIM(SPLIT_PART(ms.member_name, '・', 1))
WHERE ms.candidate_id IS NOT NULL AND ms.candidate_id != ''
ON CONFLICT (id) DO UPDATE SET
  name = COALESCE(EXCLUDED.name, candidates.name),
  registered_at = COALESCE(candidates.registered_at, EXCLUDED.registered_at),
  consultant_id = COALESCE(candidates.consultant_id, EXCLUDED.consultant_id);

-- 月次マージのステータスで最新状態を反映
WITH latest_monthly AS (
  SELECT DISTINCT ON (candidate_id)
    candidate_id,
    status
  FROM stg_member_monthly
  WHERE candidate_id IS NOT NULL AND candidate_id != ''
  ORDER BY candidate_id, month_text DESC
)
UPDATE candidates c
SET status = CASE
  WHEN l.status LIKE '%初回連絡中%' THEN 'contacting'
  WHEN l.status LIKE '%連絡つかず%' THEN 'contacting'
  WHEN l.status LIKE '%初回ヒアリング実施済%' THEN 'first_contact_done'
  WHEN l.status LIKE '%提案求人選定中%' THEN 'proposing'
  WHEN l.status LIKE '%求人提案済%' THEN 'proposing'
  WHEN l.status LIKE '%見学提案%' THEN 'proposing'
  WHEN l.status LIKE '%面接日程調整中%' THEN 'interviewing'
  WHEN l.status LIKE '%面接確定%' THEN 'interviewing'
  WHEN l.status LIKE '%面接実施済%' THEN 'interviewing'
  WHEN l.status LIKE '%承諾確認中%' THEN 'offer'
  WHEN l.status LIKE '%内定承諾%' THEN 'closed_won'
  WHEN l.status LIKE '%内定辞退%' THEN 'closed_lost'
  WHEN l.status LIKE '%クローズ%' THEN 'closed_lost'
  WHEN l.status LIKE '%追客中%' THEN 'pending'
  WHEN l.status LIKE '%音信不通%' THEN 'on_hold'
  WHEN l.status LIKE '%再ヒアリング%' THEN 'first_contact_done'
  WHEN l.status LIKE '%書類選考%' THEN 'interviewing'
  ELSE c.status
END
FROM latest_monthly l
WHERE c.id = l.candidate_id;

-- ========================================
-- Step 5: projects を作成
-- ========================================
WITH latest_monthly AS (
  SELECT DISTINCT ON (candidate_id)
    candidate_id,
    category,
    status,
    expected_amount,
    prob_current,
    month_text
  FROM stg_member_monthly
  WHERE candidate_id IS NOT NULL AND candidate_id != ''
  ORDER BY candidate_id, month_text DESC
),
client_names AS (
  SELECT DISTINCT ON (candidate_id)
    candidate_id,
    NULLIF(COALESCE(NULLIF(garden_name, ''), NULLIF(corporation_name, '')), '') AS client_name,
    interview_date,
    assigned_date
  FROM stg_member_sheet
  WHERE candidate_id IS NOT NULL AND candidate_id != ''
  ORDER BY candidate_id, interview_date DESC, assigned_date DESC
)
INSERT INTO projects (candidate_id, client_name, phase, expected_amount, probability)
SELECT
  l.candidate_id,
  COALESCE(cn.client_name, '未設定'),
  CASE
    WHEN l.category = '内定承諾' THEN 'accepted'
    WHEN l.category = '内定辞退' THEN 'rejected'
    WHEN l.category = 'フォロー・ロスト' THEN 'withdrawn'
    WHEN l.category = '面接フェーズ' AND l.status LIKE '%面接日程調整中%' THEN 'interview_scheduled'
    WHEN l.category = '面接フェーズ' AND l.status LIKE '%面接確定%' THEN 'interview_scheduled'
    WHEN l.category = '面接フェーズ' AND l.status LIKE '%面接実施済%' THEN 'interviewing'
    WHEN l.category = '面接フェーズ' THEN 'interviewing'
    WHEN l.status LIKE '%承諾確認中%' THEN 'offer'
    ELSE 'proposed'
  END,
  NULLIF(l.expected_amount, '')::integer,
  CASE
    WHEN l.prob_current LIKE '%A%' THEN 'A'
    WHEN l.prob_current LIKE '%B%' THEN 'B'
    WHEN l.prob_current LIKE '%C%' THEN 'C'
    WHEN l.prob_current LIKE '%D%' THEN 'C'
    ELSE NULL
  END
FROM latest_monthly l
LEFT JOIN client_names cn ON cn.candidate_id = l.candidate_id
WHERE EXISTS (SELECT 1 FROM candidates c WHERE c.id = l.candidate_id)
  AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.candidate_id = l.candidate_id);

-- ========================================
-- Step 6: interviews を作成（面接フラグ=TRUE）
-- ========================================
WITH interviews_src AS (
  SELECT
    ms.candidate_id,
    ms.status_text,
    ms.interview_date,
    ms.interview_flag_date,
    ms.assigned_date,
    NULLIF(COALESCE(NULLIF(ms.garden_name, ''), NULLIF(ms.corporation_name, '')), '') AS location
  FROM stg_member_sheet ms
  WHERE UPPER(ms.interview_flag) = 'TRUE'
    AND ms.candidate_id IS NOT NULL
    AND ms.candidate_id != ''
),
interviews_parsed AS (
  SELECT
    i.*,
    CASE
      WHEN i.interview_date ~ '^\d{4}-\d{2}-\d{2}$' THEN i.interview_date::timestamptz
      WHEN i.interview_date ~ '^\d{4}/\d{1,2}/\d{1,2}$' THEN TO_DATE(i.interview_date, 'YYYY/MM/DD')::timestamptz
      ELSE NULL
    END AS start_at,
    CASE
      WHEN i.interview_flag_date ~ '^\d{4}-\d{2}-\d{2}$' THEN i.interview_flag_date::timestamptz
      WHEN i.interview_flag_date ~ '^\d{4}/\d{1,2}/\d{1,2}$' THEN TO_DATE(i.interview_flag_date, 'YYYY/MM/DD')::timestamptz
      ELSE NULL
    END AS created_at,
    CASE
      WHEN i.assigned_date ~ '^\d{4}-\d{2}-\d{2}$' THEN i.assigned_date::timestamptz
      WHEN i.assigned_date ~ '^\d{4}/\d{1,2}/\d{1,2}$' THEN TO_DATE(i.assigned_date, 'YYYY/MM/DD')::timestamptz
      ELSE NULL
    END AS assigned_at
  FROM interviews_src i
)
INSERT INTO interviews (project_id, type, start_at, status, created_at, location)
SELECT
  p.id,
  'interview',
  COALESCE(ip.start_at, ip.created_at, ip.assigned_at),
  CASE
    WHEN ip.status_text LIKE '%面接日程調整中%' THEN 'rescheduling'
    WHEN ip.status_text LIKE '%面接確定%' THEN 'scheduled'
    WHEN ip.status_text LIKE '%面接実施済%' THEN 'completed'
    WHEN ip.status_text LIKE '%結果待ち%' THEN 'completed'
    WHEN ip.status_text LIKE '%内定%' THEN 'completed'
    ELSE 'scheduled'
  END,
  COALESCE(ip.created_at, ip.start_at, ip.assigned_at),
  ip.location
FROM interviews_parsed ip
JOIN projects p ON p.candidate_id = ip.candidate_id
WHERE COALESCE(ip.start_at, ip.created_at, ip.assigned_at) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM interviews it
    WHERE it.project_id = p.id
      AND it.start_at::date = COALESCE(ip.start_at, ip.created_at, ip.assigned_at)::date
  );

-- ========================================
-- Step 7: contracts を作成
-- ========================================
INSERT INTO contracts (
  candidate_id,
  accepted_date,
  employment_restriction_until,
  employment_type,
  job_type,
  revenue_excluding_tax,
  revenue_including_tax,
  payment_date,
  invoice_sent_date,
  calculation_basis,
  document_url,
  placement_company
)
SELECT
  sc.candidate_id,
  CASE
    WHEN sc.accepted_date ~ '^\d{4}-\d{2}-\d{2}$' THEN sc.accepted_date::date
    WHEN sc.accepted_date ~ '^\d{4}/\d{1,2}/\d{1,2}$' THEN TO_DATE(sc.accepted_date, 'YYYY/MM/DD')
    ELSE NULL
  END,
  CASE
    WHEN sc.employment_restriction_until ~ '^\d{4}-\d{2}-\d{2}$' THEN sc.employment_restriction_until::date
    WHEN sc.employment_restriction_until ~ '^\d{4}/\d{1,2}/\d{1,2}$' THEN TO_DATE(sc.employment_restriction_until, 'YYYY/MM/DD')
    ELSE NULL
  END,
  NULLIF(sc.employment_type, ''),
  NULLIF(sc.job_type, ''),
  NULLIF(sc.revenue_excluding_tax, '')::integer,
  NULLIF(sc.revenue_including_tax, '')::integer,
  CASE
    WHEN sc.payment_date ~ '^\d{4}-\d{2}-\d{2}$' THEN sc.payment_date::date
    WHEN sc.payment_date ~ '^\d{4}/\d{1,2}/\d{1,2}$' THEN TO_DATE(sc.payment_date, 'YYYY/MM/DD')
    ELSE NULL
  END,
  CASE
    WHEN sc.invoice_sent_date ~ '^\d{4}-\d{2}-\d{2}$' THEN sc.invoice_sent_date::date
    WHEN sc.invoice_sent_date ~ '^\d{4}/\d{1,2}/\d{1,2}$' THEN TO_DATE(sc.invoice_sent_date, 'YYYY/MM/DD')
    ELSE NULL
  END,
  NULLIF(sc.calculation_basis, ''),
  NULLIF(sc.document_url, ''),
  NULLIF(sc.placement_company, '')
FROM stg_contracts sc
WHERE sc.candidate_id IS NOT NULL AND sc.candidate_id != ''
  AND EXISTS (SELECT 1 FROM candidates c WHERE c.id = sc.candidate_id);

-- ========================================
-- Step 8: 確認用クエリ
-- ========================================
-- SELECT COUNT(*) FROM users;
-- SELECT COUNT(*) FROM sources;
-- SELECT COUNT(*) FROM candidates;
-- SELECT COUNT(*) FROM projects;
-- SELECT COUNT(*) FROM interviews;
-- SELECT COUNT(*) FROM contracts;

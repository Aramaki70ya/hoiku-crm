/**
 * CSVから candidates.sql を生成するスクリプト
 * 
 * 使用方法:
 * node generate-candidates-sql.js
 */

const fs = require('fs');
const path = require('path');

// 担当者名→UUIDマッピング
const userMapping = {
  '瀧澤': '11111111-1111-1111-1111-111111111001',
  '西田': '11111111-1111-1111-1111-111111111002',
  '鈴木': '11111111-1111-1111-1111-111111111003',
  '戸部': '11111111-1111-1111-1111-111111111004',
  '後藤': '11111111-1111-1111-1111-111111111005',
  '小畦': '11111111-1111-1111-1111-111111111006',
  '吉田': '11111111-1111-1111-1111-111111111007',
  '大塚': '11111111-1111-1111-1111-111111111008',
  '石井': '11111111-1111-1111-1111-111111111009',
  '松澤': '11111111-1111-1111-1111-111111111010',
  '緑': '11111111-1111-1111-1111-111111111011',
};

// ステータス変換マッピング
const statusMapping = {
  '成約': 'closed_won',
  'NG': 'closed_lost',
  '初回済み': 'first_contact_done',
  '意向回収': 'on_hold',
  '追客中': 'pending',
  '新規': 'new',
  '連絡中': 'contacting',
  '提案中': 'proposing',
  '面接中': 'interviewing',
  '内定': 'offer',
};

// 担当者名を解決（複合担当者対応）
function resolveConsultant(name) {
  if (!name || name === 'なし') return null;
  
  // 複合担当者（例：瀧澤・緑）の場合、最初の担当者を使用
  const primaryName = name.split('・')[0].trim();
  return userMapping[primaryName] || null;
}

// ステータスを変換
function convertStatus(status) {
  return statusMapping[status] || 'new';
}

// 日付形式を変換（2025/10/10 → 2025-10-10）
function convertDate(dateStr) {
  if (!dateStr) return null;
  
  // YYYY-MM-DD形式の場合はそのまま
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // YYYY/MM/DD形式を変換
  const match = dateStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

// 電話番号を正規化
function normalizePhone(phone) {
  if (!phone) return null;
  // 数字のみを残す
  const cleaned = phone.replace(/[^\d]/g, '');
  return cleaned || null;
}

// SQLエスケープ
function escapeSQL(str) {
  if (str === null || str === undefined || str === '') return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

// CSV行をパース
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// メイン処理
function main() {
  const csvPath = path.join(__dirname, '../../../元データ/求職者管理 - 連絡先一覧.csv');
  const outputPath = path.join(__dirname, '../sql/03_candidates.sql');
  
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  // ヘッダー行を取得
  const headers = parseCSVLine(lines[0]);
  console.log('Headers:', headers.slice(0, 10), '...');
  
  // データ行を処理
  const insertStatements = [];
  const seenIds = new Set();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    // IDがない、または重複する場合はスキップ
    const id = row['ID'];
    if (!id || id === '' || seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);
    
    // 年齢が126や68以上などの異常値をチェック
    const age = parseInt(row['年齢'], 10);
    const validAge = !isNaN(age) && age > 0 && age < 100 ? age : null;
    
    // データ変換
    const candidate = {
      id: id,
      name: row['氏名'] || '',
      phone: normalizePhone(row['電話番号']),
      email: row['メールアドレス'] || null,
      birth_date: convertDate(row['生年月日']),
      age: validAge,
      prefecture: row['都道府県'] || null,
      address: row['市区町村'] || null,
      qualification: row['保有資格'] || null,
      desired_employment_type: row['正・パ'] || null,
      desired_job_type: row['応募職種'] || null,
      status: convertStatus(row['ステータス']),
      registered_at: convertDate(row['日付']),
      consultant_id: resolveConsultant(row['担当者']),
      memo: row['備考'] || null,
    };
    
    // 名前がない場合はスキップ
    if (!candidate.name) continue;
    
    // INSERT文を生成
    const sql = `  ('${candidate.id}', ${escapeSQL(candidate.name)}, ${escapeSQL(candidate.phone)}, ${escapeSQL(candidate.email)}, ${candidate.birth_date ? `'${candidate.birth_date}'` : 'NULL'}, ${candidate.age || 'NULL'}, ${escapeSQL(candidate.prefecture)}, ${escapeSQL(candidate.address)}, ${escapeSQL(candidate.qualification)}, ${escapeSQL(candidate.desired_employment_type)}, ${escapeSQL(candidate.desired_job_type)}, '${candidate.status}', ${candidate.registered_at ? `'${candidate.registered_at}'` : 'NULL'}, ${candidate.consultant_id ? `'${candidate.consultant_id}'` : 'NULL'}, ${escapeSQL(candidate.memo)})`;
    
    insertStatements.push(sql);
  }
  
  console.log(`Processed ${insertStatements.length} candidates`);
  
  // SQLファイルを生成
  const sqlContent = `-- Hoiku CRM 求職者データ
-- 求職者管理 - 連絡先一覧.csv から生成
-- 生成日時: ${new Date().toISOString()}
-- 
-- 実行順序: 3番目
-- 依存関係: 01_users.sql, 02_sources.sql の実行後
-- 件数: ${insertStatements.length}件

-- 注意: source_idは別途マッピングが必要（媒体名→UUID）
-- 本SQLでは一旦NULLとして挿入し、後続のUPDATEで設定する

-- 求職者データの挿入
INSERT INTO candidates (id, name, phone, email, birth_date, age, prefecture, address, qualification, desired_employment_type, desired_job_type, status, registered_at, consultant_id, memo)
VALUES
${insertStatements.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  birth_date = EXCLUDED.birth_date,
  age = EXCLUDED.age,
  prefecture = EXCLUDED.prefecture,
  address = EXCLUDED.address,
  qualification = EXCLUDED.qualification,
  desired_employment_type = EXCLUDED.desired_employment_type,
  desired_job_type = EXCLUDED.desired_job_type,
  status = EXCLUDED.status,
  registered_at = EXCLUDED.registered_at,
  consultant_id = EXCLUDED.consultant_id,
  memo = EXCLUDED.memo;
`;
  
  fs.writeFileSync(outputPath, sqlContent, 'utf-8');
  console.log(`Generated: ${outputPath}`);
}

main();

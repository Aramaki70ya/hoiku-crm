/**
 * 数値管理シートCSVから interviews.sql を生成するスクリプト
 * 
 * 使用方法:
 * node generate-interviews-sql.js
 */

const fs = require('fs');
const path = require('path');

// 日付形式を変換
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
  
  // M/D形式（年がない場合は2025年とする）
  const shortMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (shortMatch) {
    const [, month, day] = shortMatch;
    // 月が1-3の場合は2026年、それ以外は2025年
    const year = parseInt(month, 10) <= 3 ? '2026' : '2025';
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
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

// CSVファイルを処理
function processMetricsCSV(csvPath, consultantName) {
  console.log(`Processing: ${consultantName}`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  const interviews = [];
  
  // 5行目以降がデータ（0-indexed: 4）
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    
    // IDがない場合はスキップ
    const candidateId = values[0];
    if (!candidateId || candidateId === '' || candidateId === '#N/A') {
      continue;
    }
    
    // 8桁のID形式でない場合はスキップ
    if (!candidateId.match(/^\d{8}$/)) {
      continue;
    }
    
    // 面接フラグがTRUEの場合のみ処理
    const interviewFlag = values[10];
    if (interviewFlag !== 'TRUE') {
      continue;
    }
    
    // 面接日を取得（面接フラグ日または面接日カラム）
    const interviewFlagDate = values[11] || '';
    const interviewDate = values[15] || '';
    
    // 日付を変換
    const flagDate = convertDate(interviewFlagDate);
    const actualDate = convertDate(interviewDate);
    
    // どちらかの日付があれば面接データとして追加
    const startDate = actualDate || flagDate;
    if (!startDate) {
      continue;
    }
    
    // 園名を取得
    const gardenName = values[16] || '';
    const corporationName = values[17] || '';
    const location = gardenName || corporationName || '未定';
    
    // ステータスを取得して面接種別を決定
    const status = values[5] || '';
    let interviewType = 'interview'; // デフォルト
    let interviewStatus = 'scheduled';
    
    if (status.includes('内定承諾') || status.includes('成約')) {
      interviewStatus = 'completed';
    } else if (status.includes('内定辞退')) {
      interviewStatus = 'cancelled';
    }
    
    // 面接データを作成
    const interview = {
      candidate_id: candidateId,
      type: interviewType,
      start_at: `${startDate}T10:00:00+09:00`, // デフォルト時刻を10:00に設定
      location: location,
      status: interviewStatus,
      feedback: status.includes('成約') ? '成約済み' : null,
      consultant_name: consultantName,
    };
    
    interviews.push(interview);
  }
  
  return interviews;
}

// メイン処理
function main() {
  const basePath = path.join(__dirname, '../../../元データ');
  const outputPath = path.join(__dirname, '../sql/06_interviews.sql');
  
  // 全ての数値管理シートを処理
  const allInterviews = [];
  
  const csvFiles = [
    { file: '【保育】数値管理シート_最新版 - 瀧澤.csv', consultant: '瀧澤' },
    { file: '【保育】数値管理シート_最新版 - 西田.csv', consultant: '西田' },
    { file: '【保育】数値管理シート_最新版 - 鈴木.csv', consultant: '鈴木' },
    { file: '【保育】数値管理シート_最新版 - 戸部.csv', consultant: '戸部' },
    { file: '【保育】数値管理シート_最新版 - 後藤.csv', consultant: '後藤' },
    { file: '【保育】数値管理シート_最新版 - 小畦.csv', consultant: '小畦' },
    { file: '【保育】数値管理シート_最新版 - 吉田.csv', consultant: '吉田' },
    { file: '【保育】数値管理シート_最新版 - 大塚.csv', consultant: '大塚' },
  ];
  
  for (const { file, consultant } of csvFiles) {
    const csvPath = path.join(basePath, file);
    if (fs.existsSync(csvPath)) {
      const interviews = processMetricsCSV(csvPath, consultant);
      allInterviews.push(...interviews);
      console.log(`  Found ${interviews.length} interviews`);
    } else {
      console.log(`  File not found: ${csvPath}`);
    }
  }
  
  console.log(`\nTotal: ${allInterviews.length} interviews`);
  
  // 重複除去（candidate_id + start_atで）
  const seenKeys = new Set();
  const uniqueInterviews = allInterviews.filter(i => {
    const key = `${i.candidate_id}-${i.start_at}`;
    if (seenKeys.has(key)) {
      return false;
    }
    seenKeys.add(key);
    return true;
  });
  
  console.log(`After dedup: ${uniqueInterviews.length} interviews`);
  
  if (uniqueInterviews.length === 0) {
    console.log('No interviews found. Creating empty SQL file.');
    const sqlContent = `-- Hoiku CRM 面接データ
-- 【保育】数値管理シート_最新版（8担当者分）から生成
-- 生成日時: ${new Date().toISOString()}
-- 
-- 実行順序: 6番目
-- 依存関係: 04_projects.sql の実行後
-- 件数: 0件

-- 面接データなし（数値管理シートに面接フラグがTRUEかつ日付があるデータがなかった）
`;
    fs.writeFileSync(outputPath, sqlContent, 'utf-8');
    console.log(`Generated: ${outputPath}`);
    return;
  }
  
  // INSERT文を生成
  // 注意: project_idは後で紐づける必要がある（ここではNULLとして仮挿入しない）
  // interviewsテーブルはproject_idが必須なので、別の方法で挿入する必要がある
  
  // SQLコメントとして面接データを記録
  const interviewComments = uniqueInterviews.map(i => {
    return `-- candidate_id: ${i.candidate_id}, date: ${i.start_at}, location: ${i.location}, status: ${i.status}`;
  });
  
  const sqlContent = `-- Hoiku CRM 面接データ
-- 【保育】数値管理シート_最新版（8担当者分）から生成
-- 生成日時: ${new Date().toISOString()}
-- 
-- 実行順序: 6番目
-- 依存関係: 04_projects.sql の実行後
-- 件数: ${uniqueInterviews.length}件

-- 注意: interviewsテーブルはproject_idが必須
-- projectsテーブルに対応するレコードが存在する場合のみ挿入可能
-- 以下のクエリでprojectsテーブルから自動的にproject_idを解決して挿入する

${uniqueInterviews.map(i => {
  return `-- ${i.candidate_id}: ${i.start_at} @ ${i.location}
INSERT INTO interviews (project_id, type, start_at, location, status, feedback)
SELECT p.id, 'interview', '${i.start_at}'::timestamptz, ${escapeSQL(i.location)}, '${i.status}', ${escapeSQL(i.feedback)}
FROM projects p
WHERE p.candidate_id = '${i.candidate_id}'
LIMIT 1
ON CONFLICT DO NOTHING;
`}).join('\n')}
`;
  
  fs.writeFileSync(outputPath, sqlContent, 'utf-8');
  console.log(`Generated: ${outputPath}`);
}

main();

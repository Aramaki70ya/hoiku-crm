/**
 * 数値管理シートCSVから projects.sql を生成するスクリプト
 * 
 * 使用方法:
 * node generate-projects-sql.js
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
};

// ステータス→phase変換マッピング
const phaseMapping = {
  '🟢 面接確定済': 'interview_scheduled',
  '🟢 内定承諾（成約）': 'accepted',
  '🟣 提案求人選定中': 'proposed',
  '🟤 求人提案済（返信待ち）': 'proposed',
  '🔴 内定辞退': 'withdrawn',
  '🔵 面接日程調整中': 'interview_scheduled',
  '⚫ クローズ（終了）': 'rejected',
  // 追客中はprojectsには含めない
};

// 確度変換マッピング
const probabilityMapping = {
  'Aヨミ(80%)': 'A',
  'Bヨミ(50%)': 'B',
  'Cヨミ(30%)': 'C',
  'Dヨミ(10%)': 'C',  // DはCとして扱う
};

// 金額を数値に変換（"¥ 1,000,000.00" → 1000000）
function parseAmount(amountStr) {
  if (!amountStr) return null;
  // 数字以外を除去
  const cleaned = amountStr.replace(/[^\d]/g, '');
  const value = parseInt(cleaned, 10);
  // 小数点以下2桁が含まれている場合は100で割る
  if (amountStr.includes('.00')) {
    return isNaN(value) ? null : Math.round(value / 100);
  }
  return isNaN(value) ? null : value;
}

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
    return `2025-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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

// ヘッダーを正規化（改行を含むヘッダーを処理）
function normalizeHeaders(lines) {
  // 最初の数行を結合してヘッダーを構成
  let headerLine = lines[0];
  
  // 改行を含むヘッダー（カンマ数が不足している場合）
  const expectedColumns = 20; // 期待するカラム数
  let headerValues = parseCSVLine(headerLine);
  
  // ヘッダーが複数行にまたがる場合の処理
  if (headerValues.length < expectedColumns && lines.length > 1) {
    // 改行を含むヘッダーを結合
    headerLine = lines.slice(0, 4).join('').replace(/\n/g, ' ');
    headerValues = parseCSVLine(headerLine);
  }
  
  return {
    headers: headerValues,
    dataStartLine: headerValues.length >= 10 ? 4 : 1, // ヘッダーが複数行の場合は4行目から
  };
}

// CSVファイルを処理
function processMetricsCSV(csvPath, consultantName) {
  console.log(`Processing: ${consultantName}`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  // ヘッダー行を取得（複数行にまたがる可能性あり）
  // 最初の行から担当者名とヘッダーを抽出
  const firstLine = parseCSVLine(lines[0]);
  
  // 実際のデータヘッダーを手動で定義
  const headers = [
    'candidate_id', 'assignment_date', 'candidate_name', 'lead_source', 'category',
    'status', 'expected_amount', 'probability_current', 'probability_next',
    'closed_amount', 'interview_flag', 'interview_flag_date', 'interview_days',
    'closed_date', 'area', 'interview_date', 'garden_name', 'corporation_name', 'concurrent'
  ];
  
  const projects = [];
  
  // 5行目以降がデータ（0-indexed: 4）
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    
    // IDがない、または#N/Aの場合はスキップ
    const candidateId = values[0];
    if (!candidateId || candidateId === '' || candidateId === '#N/A') {
      continue;
    }
    
    // 8桁のID形式でない場合はスキップ
    if (!candidateId.match(/^\d{8}$/)) {
      continue;
    }
    
    // ステータスを取得
    const status = values[5] || '';
    
    // 追客中やクローズはprojectsには含めない
    if (status.includes('追客中') || status.includes('クローズ') || status.includes('連絡つかず')) {
      continue;
    }
    
    // phaseを変換
    let phase = null;
    for (const [key, value] of Object.entries(phaseMapping)) {
      if (status.includes(key) || status === key) {
        phase = value;
        break;
      }
    }
    
    // phaseが特定できない場合は提案済みとする
    if (!phase && (status.includes('提案') || status.includes('面接') || status.includes('内定'))) {
      phase = 'proposed';
    }
    
    if (!phase) continue;
    
    // 園名・法人名を取得
    const gardenName = values[16] || '';
    const corporationName = values[17] || '';
    const clientName = gardenName || corporationName || '未定';
    
    if (clientName === '未定' && !status.includes('面接') && !status.includes('内定')) {
      continue; // 園名がなく、面接/内定でない場合はスキップ
    }
    
    // 確度を変換
    const probabilityCurrent = values[7] || '';
    let probability = null;
    for (const [key, value] of Object.entries(probabilityMapping)) {
      if (probabilityCurrent.includes(key)) {
        probability = value;
        break;
      }
    }
    
    // データ変換
    const project = {
      candidate_id: candidateId,
      client_name: clientName === '未定' ? `${consultantName}担当案件` : clientName,
      phase: phase,
      expected_amount: parseAmount(values[6]),
      probability: probability,
      expected_entry_date: null, // CSVに明確なカラムがないためNULL
      note: `担当: ${consultantName}`,
      consultant_name: consultantName,
    };
    
    projects.push(project);
  }
  
  return projects;
}

// メイン処理
function main() {
  const basePath = path.join(__dirname, '../../../元データ');
  const outputPath = path.join(__dirname, '../sql/04_projects.sql');
  
  // 全ての数値管理シートを処理
  const allProjects = [];
  
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
      const projects = processMetricsCSV(csvPath, consultant);
      allProjects.push(...projects);
      console.log(`  Found ${projects.length} projects`);
    } else {
      console.log(`  File not found: ${csvPath}`);
    }
  }
  
  console.log(`\nTotal: ${allProjects.length} projects`);
  
  // 重複除去（candidate_id + client_nameで）
  const seenKeys = new Set();
  const uniqueProjects = allProjects.filter(p => {
    const key = `${p.candidate_id}-${p.client_name}`;
    if (seenKeys.has(key)) {
      return false;
    }
    seenKeys.add(key);
    return true;
  });
  
  console.log(`After dedup: ${uniqueProjects.length} projects`);
  
  // INSERT文を生成
  const insertStatements = uniqueProjects.map(p => {
    return `  ('${p.candidate_id}', ${escapeSQL(p.client_name)}, '${p.phase}', ${p.expected_amount || 'NULL'}, ${p.probability ? `'${p.probability}'` : 'NULL'}, ${p.expected_entry_date ? `'${p.expected_entry_date}'` : 'NULL'}, ${escapeSQL(p.note)})`;
  });
  
  // SQLファイルを生成
  const sqlContent = `-- Hoiku CRM 案件データ
-- 【保育】数値管理シート_最新版（8担当者分）から生成
-- 生成日時: ${new Date().toISOString()}
-- 
-- 実行順序: 4番目
-- 依存関係: 03_candidates.sql の実行後
-- 件数: ${insertStatements.length}件

-- 案件データの挿入
INSERT INTO projects (candidate_id, client_name, phase, expected_amount, probability, expected_entry_date, note)
VALUES
${insertStatements.join(',\n')}
ON CONFLICT DO NOTHING;
`;
  
  fs.writeFileSync(outputPath, sqlContent, 'utf-8');
  console.log(`Generated: ${outputPath}`);
}

main();

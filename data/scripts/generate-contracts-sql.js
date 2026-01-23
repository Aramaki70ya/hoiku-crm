/**
 * 成約CSVから contracts.sql を生成するスクリプト
 * 
 * 使用方法:
 * node generate-contracts-sql.js
 */

const fs = require('fs');
const path = require('path');

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

// 金額を数値に変換（"687,600" → 687600）
function parseAmount(amountStr) {
  if (!amountStr) return null;
  // 数字以外を除去
  const cleaned = amountStr.replace(/[^\d]/g, '');
  const value = parseInt(cleaned, 10);
  return isNaN(value) ? null : value;
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
function processContractCSV(csvPath, month) {
  console.log(`Processing: ${csvPath}`);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  
  // 4行目がヘッダー（0-indexed: 3）
  const headers = parseCSVLine(lines[3]);
  console.log('Headers:', headers.slice(0, 8), '...');
  
  const contracts = [];
  
  // 5行目以降がデータ（0-indexed: 4）
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    // IDがない場合はスキップ
    const candidateId = row['ID'];
    if (!candidateId || candidateId === '') {
      continue;
    }
    
    // データ変換
    const contract = {
      candidate_id: candidateId,
      accepted_date: convertDate(row['承諾日']),
      employment_restriction_until: convertDate(row['転職勧奨禁止期間']),
      employment_type: row['雇用'] || null,
      job_type: row['職種'] || null,
      revenue_excluding_tax: parseAmount(row['売上(税抜)']),
      revenue_including_tax: parseAmount(row['売上(税込)']),
      payment_date: convertDate(row['入金']),
      invoice_sent_date: convertDate(row['請求書発送']),
      calculation_basis: row['算出根拠'] || null,
      document_url: row['格納先URL'] || null,
      placement_company: row['入職先'] || null,
      month: month,
    };
    
    // 売上がない場合はスキップ
    if (!contract.revenue_excluding_tax && !contract.revenue_including_tax) {
      continue;
    }
    
    contracts.push(contract);
  }
  
  return contracts;
}

// メイン処理
function main() {
  const basePath = path.join(__dirname, '../../../元データ');
  const outputPath = path.join(__dirname, '../sql/05_contracts.sql');
  
  // 全ての成約CSVを処理
  const allContracts = [];
  
  const csvFiles = [
    { file: '成約2025_10.csv', month: '2025-10' },
    { file: '成約2025_11.csv', month: '2025-11' },
    { file: '成約2025_12.csv', month: '2025-12' },
  ];
  
  for (const { file, month } of csvFiles) {
    const csvPath = path.join(basePath, file);
    if (fs.existsSync(csvPath)) {
      const contracts = processContractCSV(csvPath, month);
      allContracts.push(...contracts);
      console.log(`  Found ${contracts.length} contracts`);
    } else {
      console.log(`  File not found: ${csvPath}`);
    }
  }
  
  console.log(`\nTotal: ${allContracts.length} contracts`);
  
  // 重複除去（candidate_idで）
  const seenIds = new Set();
  const uniqueContracts = allContracts.filter(c => {
    if (seenIds.has(c.candidate_id)) {
      console.log(`  Duplicate candidate_id: ${c.candidate_id}`);
      return false;
    }
    seenIds.add(c.candidate_id);
    return true;
  });
  
  console.log(`After dedup: ${uniqueContracts.length} contracts`);
  
  // INSERT文を生成
  const insertStatements = uniqueContracts.map(c => {
    // accepted_dateがない場合はデフォルト値を設定（必須カラム）
    const acceptedDate = c.accepted_date || `2025-${c.month.split('-')[1]}-01`;
    
    return `  ('${c.candidate_id}', '${acceptedDate}', ${c.employment_restriction_until ? `'${c.employment_restriction_until}'` : 'NULL'}, ${escapeSQL(c.employment_type)}, ${escapeSQL(c.job_type)}, ${c.revenue_excluding_tax || 0}, ${c.revenue_including_tax || 0}, ${c.payment_date ? `'${c.payment_date}'` : 'NULL'}, ${c.invoice_sent_date ? `'${c.invoice_sent_date}'` : 'NULL'}, ${escapeSQL(c.calculation_basis)}, ${escapeSQL(c.document_url)}, ${escapeSQL(c.placement_company)})`;
  });
  
  // SQLファイルを生成
  const sqlContent = `-- Hoiku CRM 成約データ
-- 成約2025_10.csv, 成約2025_11.csv, 成約2025_12.csv から生成
-- 生成日時: ${new Date().toISOString()}
-- 
-- 実行順序: 5番目
-- 依存関係: 03_candidates.sql の実行後
-- 件数: ${insertStatements.length}件

-- 成約データの挿入
INSERT INTO contracts (candidate_id, accepted_date, employment_restriction_until, employment_type, job_type, revenue_excluding_tax, revenue_including_tax, payment_date, invoice_sent_date, calculation_basis, document_url, placement_company)
VALUES
${insertStatements.join(',\n')}
ON CONFLICT (candidate_id) DO UPDATE SET
  accepted_date = EXCLUDED.accepted_date,
  employment_restriction_until = EXCLUDED.employment_restriction_until,
  employment_type = EXCLUDED.employment_type,
  job_type = EXCLUDED.job_type,
  revenue_excluding_tax = EXCLUDED.revenue_excluding_tax,
  revenue_including_tax = EXCLUDED.revenue_including_tax,
  payment_date = EXCLUDED.payment_date,
  invoice_sent_date = EXCLUDED.invoice_sent_date,
  calculation_basis = EXCLUDED.calculation_basis,
  document_url = EXCLUDED.document_url,
  placement_company = EXCLUDED.placement_company;
`;
  
  fs.writeFileSync(outputPath, sqlContent, 'utf-8');
  console.log(`Generated: ${outputPath}`);
}

main();

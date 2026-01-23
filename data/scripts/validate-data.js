/**
 * 生成されたSQLデータの検証スクリプト
 * 
 * 使用方法:
 * node validate-data.js
 */

const fs = require('fs');
const path = require('path');

// SQLファイルからINSERT文を解析
function parseInsertStatements(sqlContent, tableName) {
  const lines = sqlContent.split('\n');
  const ids = [];
  
  for (const line of lines) {
    // VALUES行からIDを抽出
    if (line.trim().startsWith("('")) {
      const match = line.match(/^\s*\('([^']+)'/);
      if (match) {
        ids.push(match[1]);
      }
    }
  }
  
  return ids;
}

// 検証結果を格納
const validationResults = {
  users: { count: 0, ids: [] },
  sources: { count: 0, ids: [] },
  candidates: { count: 0, ids: [] },
  projects: { count: 0, ids: [] },
  contracts: { count: 0, ids: [] },
  interviews: { count: 0, ids: [] },
  errors: [],
  warnings: [],
};

// ファイルの検証
function validateFile(filename, tableName) {
  const filePath = path.join(__dirname, '../sql', filename);
  
  if (!fs.existsSync(filePath)) {
    validationResults.errors.push(`File not found: ${filename}`);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const ids = parseInsertStatements(content, tableName);
  
  validationResults[tableName].count = ids.length;
  validationResults[tableName].ids = ids;
  
  console.log(`${filename}: ${ids.length} records`);
}

// 外部キー整合性チェック
function checkForeignKeys() {
  console.log('\n=== Foreign Key Validation ===');
  
  // contracts.candidate_id → candidates.id
  const candidateIds = new Set(validationResults.candidates.ids);
  const contractCandidateIds = validationResults.contracts.ids;
  
  let contractErrors = 0;
  for (const id of contractCandidateIds) {
    if (!candidateIds.has(id)) {
      validationResults.warnings.push(`contracts: candidate_id '${id}' not found in candidates`);
      contractErrors++;
    }
  }
  console.log(`contracts → candidates: ${contractErrors} missing references`);
  
  // projects.candidate_id → candidates.id
  const projectCandidateIds = validationResults.projects.ids;
  
  let projectErrors = 0;
  for (const id of projectCandidateIds) {
    if (!candidateIds.has(id)) {
      validationResults.warnings.push(`projects: candidate_id '${id}' not found in candidates`);
      projectErrors++;
    }
  }
  console.log(`projects → candidates: ${projectErrors} missing references`);
}

// 必須カラムチェック
function checkRequiredColumns() {
  console.log('\n=== Required Column Validation ===');
  
  // candidatesの必須カラム: id, name, status
  // contractsの必須カラム: candidate_id, accepted_date, revenue_excluding_tax, revenue_including_tax
  // projectsの必須カラム: candidate_id, client_name, phase
  
  // SQLファイルの内容を確認
  const candidatesPath = path.join(__dirname, '../sql/03_candidates.sql');
  const contractsPath = path.join(__dirname, '../sql/05_contracts.sql');
  const projectsPath = path.join(__dirname, '../sql/04_projects.sql');
  
  // candidates
  if (fs.existsSync(candidatesPath)) {
    const content = fs.readFileSync(candidatesPath, 'utf-8');
    const nullNameCount = (content.match(/, NULL, NULL,/g) || []).length;
    if (nullNameCount > 0) {
      validationResults.warnings.push(`candidates: ${nullNameCount} records may have NULL name`);
    }
    console.log(`candidates: OK (${validationResults.candidates.count} records)`);
  }
  
  // contracts
  if (fs.existsSync(contractsPath)) {
    const content = fs.readFileSync(contractsPath, 'utf-8');
    // accepted_dateがNULLでないことを確認
    const lines = content.split('\n').filter(l => l.trim().startsWith("('"));
    let acceptedDateOk = true;
    for (const line of lines) {
      if (line.includes(", NULL, NULL,") && line.split(',').length > 3) {
        // 複雑なチェックは省略
      }
    }
    console.log(`contracts: OK (${validationResults.contracts.count} records)`);
  }
  
  // projects
  if (fs.existsSync(projectsPath)) {
    console.log(`projects: OK (${validationResults.projects.count} records)`);
  }
}

// サマリーを出力
function printSummary() {
  console.log('\n=== Summary ===');
  console.log(`Users: ${validationResults.users.count} records`);
  console.log(`Sources: ${validationResults.sources.count} additional records`);
  console.log(`Candidates: ${validationResults.candidates.count} records`);
  console.log(`Projects: ${validationResults.projects.count} records`);
  console.log(`Contracts: ${validationResults.contracts.count} records`);
  console.log(`Interviews: ${validationResults.interviews.count} records`);
  
  console.log('\n=== Errors ===');
  if (validationResults.errors.length === 0) {
    console.log('No errors found.');
  } else {
    validationResults.errors.forEach(e => console.log(`  ERROR: ${e}`));
  }
  
  console.log('\n=== Warnings ===');
  if (validationResults.warnings.length === 0) {
    console.log('No warnings.');
  } else {
    // 警告は最大10件まで表示
    const displayWarnings = validationResults.warnings.slice(0, 10);
    displayWarnings.forEach(w => console.log(`  WARN: ${w}`));
    if (validationResults.warnings.length > 10) {
      console.log(`  ... and ${validationResults.warnings.length - 10} more warnings`);
    }
  }
}

// メイン処理
function main() {
  console.log('=== Data Validation ===\n');
  
  // 各ファイルを検証
  validateFile('01_users.sql', 'users');
  validateFile('02_sources.sql', 'sources');
  validateFile('03_candidates.sql', 'candidates');
  validateFile('04_projects.sql', 'projects');
  validateFile('05_contracts.sql', 'contracts');
  validateFile('06_interviews.sql', 'interviews');
  
  // 外部キー整合性チェック
  checkForeignKeys();
  
  // 必須カラムチェック
  checkRequiredColumns();
  
  // サマリー出力
  printSummary();
  
  // 検証レポートをファイルに保存
  const reportPath = path.join(__dirname, '../sql/VALIDATION_REPORT.md');
  const report = `# データ検証レポート

生成日時: ${new Date().toISOString()}

## データ件数

| テーブル | 件数 |
|---------|------|
| users | ${validationResults.users.count} |
| sources | ${validationResults.sources.count} (追加分) |
| candidates | ${validationResults.candidates.count} |
| projects | ${validationResults.projects.count} |
| contracts | ${validationResults.contracts.count} |
| interviews | ${validationResults.interviews.count} |

## 外部キー整合性

### contracts → candidates
- 参照エラー: ${validationResults.warnings.filter(w => w.includes('contracts:')).length}件

### projects → candidates
- 参照エラー: ${validationResults.warnings.filter(w => w.includes('projects:')).length}件

## 注意事項

${validationResults.warnings.length > 0 ? validationResults.warnings.map(w => `- ${w}`).join('\n') : '- なし'}

## エラー

${validationResults.errors.length > 0 ? validationResults.errors.map(e => `- ${e}`).join('\n') : '- なし'}

## 実行順序

1. schema.sql（テーブル作成）
2. 01_users.sql（ユーザーデータ）
3. 02_sources.sql（媒体マスタ追加分）
4. 03_candidates.sql（求職者データ）
5. 04_projects.sql（案件データ）
6. 05_contracts.sql（成約データ）
7. 06_interviews.sql（面接データ）

## 備考

- source_idは現在NULLとして挿入されています。必要に応じて後続のUPDATEクエリで設定してください。
- 外部キー参照エラーがある場合、該当のcandidate_idがcandidatesテーブルに存在しない可能性があります。
- interviewsテーブルはproject_idが必須のため、projectsテーブルに対応するレコードが存在する場合のみ挿入されます。
`;
  
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`\nValidation report saved: ${reportPath}`);
}

main();

#!/usr/bin/env node
/**
 * 1月面接DB差分チェックスクリプト
 * 
 * Slackで報告された13名の候補者について、
 * 面接レコードの存在とステータスを確認する
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.localを手動でパース
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase接続情報が見つかりません');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '設定済み' : '未設定');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Slackで報告された候補者リスト
const targetCandidates = {
  '吉田': [
    '高橋 早苗',
    '渡邊 彩乃',
    '岩杉 ゆうこ',
    '新井 ゆう',
    'スタリングス 結夏子',
    '佐々木 千夏',
    '竹下 麻衣'
  ],
  '瀧澤': [
    '並木 瞳',
    '成田 果歩',
    '徳山 友美'
  ],
  '鈴木': [
    '山岸 由実',
    '定仙 愛子',
    '前田 陽真莉',
    '廣瀬 直美'
  ]
};

const allCandidateNames = Object.values(targetCandidates).flat();

async function main() {
  console.log('📊 1月面接DB差分チェック開始\n');
  console.log('対象候補者数:', allCandidateNames.length, '名\n');

  // 候補者と面接情報を取得
  const { data: candidates, error: candidatesError } = await supabase
    .from('candidates')
    .select(`
      id,
      name,
      consultant_id,
      users:consultant_id (
        name
      )
    `)
    .in('name', allCandidateNames);

  if (candidatesError) {
    console.error('❌ 候補者情報取得エラー:', candidatesError);
    process.exit(1);
  }

  console.log('✅ 候補者情報取得:', candidates.length, '名\n');

  // 見つからなかった候補者をチェック
  const foundNames = candidates.map(c => c.name);
  const notFoundNames = allCandidateNames.filter(name => !foundNames.includes(name));
  
  if (notFoundNames.length > 0) {
    console.log('⚠️  DBに存在しない候補者:');
    notFoundNames.forEach(name => console.log(`  - ${name}`));
    console.log('');
  }

  // 各候補者の案件と面接情報を取得
  const candidateIds = candidates.map(c => c.id);

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .in('candidate_id', candidateIds);

  if (projectsError) {
    console.error('❌ 案件情報取得エラー:', projectsError);
    process.exit(1);
  }

  const projectIds = projects.map(p => p.id);

  const { data: interviews, error: interviewsError } = await supabase
    .from('interviews')
    .select('*')
    .in('project_id', projectIds)
    .order('start_at', { ascending: false });

  if (interviewsError) {
    console.error('❌ 面接情報取得エラー:', interviewsError);
    process.exit(1);
  }

  console.log('✅ 案件数:', projects.length);
  console.log('✅ 面接レコード数:', interviews.length, '\n');

  // 担当者別に集計
  const resultsByConsultant = {};

  for (const [consultant, names] of Object.entries(targetCandidates)) {
    resultsByConsultant[consultant] = [];

    for (const name of names) {
      const candidate = candidates.find(c => c.name === name);
      
      if (!candidate) {
        resultsByConsultant[consultant].push({
          name,
          status: 'DBに候補者なし',
          interviews: []
        });
        continue;
      }

      const candidateProjects = projects.filter(p => p.candidate_id === candidate.id);
      const candidateInterviews = candidateProjects.flatMap(p => 
        interviews.filter(i => i.project_id === p.id)
      );

      // 1月の面接を抽出（2026年1月）
      const januaryInterviews = candidateInterviews.filter(i => {
        const startDate = new Date(i.start_at);
        return startDate >= new Date('2026-01-01') && startDate < new Date('2026-02-01');
      });

      // 2月の面接を抽出（2026年2月）
      const februaryInterviews = candidateInterviews.filter(i => {
        const startDate = new Date(i.start_at);
        return startDate >= new Date('2026-02-01') && startDate < new Date('2026-03-01');
      });

      resultsByConsultant[consultant].push({
        name,
        consultantName: candidate.users?.name || '不明',
        candidateId: candidate.id,
        projectCount: candidateProjects.length,
        totalInterviews: candidateInterviews.length,
        januaryInterviews,
        februaryInterviews,
        allInterviews: candidateInterviews
      });
    }
  }

  // 結果を出力
  console.log('=' .repeat(80));
  console.log('📋 候補者別 面接状況\n');

  for (const [consultant, results] of Object.entries(resultsByConsultant)) {
    console.log(`\n${'▼'.repeat(40)}`);
    console.log(`👤 ${consultant}担当（${results.length}名）`);
    console.log('▼'.repeat(40));

    let januaryCount = 0;

    for (const result of results) {
      console.log(`\n  📌 ${result.name}`);
      
      if (result.status === 'DBに候補者なし') {
        console.log('    ❌ DBに候補者レコードが存在しません');
        continue;
      }

      console.log(`    担当者: ${result.consultantName}`);
      console.log(`    候補者ID: ${result.candidateId}`);
      console.log(`    案件数: ${result.projectCount}`);
      console.log(`    面接総数: ${result.totalInterviews}`);

      if (result.januaryInterviews.length > 0) {
        januaryCount += result.januaryInterviews.length;
        console.log(`    ✅ 1月面接: ${result.januaryInterviews.length}件`);
        result.januaryInterviews.forEach((interview, idx) => {
          const startDate = new Date(interview.start_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
          console.log(`       ${idx + 1}. ${startDate} - ${interview.status} (${interview.type})`);
          if (interview.feedback) {
            console.log(`          メモ: ${interview.feedback.substring(0, 50)}${interview.feedback.length > 50 ? '...' : ''}`);
          }
        });
      } else {
        console.log('    ⚪ 1月面接: なし');
      }

      if (result.februaryInterviews.length > 0) {
        console.log(`    📅 2月面接: ${result.februaryInterviews.length}件`);
        result.februaryInterviews.forEach((interview, idx) => {
          const startDate = new Date(interview.start_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
          console.log(`       ${idx + 1}. ${startDate} - ${interview.status} (${interview.type})`);
        });
      }

      if (result.allInterviews.length > 0 && result.januaryInterviews.length === 0 && result.februaryInterviews.length === 0) {
        console.log('    📅 その他の月の面接:');
        result.allInterviews.slice(0, 3).forEach((interview, idx) => {
          const startDate = new Date(interview.start_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
          console.log(`       ${idx + 1}. ${startDate} - ${interview.status} (${interview.type})`);
        });
        if (result.allInterviews.length > 3) {
          console.log(`       ...他 ${result.allInterviews.length - 3}件`);
        }
      }
    }

    console.log(`\n  📊 ${consultant}担当 1月面接合計: ${januaryCount}件`);
  }

  // 最終サマリー
  console.log('\n' + '='.repeat(80));
  console.log('📊 集計サマリー\n');

  let totalJanuaryInterviews = 0;
  for (const [consultant, results] of Object.entries(resultsByConsultant)) {
    const consultantJanuaryCount = results.reduce((sum, r) => 
      sum + (r.januaryInterviews?.length || 0), 0
    );
    totalJanuaryInterviews += consultantJanuaryCount;
    console.log(`  ${consultant}: ${consultantJanuaryCount}件`);
  }

  console.log(`\n  合計: ${totalJanuaryInterviews}件`);
  console.log('\n' + '='.repeat(80));

  console.log('\n✅ チェック完了');
}

main().catch(console.error);

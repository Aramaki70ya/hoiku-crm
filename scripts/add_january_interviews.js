#!/usr/bin/env node
/**
 * 1月面接レコード追加スクリプト
 * 
 * 2月からシステム運用開始のため、1月の面接設定ログが存在しない。
 * Slackで報告された「1月に面接設定していた」候補者について、
 * 面接レコードを追加する。
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
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 1月に面接設定していた候補者リスト
const januaryCandidates = [
  { name: '高橋 早苗', consultant: '吉田' },
  { name: '山岸 由実', consultant: '鈴木' },
  { name: '前田 陽真莉', consultant: '鈴木' },
  { name: '廣瀬 直美', consultant: '鈴木' }
];

async function main() {
  console.log('📝 1月面接レコード追加処理開始\n');
  console.log('対象候補者:', januaryCandidates.length, '名\n');

  // 候補者情報を取得
  const candidateNames = januaryCandidates.map(c => c.name);
  const { data: candidates, error: candidatesError } = await supabase
    .from('candidates')
    .select('id, name, consultant_id')
    .in('name', candidateNames);

  if (candidatesError) {
    console.error('❌ 候補者情報取得エラー:', candidatesError);
    process.exit(1);
  }

  console.log('✅ 候補者情報取得:', candidates.length, '名\n');

  // 各候補者について処理
  for (const targetCandidate of januaryCandidates) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📌 ${targetCandidate.name}（${targetCandidate.consultant}担当）`);
    console.log('='.repeat(60));

    const candidate = candidates.find(c => c.name === targetCandidate.name);
    
    if (!candidate) {
      console.log('  ❌ 候補者がDBに存在しません。スキップします。');
      continue;
    }

    console.log(`  候補者ID: ${candidate.id}`);

    // 既存の案件を確認
    const { data: existingProjects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('candidate_id', candidate.id);

    if (projectsError) {
      console.error('  ❌ 案件情報取得エラー:', projectsError);
      continue;
    }

    let projectId;

    if (existingProjects && existingProjects.length > 0) {
      // 既存の案件がある場合は最初の案件を使用
      projectId = existingProjects[0].id;
      console.log(`  ✅ 既存案件を使用: ${existingProjects[0].client_name || '（園名未設定）'}`);
    } else {
      // 案件がない場合は新規作成
      console.log('  📝 案件を新規作成します...');
      
      const { data: newProject, error: createProjectError } = await supabase
        .from('projects')
        .insert({
          candidate_id: candidate.id,
          client_name: '（1月設定時の園名不明）',
          phase: '面接中',
          note: '2月システム導入前の1月面接設定を遡って登録'
        })
        .select()
        .single();

      if (createProjectError) {
        console.error('  ❌ 案件作成エラー:', createProjectError);
        continue;
      }

      projectId = newProject.id;
      console.log(`  ✅ 案件作成完了: ${newProject.id}`);
    }

    // 1月の面接レコードが既に存在するか確認
    const { data: existingInterviews, error: interviewsError } = await supabase
      .from('interviews')
      .select('*')
      .eq('project_id', projectId);

    if (interviewsError) {
      console.error('  ❌ 面接情報取得エラー:', interviewsError);
      continue;
    }

    // 1月の面接レコードを確認
    const hasJanuaryInterview = existingInterviews?.some(i => {
      const startDate = new Date(i.start_at);
      return startDate >= new Date('2026-01-01') && startDate < new Date('2026-02-01');
    });

    if (hasJanuaryInterview) {
      console.log('  ⚠️  1月の面接レコードは既に存在します。スキップします。');
      continue;
    }

    // 1月の面接レコードを追加
    console.log('  📝 1月の面接レコードを追加します...');
    
    // 1月の中旬（15日）を仮の日付として設定
    const januaryDate = new Date('2026-01-15T10:00:00+09:00');
    
    const { data: newInterview, error: createInterviewError } = await supabase
      .from('interviews')
      .insert({
        project_id: projectId,
        type: 'interview',
        start_at: januaryDate.toISOString(),
        status: '実施済',
        feedback: '※システム導入前（1月）の面接設定を遡って登録。詳細日時・場所は記録なし。',
        location: '（記録なし）'
      })
      .select()
      .single();

    if (createInterviewError) {
      console.error('  ❌ 面接レコード作成エラー:', createInterviewError);
      console.error('  エラー詳細:', JSON.stringify(createInterviewError, null, 2));
      continue;
    }

    console.log('  ✅ 1月面接レコード追加完了');
    console.log(`     面接ID: ${newInterview.id}`);
    console.log(`     日時: ${new Date(newInterview.start_at).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
    console.log(`     ステータス: ${newInterview.status}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 処理完了\n');

  // 最終確認: 1月面接件数を再集計
  console.log('📊 1月面接件数 再集計\n');

  const { data: allCandidates, error: allCandidatesError } = await supabase
    .from('candidates')
    .select('id, name, consultant_id, users:consultant_id(name)')
    .in('name', candidateNames);

  if (allCandidatesError) {
    console.error('❌ 再集計エラー:', allCandidatesError);
    process.exit(1);
  }

  for (const candidate of allCandidates) {
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('candidate_id', candidate.id);

    if (!projects || projects.length === 0) continue;

    const projectIds = projects.map(p => p.id);

    const { data: interviews } = await supabase
      .from('interviews')
      .select('*')
      .in('project_id', projectIds);

    const januaryInterviews = interviews?.filter(i => {
      const startDate = new Date(i.start_at);
      return startDate >= new Date('2026-01-01') && startDate < new Date('2026-02-01');
    }) || [];

    if (januaryInterviews.length > 0) {
      console.log(`  ${candidate.name}（${candidate.users?.name || '不明'}担当）: ${januaryInterviews.length}件`);
    }
  }

  console.log('\n✅ 全処理完了');
}

main().catch(console.error);

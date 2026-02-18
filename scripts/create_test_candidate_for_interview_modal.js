#!/usr/bin/env node
/**
 * 面接件数モーダル・無効化機能のテスト用データ作成
 *
 * テスト用求職者「テスト 花子」を1名作成し、
 * 今月の面接1件を登録してダッシュボードの面接数にカウントされるようにする。
 *
 * 使い方: node scripts/create_test_candidate_for_interview_modal.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ .env.local に NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_CANDIDATE_ID = 'TEST_INTERVIEW_MODAL_01';
const TEST_CANDIDATE_NAME = 'テスト 花子';

async function main() {
  console.log('📝 面接モーダル用テストデータ作成\n');

  // 1. 担当者を1名取得（吉田優先、いなければ先頭の一般ユーザー）
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, name')
    .eq('role', 'user');

  if (usersError || !users?.length) {
    console.error('❌ ユーザー取得エラー:', usersError?.message || 'ユーザーが0件');
    process.exit(1);
  }

  const consultant = users.find(u => u.name === '吉田') || users[0];
  console.log('✅ 担当者:', consultant.name, '(' + consultant.id + ')');

  // 2. テスト求職者が既にいれば削除して作り直す（冪等）
  const { data: existing } = await supabase.from('candidates').select('id').eq('id', TEST_CANDIDATE_ID).single();
  if (existing) {
    console.log('⚠️ 既存のテスト求職者を削除して再作成します');
    await supabase.from('candidates').delete().eq('id', TEST_CANDIDATE_ID);
  }

  // 3. 求職者作成
  const now = new Date().toISOString();
  const { data: candidate, error: candidateError } = await supabase
    .from('candidates')
    .insert({
      id: TEST_CANDIDATE_ID,
      name: TEST_CANDIDATE_NAME,
      status: '面接確定済',
      consultant_id: consultant.id,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (candidateError) {
    console.error('❌ 求職者作成エラー:', candidateError);
    process.exit(1);
  }
  console.log('✅ 求職者作成:', candidate.name, '(' + candidate.id + ')');

  // 4. 案件作成
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      candidate_id: candidate.id,
      client_name: 'テスト園（面接モーダル確認用）',
      phase: '面接中',
      note: '面接件数クリック→モーダル・無効化のテスト用',
    })
    .select()
    .single();

  if (projectError) {
    console.error('❌ 案件作成エラー:', projectError);
    process.exit(1);
  }
  console.log('✅ 案件作成:', project.client_name, '(' + project.id + ')');

  // 5. 今月の面接を1件作成
  const thisMonth = new Date();
  const interviewStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 15, 10, 0, 0);
  const insertInterview = {
    project_id: project.id,
    type: 'interview',
    start_at: interviewStart.toISOString(),
    status: '実施済',
    feedback: '面接モーダル・無効化テスト用データ',
    location: 'テスト場所',
  };

  const { data: interview, error: interviewError } = await supabase
    .from('interviews')
    .insert(insertInterview)
    .select()
    .single();

  if (interviewError) {
    console.error('❌ 面接作成エラー:', interviewError);
    process.exit(1);
  }
  console.log('✅ 面接作成:', interviewStart.toLocaleString('ja-JP'), '(' + interview.id + ')');

  // 6. status_history に「今月に面接確定済になった」履歴を追加
  const changedAt = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1, 12, 0, 0).toISOString();
  const { error: historyError } = await supabase.from('status_history').insert({
    candidate_id: candidate.id,
    project_id: project.id,
    old_status: '面接日程調整中',
    new_status: '面接確定済',
    changed_at: changedAt,
  });

  if (historyError) {
    console.warn('⚠️ status_history 追加エラー（集計に影響する可能性あり）:', historyError.message);
  } else {
    console.log('✅ status_history 追加: 面接確定済 @', changedAt);
  }

  console.log('\n✅ 完了');
  console.log('→ ダッシュボードで「今月」を選択し、' + consultant.name + 'さんの「面接」の数字をクリックして一覧に「' + TEST_CANDIDATE_NAME + '」が表示されることを確認してください。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * interviews テーブルに is_voided 関連カラムを追加するマイグレーション
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.local を手動でパース
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase の環境変数が見つかりません (.env.local を確認)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 interviews テーブルのカラム確認中...\n');

  // カラムの存在確認
  const { data: sample, error: sampleErr } = await supabase
    .from('interviews')
    .select('id, is_voided')
    .limit(1);

  if (!sampleErr) {
    console.log('✅ is_voided カラムはすでに存在します。マイグレーション不要です。');
    console.log('   サンプル:', sample);
    return;
  }

  if (!sampleErr.message.includes('is_voided')) {
    console.error('❌ 予期しないエラー:', sampleErr.message);
    process.exit(1);
  }

  console.log('⚠️  is_voided カラムが存在しません。マイグレーションを実行します...\n');

  // Supabase の rpc で SQL を実行（service role キーが必要）
  const sqls = [
    `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS is_voided BOOLEAN DEFAULT false`,
    `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ DEFAULT NULL`,
    `ALTER TABLE interviews ADD COLUMN IF NOT EXISTS void_reason TEXT DEFAULT NULL`,
    `UPDATE interviews SET is_voided = false WHERE is_voided IS NULL`,
    `CREATE INDEX IF NOT EXISTS idx_interviews_is_voided ON interviews(is_voided)`,
  ];

  for (const sql of sqls) {
    console.log('▶', sql.substring(0, 70) + '...');
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      // exec_sql が存在しない場合は Supabase Dashboard での実行を促す
      console.error('❌ RPC 実行エラー:', error.message);
      console.log('\n📋 Supabase Dashboard で以下の SQL を手動実行してください:');
      console.log('   https://supabase.com/dashboard → SQL Editor\n');
      console.log('-- ===== 貼り付けてください =====');
      console.log(`ALTER TABLE interviews ADD COLUMN IF NOT EXISTS is_voided BOOLEAN DEFAULT false;`);
      console.log(`ALTER TABLE interviews ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ DEFAULT NULL;`);
      console.log(`ALTER TABLE interviews ADD COLUMN IF NOT EXISTS void_reason TEXT DEFAULT NULL;`);
      console.log(`UPDATE interviews SET is_voided = false WHERE is_voided IS NULL;`);
      console.log('-- ==============================');
      process.exit(1);
    }
    console.log('   ✅ 完了\n');
  }

  console.log('🎉 マイグレーション完了！');
}

main().catch(e => {
  console.error('❌ 予期しないエラー:', e);
  process.exit(1);
});

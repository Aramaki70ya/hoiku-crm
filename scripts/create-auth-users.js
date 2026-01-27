/**
 * Supabase認証ユーザー作成スクリプト
 * 
 * 使い方:
 * 1. 環境変数を設定:
 *    export SUPABASE_URL="https://your-project.supabase.co"
 *    export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 * 
 * 2. 実行:
 *    node scripts/create-auth-users.js
 * 
 * 注意: SUPABASE_SERVICE_ROLE_KEYは機密情報です。絶対にGitにコミットしないでください。
 */

const users = [
  { email: 'yoshida@josei-katuyaku.co.jp', name: '吉田', role: 'user', password: 'Yoshida2025!' },
  { email: 'goto@josei-katuyaku.co.jp', name: '後藤', role: 'user', password: 'Goto2025!' },
  { email: 'takizawa@josei-katuyaku.co.jp', name: '瀧澤', role: 'user', password: 'Takizawa2025!' },
  { email: 'matsuzawa@josei-katuyaku.co.jp', name: '松沢', role: 'user', password: 'Matsuzawa2025!' },
  { email: 'suzuki@josei-katuyaku.co.jp', name: '鈴木', role: 'user', password: 'Suzuki2025!' },
  { email: 'ohtsuka@josei-katuyaku.co.jp', name: '大塚', role: 'user', password: 'Ohtsuka2025!' },
  { email: 'tobe@josei-katuyaku.co.jp', name: '戸部', role: 'user', password: 'Tobe2025!' },
  { email: 'koaze@josei-katuyaku.co.jp', name: '小畑', role: 'user', password: 'Koaze2025!' },
  { email: 'nishida@josei-katuyaku.co.jp', name: '西田', role: 'user', password: 'Nishida2025!' },
  { email: 'ishii@josei-katuyaku.co.jp', name: '石井', role: 'user', password: 'Ishii2025!' },
  { email: 'sasajima@josei-katuyaku.co.jp', name: '笹島', role: 'user', password: 'Sasajima2025!' },
];

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.error('以下の環境変数を設定してください:');
  console.error('  SUPABASE_URL=https://your-project.supabase.co');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  console.error('');
  console.error('Supabaseダッシュボード → Settings → API から取得できます');
  process.exit(1);
}

async function createUser(user) {
  try {
    // 1. auth.usersにユーザーを作成
    const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        email_confirm: true, // メール確認をスキップ
        user_metadata: {
          name: user.name,
        },
      }),
    });

    if (!authResponse.ok) {
      const errorData = await authResponse.json();
      // 既に存在する場合はスキップ
      if (errorData.message && errorData.message.includes('already registered')) {
        console.log(`⚠️  既に存在: ${user.email}`);
        return { success: true, skipped: true };
      }
      throw new Error(`認証ユーザー作成失敗: ${errorData.message || authResponse.statusText}`);
    }

    const authData = await authResponse.json();
    const userId = authData.id;

    console.log(`✅ 認証ユーザー作成: ${user.email} (ID: ${userId})`);

    // 2. public.usersにユーザー情報を追加/更新
    const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Prefer': 'resolution=merge-duplicates', // UPSERT
      },
      body: JSON.stringify({
        id: userId,
        email: user.email,
        name: user.name,
        role: user.role,
      }),
    });

    if (!dbResponse.ok) {
      const errorData = await dbResponse.json();
      throw new Error(`public.users作成失敗: ${errorData.message || dbResponse.statusText}`);
    }

    console.log(`✅ public.users作成/更新: ${user.email}`);
    return { success: true, userId };

  } catch (error) {
    console.error(`❌ エラー (${user.email}):`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 ユーザー作成を開始します...\n');
  console.log(`📧 対象ユーザー数: ${users.length}`);
  console.log('🔑 各ユーザーに異なるパスワードを設定します');
  console.log('⚠️  ログイン後にパスワードを変更してください\n');

  const results = [];
  for (const user of users) {
    const result = await createUser(user);
    results.push({ ...user, ...result });
    // APIレート制限を避けるため少し待つ
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 結果サマリー:');
  const successCount = results.filter(r => r.success).length;
  const skippedCount = results.filter(r => r.skipped).length;
  const failedCount = results.filter(r => !r.success).length;

  console.log(`✅ 成功: ${successCount}件`);
  if (skippedCount > 0) {
    console.log(`⚠️  スキップ（既存）: ${skippedCount}件`);
  }
  if (failedCount > 0) {
    console.log(`❌ 失敗: ${failedCount}件`);
  }

  if (failedCount > 0) {
    console.log('\n❌ 失敗したユーザー:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.email}: ${r.error}`);
    });
  }

  console.log('\n✨ 完了しました！');
  console.log(`\n📝 次のステップ:`);
  console.log(`1. supabase/user_passwords.md または user_passwords.csv を確認して、各ユーザーにパスワードを共有`);
  console.log(`2. ログイン後、パスワードを変更してもらう`);
}

main().catch(console.error);

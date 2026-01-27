/**
 * 瀧澤さんログイン修正スクリプト
 *
 * ・認証ユーザーがいない → 作成する
 * ・いるがパスワードが違う → Takizawa2025! に上書き
 *
 * 使い方:
 *   export SUPABASE_URL="https://xxxx.supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
 *   node scripts/fix-takizawa-login.js
 *
 * 環境変数は .env.local の NEXT_PUBLIC_SUPABASE_URL と別。
 * Supabase Dashboard → Settings → API の Project URL / service_role key を使う。
 */

const EMAIL = 'takizawa@josei-katuyaku.co.jp';
const PASSWORD = 'Takizawa2025!';
const NAME = '瀧澤';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください');
  console.error('   export SUPABASE_URL="https://xxxx.supabase.co"');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY="..."');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
  apikey: SUPABASE_SERVICE_ROLE_KEY,
};

async function listAuthUsers() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, { headers });
  if (!res.ok) throw new Error(`list users failed: ${res.status}`);
  const users = await res.json();
  return Array.isArray(users) ? users : users.users || [];
}

async function createAuthUser() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: NAME },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `create failed: ${res.status}`);
  }
  return res.json();
}

async function updateAuthUserPassword(userId) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ password: PASSWORD }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `update password failed: ${res.status}`);
  }
  return res.json();
}

async function main() {
  console.log('🔧 瀧澤さんログイン修正（認証だけ）...\n');

  const authUsers = await listAuthUsers();
  const takizawa = authUsers.find((u) => u.email === EMAIL);

  if (takizawa) {
    console.log('✅ 認証ユーザーは既に存在します');
    await updateAuthUserPassword(takizawa.id);
    console.log('✅ パスワードを Takizawa2025! に更新しました');
  } else {
    console.log('⚠️  認証ユーザーがなかったので作成します');
    const created = await createAuthUser();
    console.log(`✅ 認証ユーザー作成: ${EMAIL} (ID: ${created.id})`);
    console.log('   ※ public.users に瀧澤がいない場合は create_users_simple.sql か create-auth-users.js を別途実行してください');
  }

  console.log('\n✨ 完了');
  console.log('   ログイン: メール ' + EMAIL + ' / パスワード ' + PASSWORD);
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});

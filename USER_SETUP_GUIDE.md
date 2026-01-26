# ユーザー作成後の確認と次のステップ

## 1. ユーザー作成結果の確認

`supabase/check_users.sql` を実行して、ユーザーが正しく作成されたか確認してください。

### 確認ポイント

- ✅ **認証ユーザー作成済み（ログイン可能）** と表示されていればOK
- ❌ **認証ユーザー未作成（ログイン不可）** と表示されている場合は、認証ユーザーの作成が必要です

## 2. 認証ユーザーが未作成の場合

`create_users.sql`で`auth.users`への直接INSERTが失敗した可能性があります。以下のいずれかの方法で認証ユーザーを作成してください。

### 方法A: Node.jsスクリプトを使用（推奨）

```bash
# 環境変数を設定
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# スクリプトを実行
node scripts/create-auth-users.js
```

**環境変数の取得方法:**
- Supabaseダッシュボード → Settings → API
- Project URL と service_role key（secret）をコピー

### 方法B: Supabaseダッシュボードから手動作成

1. Supabaseダッシュボード → **Authentication** → **Users**
2. **Add user** をクリック
3. 各メールアドレスを入力してユーザーを作成
4. **Set password** でパスワードを設定（初期パスワード: `password123`）
5. **Send magic link** または **Set password** を選択

### 方法C: パスワードリセットメールを送信

既に`public.users`にユーザーが作成されている場合：

1. Supabaseダッシュボード → **Authentication** → **Users**
2. 各ユーザーを選択
3. **Send password reset email** をクリック
4. ユーザーがメールからパスワードを設定

## 3. ログインテスト

認証ユーザーが作成されたら、ログインできるかテストしてください。

### テスト手順

1. アプリケーションのログインページにアクセス
2. 以下の情報でログインを試す：
   - **メールアドレス**: `yoshida@josei-katuyaku.co.jp`（または他のメールアドレス）
   - **パスワード**: `password123`
3. ログインが成功すれば、ダッシュボードが表示されます

### ログインできない場合

- メールアドレスとパスワードが正しいか確認
- Supabaseダッシュボードでユーザーの状態を確認
- ブラウザのコンソールでエラーメッセージを確認

## 4. パスワード変更の案内

初期パスワード `password123` は一時的なものです。各ユーザーに以下を案内してください：

1. 初回ログイン後、すぐにパスワードを変更する
2. 強力なパスワードを使用する（8文字以上、大文字・小文字・数字・記号を含む）
3. パスワードを他人と共有しない

### パスワード変更方法

- アプリケーション内にパスワード変更機能がある場合はそれを使用
- または、Supabaseダッシュボード → Authentication → Users から各ユーザーのパスワードをリセット

## 5. ユーザー一覧

作成されたユーザー：

| メールアドレス | 名前 | ロール |
|---|---|---|
| yoshida@josei-katuyaku.co.jp | 吉田 | user |
| goto@josei-katuyaku.co.jp | 後藤 | user |
| takizawa@josei-katuyaku.co.jp | 滝沢 | user |
| matsuzawa@josei-katuyaku.co.jp | 松沢 | user |
| suzuki@josei-katuyaku.co.jp | 鈴木 | user |
| ohtsuka@josei-katuyaku.co.jp | 大塚 | user |
| tobe@josei-katuyaku.co.jp | 戸部 | user |
| koaze@josei-katuyaku.co.jp | 小畑 | user |
| nishida@josei-katuyaku.co.jp | 西田 | user |
| ishii@josei-katuyaku.co.jp | 石井 | user |
| sasajima@josei-katuyaku.co.jp | 笹島 | user |

**初期パスワード**: `password123`（全ユーザー共通）

## トラブルシューティング

### エラー: "Invalid login credentials"

- パスワードが正しいか確認
- メールアドレスにタイポがないか確認
- Supabaseダッシュボードでユーザーが存在するか確認

### エラー: "User not found"

- `auth.users`テーブルにユーザーが作成されているか確認
- `check_users.sql`を実行して状態を確認

### エラー: "Email not confirmed"

- Supabaseダッシュボードでユーザーの`email_confirmed_at`が設定されているか確認
- 必要に応じて、手動で確認済みに設定

# Hoiku CRM セットアップガイド

## 1. Supabase プロジェクトの作成

1. [Supabase](https://supabase.com/) にアクセスしてログイン
2. 「New Project」をクリック
3. プロジェクト名: `hoiku-crm` （任意）
4. データベースパスワードを設定（安全な場所に保管）
5. リージョン: `Northeast Asia (Tokyo)` を推奨
6. 「Create new project」をクリック

## 2. データベーススキーマの作成

1. Supabaseダッシュボードで「SQL Editor」を開く
2. `supabase/schema.sql` の内容をコピー＆ペースト
3. 「Run」をクリックして実行

## 3. Google OAuth の設定

### 3.1 Google Cloud Console での設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または新規作成）
3. 「APIとサービス」→「認証情報」を開く
4. 「認証情報を作成」→「OAuthクライアントID」を選択
5. アプリケーションの種類: 「ウェブアプリケーション」
6. 名前: `Hoiku CRM`
7. 承認済みのリダイレクトURI:
   - `https://<your-supabase-project>.supabase.co/auth/v1/callback`
   （Supabaseダッシュボードの「Authentication」→「Providers」→「Google」で確認可能）
8. 「作成」をクリックし、**クライアントID**と**クライアントシークレット**を控える

### 3.2 Supabase での設定

1. Supabaseダッシュボードで「Authentication」→「Providers」を開く
2. 「Google」を有効化
3. Google Cloud Consoleで取得した以下を入力:
   - Client ID
   - Client Secret
4. 「Save」をクリック

### 3.3 （オプション）GWSドメイン制限

特定のGoogle Workspaceドメインのユーザーのみログインを許可する場合:

1. 「Authentication」→「Providers」→「Google」
2. 「Authorized domains」に会社のドメイン（例: `example.com`）を追加

## 4. 環境変数の設定

1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 以下の値を確認:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJI...`

3. プロジェクトルートに `.env.local` ファイルを作成:

```bash
cp .env.local.example .env.local
```

4. `.env.local` を編集:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
```

## 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

## 6. Vercel へのデプロイ（本番環境）

1. [Vercel](https://vercel.com/) にログイン
2. 「Import Project」→ GitHubリポジトリを選択
3. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. 「Deploy」をクリック

## トラブルシューティング

### ログインできない場合

1. Supabaseの「Authentication」→「Providers」でGoogleが有効か確認
2. Google Cloud ConsoleのリダイレクトURIが正しいか確認
3. 環境変数が正しく設定されているか確認

### データが表示されない場合

1. RLS（Row Level Security）が有効になっているか確認
2. ポリシーが正しく設定されているか確認


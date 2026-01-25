# Supabase セットアップ完全ガイド

このガイドでは、Hoiku CRMプロジェクトのSupabaseセットアップからデータ移行までを順を追って説明します。

## 📋 目次

1. [Supabaseプロジェクトの作成](#1-supabaseプロジェクトの作成)
2. [データベーススキーマの適用](#2-データベーススキーマの適用)
3. [マスターデータの投入](#3-マスターデータの投入)
4. [本番データの投入](#4-本番データの投入)
5. [環境変数の設定](#5-環境変数の設定)
6. [Google OAuth の設定](#6-google-oauth-の設定)
7. [データ検証](#7-データ検証)
8. [トラブルシューティング](#8-トラブルシューティング)

---

## 1. Supabaseプロジェクトの作成

### 1.1 アカウント作成・ログイン

1. [Supabase](https://supabase.com/) にアクセス
2. 「Start your project」をクリック（または既存アカウントでログイン）
3. GitHubアカウントでサインアップ（推奨）またはメールアドレスで登録

### 1.2 新しいプロジェクトを作成

1. ダッシュボードで「New Project」をクリック
2. プロジェクト情報を入力：
   - **Name**: `hoiku-crm`（任意の名前でOK）
   - **Database Password**: 強力なパスワードを設定（**必ず安全な場所に保管**）
   - **Region**: `Northeast Asia (Tokyo)` を選択（低レイテンシのため推奨）
   - **Pricing Plan**: Free tier で開始可能
3. 「Create new project」をクリック
4. プロジェクトの初期化完了まで**2-3分**待機

> ⚠️ **注意**: データベースパスワードは後で変更できません。必ず安全な場所（パスワードマネージャー等）に保存してください。

### 1.3 プロジェクト情報の確認

プロジェクトが作成されたら、以下の情報を確認：

1. ダッシュボードの左上にプロジェクト名が表示される
2. 「Settings」→「API」にアクセスして以下を確認（後の手順で使用）：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJI...`（長い文字列）

---

## 2. データベーススキーマの適用

### 2.1 SQL Editorを開く

1. Supabaseダッシュボードの左サイドバーから「SQL Editor」をクリック
2. 「New query」をクリックして新しいクエリを作成

### 2.2 スキーマファイルを実行

1. ローカルプロジェクトの `hoiku-crm/supabase/schema.sql` を開く
2. ファイル全体の内容をコピー
3. Supabase SQL Editorのエディタにペースト
4. 「Run」ボタン（または `Cmd/Ctrl + Enter`）をクリックして実行

### 2.3 実行結果の確認

✅ **成功時**: 「Success. No rows returned」というメッセージが表示されます

❌ **エラー時**: エラーメッセージを確認
- よくあるエラー：
  - `relation "xxx" already exists`: 既にテーブルが存在する（スキップ可能）
  - `extension "uuid-ossp" already exists`: 拡張機能が既に存在（正常）

### 2.4 テーブルの確認

1. 左サイドバーから「Table Editor」をクリック
2. 以下のテーブルが作成されていることを確認：
   - ✅ `users`
   - ✅ `sources`
   - ✅ `candidates`
   - ✅ `projects`
   - ✅ `interviews`
   - ✅ `contracts`

---

## 3. マスターデータの投入

マスターデータは2つのファイルから構成されています。

### 3.1 ユーザーデータの投入（01_users.sql）

1. SQL Editorで「New query」をクリック
2. `hoiku-crm/data/sql/01_users.sql` の内容をコピー＆ペースト
3. 「Run」をクリックして実行

✅ **期待される結果**: 11件のユーザーデータが登録されます

**登録されるユーザー**:
- 瀧澤、西田、鈴木、戸部、後藤、小畦、吉田、大塚、石井（admin）、松澤、緑

### 3.2 媒体マスタの投入（02_sources.sql）

1. SQL Editorで「New query」をクリック
2. `hoiku-crm/data/sql/02_sources.sql` の内容をコピー＆ペースト
3. 「Run」をクリックして実行

✅ **期待される結果**: 12件の追加媒体データが登録されます

**注意**: `schema.sql`で既に基本の媒体が投入されているため、これは追加分です。

### 3.3 データ確認

1. 「Table Editor」で `users` テーブルを開き、11件のデータがあることを確認
2. `sources` テーブルを開き、媒体データが登録されていることを確認

---

## 4. 本番データの投入

本番データは以下の順序で投入してください。**順序が重要**です（外部キー制約のため）。

### 4.1 求職者データの投入（03_candidates.sql）

1. SQL Editorで「New query」をクリック
2. `hoiku-crm/data/sql/03_candidates.sql` の内容をコピー＆ペースト
3. 「Run」をクリックして実行

✅ **期待される結果**: 855件の求職者データが登録されます

⏱️ **実行時間**: 約10-30秒（データ量によって異なります）

### 4.2 案件データの投入（04_projects.sql）

1. SQL Editorで「New query」をクリック
2. `hoiku-crm/data/sql/04_projects.sql` の内容をコピー＆ペースト
3. 「Run」をクリックして実行

✅ **期待される結果**: 29件の案件データが登録されます

### 4.3 成約データの投入（05_contracts.sql）

1. SQL Editorで「New query」をクリック
2. `hoiku-crm/data/sql/05_contracts.sql` の内容をコピー＆ペースト
3. 「Run」をクリックして実行

✅ **期待される結果**: 25件の成約データが登録されます

⚠️ **注意**: 4件の外部キー参照エラーがある可能性があります（元データに存在しないcandidate_id）。これは正常で、該当レコードはスキップされます。

### 4.4 面接データの投入（06_interviews.sql）

1. SQL Editorで「New query」をクリック
2. `hoiku-crm/data/sql/06_interviews.sql` の内容をコピー＆ペースト
3. 「Run」をクリックして実行

✅ **期待される結果**: 34件の面接データが登録されます

⚠️ **注意**: このSQLは`projects`テーブルから自動的に`project_id`を解決するため、実行に時間がかかる場合があります。

### 4.5 投入データの確認

各テーブルのデータ件数を確認：

```sql
-- SQL Editorで実行
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'sources', COUNT(*) FROM sources
UNION ALL
SELECT 'candidates', COUNT(*) FROM candidates
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'contracts', COUNT(*) FROM contracts
UNION ALL
SELECT 'interviews', COUNT(*) FROM interviews;
```

**期待される件数**:
| テーブル | 件数 |
|---------|------|
| users | 11 |
| sources | 20+ (初期データ + 追加分) |
| candidates | 855 |
| projects | 29 |
| contracts | 25 |
| interviews | 34 |

---

## 5. 環境変数の設定

### 5.1 環境変数ファイルの作成

`.env.example` をコピーして `.env.local` を作成します。

```bash
cd hoiku-crm
cp .env.example .env.local
```

### 5.2 環境変数の設定

`.env.local` を開き、プレースホルダーを実際の値に置き換えます。

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
```

**値の取得方法**:
1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 「Project URL」をコピーして `NEXT_PUBLIC_SUPABASE_URL` に設定
3. 「anon public」の鍵をコピーして `NEXT_PUBLIC_SUPABASE_ANON_KEY` に設定

### 5.3 環境変数の確認

開発サーバーを起動して動作確認：

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開き、エラーが発生しないことを確認してください。

---

## 6. Google OAuth の設定

Google OAuthを設定することで、Googleアカウントでログインできるようになります。

### 6.1 Google Cloud Console での設定

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または「プロジェクトを作成」で新規作成）
3. 「APIとサービス」→「認証情報」を開く
4. 「認証情報を作成」→「OAuthクライアントID」を選択
5. アプリケーションの種類: **「ウェブアプリケーション」**
6. 名前: `Hoiku CRM`（任意）
7. **承認済みのリダイレクトURI**に以下を追加：
   ```
   https://<your-project-id>.supabase.co/auth/v1/callback
   ```
   - `<your-project-id>` はSupabaseプロジェクトID（URLから取得可能）
   - 例: `https://abcdefghijklmnop.supabase.co/auth/v1/callback`
8. 「作成」をクリック
9. **クライアントID**と**クライアントシークレット**をコピー（後で使用）

### 6.2 Supabase での設定

1. Supabaseダッシュボードで「Authentication」→「Providers」を開く
2. 「Google」を探してクリック
3. 「Enable Google provider」をオンにする
4. Google Cloud Consoleで取得した以下を入力：
   - **Client ID (for OAuth)**: クライアントIDを貼り付け
   - **Client Secret (for OAuth)**: クライアントシークレットを貼り付け
5. 「Save」をクリック

### 6.3 （オプション）特定ドメインのみ許可

会社のGoogle Workspaceドメインのユーザーのみログインを許可する場合：

1. 「Authentication」→「Providers」→「Google」
2. 「Authorized domains」に会社のドメインを追加
   - 例: `example.com`
3. 「Save」をクリック

### 6.4 ログイン動作確認

1. 開発サーバーを起動（`npm run dev`）
2. http://localhost:3000/login にアクセス
3. 「Googleでログイン」ボタンをクリック
4. Googleアカウントでログインできることを確認

---

## 7. データ検証

データが正しく投入されているか確認します。

### 7.1 基本検証（SQL）

SQL Editorで以下を実行：

```sql
-- 各テーブルの件数確認
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'sources', COUNT(*) FROM sources
UNION ALL
SELECT 'candidates', COUNT(*) FROM candidates
UNION ALL
SELECT 'projects', COUNT(*) FROM projects
UNION ALL
SELECT 'contracts', COUNT(*) FROM contracts
UNION ALL
SELECT 'interviews', COUNT(*) FROM interviews;
```

### 7.2 外部キー整合性チェック

```sql
-- contracts の外部キー参照確認
SELECT 
  c.id,
  c.name,
  CASE WHEN cd.candidate_id IS NULL THEN 'Missing' ELSE 'OK' END as contract_status
FROM candidates c
LEFT JOIN contracts cd ON c.id = cd.candidate_id
WHERE cd.candidate_id IS NOT NULL;

-- projects の外部キー参照確認
SELECT 
  c.id,
  c.name,
  CASE WHEN p.candidate_id IS NULL THEN 'Missing' ELSE 'OK' END as project_status
FROM candidates c
LEFT JOIN projects p ON c.id = p.candidate_id
WHERE p.candidate_id IS NOT NULL;
```

### 7.3 サンプルデータの確認

```sql
-- 求職者データのサンプル
SELECT * FROM candidates LIMIT 5;

-- 成約データのサンプル
SELECT 
  c.name,
  c.email,
  cd.revenue_including_tax,
  cd.accepted_date
FROM candidates c
JOIN contracts cd ON c.id = cd.candidate_id
LIMIT 5;
```

---

## 8. トラブルシューティング

### 8.1 SQL実行エラー

**エラー: `relation "xxx" already exists`**
- **原因**: テーブルが既に存在する
- **解決策**: 問題ありません。既存のテーブルはスキップされます

**エラー: `duplicate key value violates unique constraint`**
- **原因**: 重複するIDや一意制約違反
- **解決策**: SQLファイルの`ON CONFLICT DO UPDATE`句が機能しています

**エラー: `foreign key constraint violated`**
- **原因**: 外部キー参照先が存在しない
- **解決策**: 
  1. データ投入順序を確認（マスターデータ → 基本データ → 関連データ）
  2. 参照先テーブルにデータが存在するか確認

### 8.2 環境変数エラー

**エラー: `NEXT_PUBLIC_SUPABASE_URL is not defined`**
- **原因**: `.env.local`ファイルが存在しない、または値が設定されていない
- **解決策**: 
  1. プロジェクトルートに`.env.local`ファイルが存在するか確認
  2. 環境変数が正しく設定されているか確認
  3. 開発サーバーを再起動（`npm run dev`）

### 8.3 ログインできない

**Google OAuthが動作しない**
- **原因**: 
  1. Google Cloud ConsoleのリダイレクトURIが間違っている
  2. Supabaseの設定が正しくない
- **解決策**:
  1. リダイレクトURIが正しいか確認（`https://<project-id>.supabase.co/auth/v1/callback`）
  2. Supabaseの「Authentication」→「Providers」でGoogleが有効化されているか確認
  3. クライアントID/シークレットが正しく入力されているか確認

### 8.4 データが表示されない

**RLS（Row Level Security）エラー**
- **原因**: RLSポリシーが厳しすぎる、または未設定
- **解決策**:
  1. `schema.sql`を確認し、RLSポリシーが正しく設定されているか確認
  2. 認証されたユーザーに適切な権限があるか確認

**データ件数が0件**
- **原因**: データ投入が失敗している
- **解決策**:
  1. SQL Editorの実行結果を確認
  2. エラーメッセージがないか確認
  3. テーブルエディタでデータが存在するか確認

### 8.5 実行時間が長い

**大量データ投入時にタイムアウト**
- **原因**: データ量が多いため
- **解決策**:
  1. データを分割して投入（例: 500件ずつ）
  2. Supabaseのタイムアウト設定を確認
  3. バッチ処理を使用（現在のSQLファイルは一括投入のため、必要に応じて分割）

---

## 📝 次のステップ

Supabaseのセットアップが完了したら：

1. ✅ **フロントエンド統合**: モックデータからSupabaseクエリへ切り替え
2. ✅ **データ検証**: アプリケーション上でデータが正しく表示されるか確認
3. ✅ **本番デプロイ**: Vercel等へのデプロイ準備

詳細は `FRONTEND_INTEGRATION.md`（今後作成）を参照してください。

---

## 🔗 関連ファイル

- **スキーマ定義**: `hoiku-crm/supabase/schema.sql`
- **データSQL**: `hoiku-crm/data/sql/01_users.sql` 〜 `06_interviews.sql`
- **検証レポート**: `hoiku-crm/data/sql/VALIDATION_REPORT.md`
- **データ定義書**: `hoiku-crm/DATA_DEFINITION.md`

---

## 📞 サポート

問題が解決しない場合は、以下を確認してください：

1. Supabase公式ドキュメント: https://supabase.com/docs
2. Next.js + Supabaseガイド: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs

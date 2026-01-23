# デプロイ前チェックリスト

## 1. Supabaseプロジェクトの準備

### 1.1 Supabaseプロジェクト作成
- [ ] Supabaseダッシュボードで新規プロジェクトを作成
- [ ] プロジェクトURL、Anon Keyをメモ

### 1.2 データベーススキーマの作成

**重要: 以下の順番でSQLを実行してください**

1. **基本スキーマ** (`supabase/schema.sql`)
   ```
   - users テーブル
   - sources テーブル + 初期データ
   - candidates テーブル
   - projects テーブル
   - interviews テーブル
   - contracts テーブル（基本カラムのみ）
   - RLSポリシー
   - インデックス
   ```

2. **追加スキーマ** (`supabase/schema_additional.sql`)
   ```
   - memos テーブル
   - settings テーブル + 初期設定
   - approach_priorities テーブル
   - candidate_ranks テーブル
   - notifications テーブル
   - timeline_events テーブル
   - status_history テーブル
   - email_logs テーブル
   - contracts テーブル追加カラム（重要!）
     - project_id
     - contracted_at
     - entry_date
     - placement_company_name
     - placement_facility_name
     - is_cancelled
     - refund_required
     - refund_date
     - refund_amount
     - cancellation_reason
     - payment_scheduled_date
   - トリガー（ステータス変更履歴、成約自動作成）
   ```

### 1.3 初期データの投入（オプション）

テストデータが必要な場合、以下を順番に実行：
```
data/sql/01_users.sql
data/sql/02_sources.sql
data/sql/03_candidates.sql
data/sql/04_projects.sql
data/sql/05_contracts.sql
data/sql/06_interviews.sql
```

---

## 2. 環境変数の設定

### 2.1 Vercel環境変数

```bash
# 必須
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 本番モードで動作させる
DEMO_MODE=false
```

### 2.2 ローカル開発用 (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DEMO_MODE=false
```

---

## 3. Supabase認証の設定

### 3.1 Auth設定
- [ ] Email認証を有効化
- [ ] サイトURLを設定（例: `https://your-app.vercel.app`）
- [ ] リダイレクトURLを設定（例: `https://your-app.vercel.app/auth/callback`）

### 3.2 初期管理者ユーザーの作成
1. Supabase AuthenticationでEmailユーザーを作成
2. `users`テーブルに同じメールアドレスで管理者レコードを追加：
   ```sql
   INSERT INTO users (id, email, name, role) VALUES 
   ('auth-user-uuid', 'admin@example.com', '管理者', 'admin');
   ```

---

## 4. 動作確認チェックリスト

### 4.1 認証
- [ ] ログイン画面が表示される
- [ ] ログインできる
- [ ] ログアウトできる
- [ ] 未ログイン時はログイン画面にリダイレクトされる

### 4.2 ダッシュボード
- [ ] KPI数値が表示される
- [ ] 目標進捗が表示される
- [ ] 担当者別パフォーマンスが表示される

### 4.3 求職者管理
- [ ] 一覧が表示される
- [ ] ステータス変更ができる
- [ ] 担当者変更ができる
- [ ] フィルタリングが動作する
- [ ] 検索が動作する

### 4.4 成約管理
- [ ] 一覧が表示される
- [ ] 月別フィルタが動作する
- [ ] 編集ダイアログが動作する
- [ ] キャンセル処理ができる

### 4.5 面接一覧
- [ ] 一覧が表示される
- [ ] ステータス変更ができる
- [ ] 担当者変更ができる

### 4.6 メンバー画面
- [ ] メンバー一覧が表示される
- [ ] 担当求職者が表示される
- [ ] 編集ダイアログが動作する

### 4.7 管理画面
- [ ] 管理者のみアクセス可能
- [ ] ユーザー追加・編集・削除ができる
- [ ] 媒体マスタ追加・編集・削除ができる

---

## 5. トラブルシューティング

### データが表示されない場合
1. ブラウザのコンソールでエラーを確認
2. Supabaseダッシュボードでテーブルにデータがあるか確認
3. RLSポリシーが正しく設定されているか確認
4. 環境変数が正しいか確認（`DEMO_MODE=false`になっているか）

### 認証エラーの場合
1. Supabase AuthのサイトURL設定を確認
2. リダイレクトURLが正しいか確認
3. Anon Keyが正しいか確認

### 更新ができない場合
1. RLSのUPDATEポリシーを確認
2. `auth.uid()`が正しく取得できているか確認

---

## 6. 推奨設定

### パフォーマンス
- [ ] Vercelのリージョンを日本に設定（Tokyo: hnd1）
- [ ] Supabaseのリージョンを日本に設定（Tokyo）

### セキュリティ
- [ ] 本番環境のAnon Keyを別途発行
- [ ] RLSが全テーブルで有効か確認
- [ ] 管理者権限のユーザーが適切に設定されているか確認

---

## 7. 完了確認

- [ ] 上記すべてのチェック項目を確認
- [ ] 本番URLでアクセスできることを確認
- [ ] 実際の操作で問題がないことを確認

**デプロイ完了日**: _______________

**確認者**: _______________

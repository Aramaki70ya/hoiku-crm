# Supabase接続エラー「Failed to fetch」の解決方法

## エラー内容
```
Failed to fetch
at SupabaseAuthClient._refreshAccessToken
```

## 考えられる原因と解決方法

### 1. 開発サーバーの再起動が必要

環境変数を変更した後は、開発サーバーを再起動する必要があります。

```bash
# 開発サーバーを停止（Ctrl+C）
# その後、再起動
npm run dev
```

### 2. 環境変数の確認

`.env.local`ファイルが正しく設定されているか確認：

```bash
# プロジェクトルートで確認
cat .env.local
```

以下の2つの環境変数が設定されている必要があります：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. SupabaseのURLとキーが正しいか確認

1. Supabaseダッシュボードにアクセス
   - https://supabase.com/dashboard
   - プロジェクトを選択

2. Settings → API を開く
   - **Project URL** をコピー → `NEXT_PUBLIC_SUPABASE_URL` に設定
   - **anon public** のキーをコピー → `NEXT_PUBLIC_SUPABASE_ANON_KEY` に設定

3. `.env.local`を更新して保存

4. 開発サーバーを再起動

### 4. ネットワーク接続の確認

Supabaseのプロジェクトが停止していないか確認：

```bash
# SupabaseのURLにアクセスできるか確認
curl https://oqgoaywxdewqxtclupzu.supabase.co
```

### 5. ブラウザのコンソールで詳細を確認

1. ブラウザの開発者ツールを開く（F12）
2. Consoleタブを確認
3. エラーメッセージの詳細を確認

### 6. デバッグページで確認

`/debug-auth` ページにアクセスして、環境変数が正しく読み込まれているか確認：

```
http://localhost:3000/debug-auth
```

### 7. キャッシュのクリア

ブラウザのキャッシュをクリア：

1. ブラウザの開発者ツールを開く（F12）
2. Networkタブを開く
3. 「Disable cache」にチェック
4. ページをリロード（Cmd+Shift+R / Ctrl+Shift+R）

### 8. Next.jsのキャッシュをクリア

```bash
# .nextフォルダを削除して再ビルド
rm -rf .next
npm run dev
```

---

## 確認手順

1. ✅ `.env.local`ファイルが存在する
2. ✅ `NEXT_PUBLIC_SUPABASE_URL`が設定されている
3. ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`が設定されている
4. ✅ 開発サーバーを再起動した
5. ✅ Supabaseのプロジェクトが稼働している
6. ✅ ネットワーク接続が正常

---

## それでも解決しない場合

1. Supabaseダッシュボードでプロジェクトの状態を確認
2. Supabaseのログを確認（Dashboard → Logs）
3. ブラウザのコンソールで詳細なエラーメッセージを確認
4. `/debug-auth`ページで環境変数の状態を確認

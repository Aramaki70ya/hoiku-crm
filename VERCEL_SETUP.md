# Vercelデプロイ設定ガイド

## エラー解決方法

### エラー内容
```
Error: @supabase/ssr: Your project's URL and API key are required to create a Supabase client!
```

### 解決方法1: Supabase環境変数を設定（本番環境用）

1. **Vercelダッシュボードにアクセス**
   - https://vercel.com/dashboard
   - プロジェクトを選択

2. **環境変数を設定**
   - Settings → Environment Variables を開く
   - 以下の環境変数を追加：

   | 変数名 | 値 | 説明 |
   |--------|-----|------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | SupabaseプロジェクトのURL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | SupabaseのAnon Key |

3. **Supabaseの値を取得**
   - Supabaseダッシュボード: https://supabase.com/dashboard
   - プロジェクトを選択
   - Settings → API
   - Project URL と anon public key をコピー

4. **環境を選択**
   - Production, Preview, Development すべてに適用することを推奨

5. **再デプロイ**
   - Deployments タブで「Redeploy」をクリック

---

### 解決方法2: デモモードを有効にする（Supabase不要の場合）

Supabaseを使わずに動作確認したい場合：

1. **Vercelダッシュボードで環境変数を追加**
   - Settings → Environment Variables
   - 変数名: `DEMO_MODE`
   - 値: `true`
   - 環境: Production, Preview, Development すべて

2. **再デプロイ**
   - Deployments タブで「Redeploy」をクリック

⚠️ **注意**: デモモードでは認証機能が無効になります。

---

## 環境変数の確認方法

ローカルで環境変数を確認する場合：

```bash
# .env.local ファイルを作成（存在しない場合）
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EOF
```

---

## トラブルシューティング

### 環境変数が反映されない場合
1. 環境変数を設定後、必ず再デプロイしてください
2. 変数名にタイポがないか確認（`NEXT_PUBLIC_` プレフィックスが必要）
3. Vercelのログで環境変数が読み込まれているか確認

### ビルドエラーが続く場合
1. Vercelのビルドログを確認
2. ローカルで `npm run build` を実行してエラーを確認
3. 環境変数が正しく設定されているか再確認

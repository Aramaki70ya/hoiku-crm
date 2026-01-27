# 瀧澤さんがログインできないとき

## 原因になりがちなこと

- **メールが違う**: DB が `takizawa@hoiku-crm.local`、ログインは `takizawa@josei-katuyaku.co.jp` だと一致しない（**ログインは auth を見る**ので、`auth.users` のメールも合わせないとダメ）
- **認証ユーザーなし / パスワード違う**: `auth.users` にいない or パスワードが違う

---

## やること（この順で）

### 1. 1本の SQL でまとめて直す（まずこれ）

1. [Supabase](https://supabase.com) → **SQL Editor**
2. **`supabase/fix_takizawa_login.sql`** を開いて **全文コピペ** → **Run**
3. これで次が一気にできる：
   - `public.users` の瀧澤メール → `takizawa@josei-katuyaku.co.jp`
   - `auth.users` の瀧澤メール → 同様に更新
   - `auth` のパスワード → `Takizawa2025!` に設定

実行後、末尾の **確認用 SELECT** の結果を見る：

- `auth.users` に **1行** 出て、`pwd` が **✅ パスワード設定済** なら → **2. はスキップ**して **3. ログイン**へ。
- `auth.users` が **0行**（瀧澤の認証ユーザーがもともといない）なら → **2. の Node スクリプト**を実行する。

### 2. 認証ユーザーがいないときだけ（0行だった場合）

ターミナルで：

```bash
cd hoiku-crm

export SUPABASE_URL="https://あなたのプロジェクト.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="service_roleの秘密鍵"

node scripts/fix-takizawa-login.js
```

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` は、Supabase **Settings → API** の **Project URL** と **service_role key（secret）**。

### 3. ログイン

- **メール**: `takizawa@josei-katuyaku.co.jp`
- **パスワード**: `Takizawa2025!`

---

## まだ入れないとき

- メール・パスワードの **コピペミス**（余白・全角など）がないか確認
- **シークレット窓**で試す
- Supabase **Authentication → Users** で `takizawa@josei-katuyaku.co.jp` が存在するか確認
- 使っている **Supabase プロジェクト** と、アプリの `.env.local` の `NEXT_PUBLIC_SUPABASE_URL` が同じか確認

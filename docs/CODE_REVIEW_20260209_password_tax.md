# コードレビュー（2026-02-09）パスワードリセット・税抜表示

## 対象変更

- パスワードリセット: 本番URLリダイレクト、recovery フロー、新パスワード設定ページ
- ダッシュボード: 売上・進捗・不足金額を税抜ベースに統一
- 予算0円時の除算ガード追加

---

## 1. セキュリティ

- **reset-password API**: 管理者のみ（`getAuthContext` + `isAdminUser`）。メール形式は正規表現で検証。`redirectTo` は環境変数由来でハードコードなし。✅
- **auth/callback**: `token_hash` / `type` は Supabase 標準のリセット用パラメータ。検証は `verifyOtp` に委譲。✅
- **set-password**: セッション必須（`getUser`）。パスワード更新は `supabase.auth.updateUser` のみ。機密情報のログ出力なし。✅
- **page.tsx**: 表示ロジックのみで新規の認証・入力経路なし。✅

## 2. 設計・正確性

- **税抜計算**: `periodTotalSalesExcludingTax = Math.round(periodTotalSales / 1.1)`。予算が税抜前提のため、不足金額・達成率も税抜で一貫。✅
- **actualRevenuePerClosed**: 税込のまま（KPI前提条件として意図どおり）。✅
- **budget === 0**: 達成率表示で `Infinity` にならないよう `budget > 0` でガード済み。✅

## 3. コード品質

- **型**: `any` 未使用。✅
- **set-password**: Hooks は条件分岐前に固定順で呼び出し。`'use client'` 適切。✅
- **reset-password**: 入力は `(await request.json()) as { email?: string }` のあと正規表現で検証。Zod 未使用だがメールのみの簡易APIのため許容。将来 Zod 導入可。✅

## 4. 技術スタック

- Next.js App Router、`@supabase/ssr` の利用に問題なし。✅
- 認証フロー（callback → set-password）はミドルウェアで `/auth` 許可済み。✅

## 5. パフォーマンス・規約

- 不要な再レンダリングや N+1 はなし。✅
- 既存のログインページと同様の Card/ラベル構成。✅

## 結論

- **Critical/High 指摘なし**。ビルド・型チェック済み。
- 今回の変更のみコミットし、push して問題なし。

# hoiku-crm 包括的コードレビュー

実施日: 2026年3月  
対象: ダッシュボード・求職者反映バグをきっかけに、同種の不具合を防ぐための他箇所のレビュー。

---

## 1. 今回修正した事象の整理（再発防止のため）

| 事象 | 原因 | 対応 |
|------|------|------|
| 求職者を「日程調整中」などにしてもダッシュボードに反映されない | 面接状況で「プロジェクトが0件の候補者」を `return` でスキップしていた | プロジェクトがなくても候補者を表示（金額0・ヨミなしで表示） |
| 読み金額を2回入力しないとダッシュボードに出ない | projects PATCH がリクエストに含まれていないフィールドを `null` で上書きしていた | リクエストに含まれるフィールドのみ更新するよう変更 |
| データの鮮度 | 再取得が visibilitychange / pageshow のみで、同一ウィンドウ内遷移で更新されない場合があった | `window.focus` でも再取得するよう追加 |

---

## 2. セキュリティチェック

### 2.1 データアクセス制御 ✅
- フロントからDB直接接続はしておらず、API/ミドルウェア経由でアクセスしている。
- 主要API（candidates, projects, contracts, interviews, users）で認証チェック（`getUser()`）を実施している。
- Supabase RLS の運用状況は別途確認推奨。

### 2.2 機密情報 ✅
- APIキーはサーバー側の環境変数で管理されている想定（`.env.local`）。
- ログにパスワードやトークンを出している箇所は見当たらない。

### 2.3 入力値の検証
- **users/[id] PATCH**: メール形式・ロールのバリデーションあり ✅
- **candidates PATCH**: ステータスは `STATUS_LIST` で許可値チェックあり ✅
- **contracts PATCH**: 本レビューで許可フィールドのホワイトリスト化を実施（後述）。

---

## 3. 設計・正確性チェック（今回の教訓を踏まえた観点）

### 3.1 PATCH API の「部分更新」安全性

**原則**: クライアントが送った body をそのまま `update({ ...body })` すると、  
「送っていないキー」が undefined ではなく、別画面で `null` が送られると他カラムが上書きされるリスクがある。  
また、`id` や `candidate_id` など変更すべきでないキーが body に含まれると危険。  
→ **更新可能フィールドをホワイトリストで限定し、`key in body` または `body[key] !== undefined` のときだけ更新する**実装が安全。

| API | 修正前 | 修正後 |
|-----|--------|--------|
| **projects/[id] PATCH** | 全フィールドを固定で組み立てており、ヨミ保存時に園名等が null で上書きされていた | ✅ リクエストに含まれるフィールドのみ更新するよう修正済み（事前対応） |
| **contracts/[id] PATCH** | `update({ ...body })` で body をそのまま展開 | ✅ 許可フィールドのみ `updateRow` に積み、それだけを update するよう修正 |
| **sources/[id] PATCH** | `update(body)` で body をそのまま渡していた | ✅ `name`, `category` のみ許可するホワイトリストに変更 |
| **interviews/[id] PATCH** | もともと `ALLOWED_PATCH_FIELDS` で許可キーのみ反映 | ✅ 変更なし（良好） |
| **users/[id] PATCH** | `name` / `email` / `role` を条件付きでだけ渡している | ✅ 変更なし（良好） |
| **candidates/[id] PATCH** | `ALLOWED_KEYS` で許可キーのみ `updatePayload` に積んでいる | ✅ 変更なし（良好） |

### 3.2 「表示されない」系バグのパターン

- **「〇〇が0件のとき return」でスキップ**  
  → 0件でも「なし」や「0円」として表示するか、別の扱いを仕様で決める。
- **集計対象のソート・選択ロジックの不一致**  
  → 例: 一覧は「先頭1件」、ダッシュボードは「updated_at 最大1件」で別プロジェクトを参照しないよう、  
  「どの1件を代表とするか」をドキュメントと実装で揃える（`DASHBOARD_面接・成約の集計ロジック.md` 等で明文化済みなら維持）。

### 3.3 データの鮮度（再取得タイミング）

- **dashboard-summary**: 初回マウント・`visibilitychange`・`pageshow` に加え、**`window.focus`** で再取得するよう対応済み。
- **contracts 一覧**: `useContracts` の `refetch` はあるが、成約編集後にダッシュボードへ遷移した場合はダッシュボード側の focus/visibility で再取得される想定で問題なし。
- 他画面で「別タブで更新したあと戻ったら古いまま」が気になる場合は、同様に `visibilitychange` または `focus` で再取得を検討。

---

## 4. コード品質・規約

### 4.1 型安全性
- `any` の乱用は見当たらない。API の `body` は `Record<string, unknown>` や型アサーションで受けており、許容範囲。

### 4.2 React / Next.js
- `'use client'` の使用、Hooks の順序は妥当。
- ダッシュボードの `fetchData` は `useCallback` で依存を固定し、`useEffect` で初回実行されており問題なし。

### 4.3 禁止事項
- 画像は Next.js の `Image` 利用を推奨（既存の `<img>` があれば順次置き換え検討で十分）。

---

## 5. 今回実施した修正のまとめ

1. **dashboard-summary/page.tsx**
   - 面接状況: プロジェクトが0件の候補者も表示するよう変更（金額・ヨミは 0 / 空）。
   - 再取得: `window.addEventListener('focus', onFocus)` を追加。

2. **api/projects/[id]/route.ts**（事前対応済み）
   - PATCH で、リクエストに含まれるフィールドのみを `updateRow` に積み、それだけを `update` するよう変更。

3. **api/contracts/[id]/route.ts**
   - PATCH で、`ALLOWED_PATCH_FIELDS` に列挙したフィールドのみを反映するよう変更。
   - `id` / `candidate_id` / `created_at` 等は更新しない。

4. **api/sources/[id]/route.ts**
   - PATCH で、`name` と `category` のみ更新するよう変更。
   - 空更新の場合は 400 を返すようにした。

---

## 6. 今後の注意ポイント（チェックリスト）

- [ ] **新規 PATCH API を追加するとき**  
  更新可能フィールドをホワイトリストで限定し、`body` をそのまま `update` に渡さない。
- [ ] **一覧・ダッシュボードで「0件なら return」している箇所**  
  仕様上「0件でも行として出す」「金額0で出す」が必要なら、スキップしない。
- [ ] **「代表1件」の選び方**  
  複数レコードから「最新1件」などを選ぶ場合、一覧・ダッシュボード・API で同じルール（例: `updated_at` 降順の先頭）を使う。
- [ ] **他画面で更新したあと戻ってくる画面**  
  必要に応じて `visibilitychange` や `focus` で再取得する。

---

## 7. 参照

- 開発ルール: `.cursor/skills/development/SKILL.md`
- ダッシュボード集計ロジック: `docs/DASHBOARD_面接・成約の集計ロジック.md`
- データフロー: `docs/DATA_FLOW.md`

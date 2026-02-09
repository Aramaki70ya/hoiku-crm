# コードレビュー：実装した機能のチェック

対象: 直近で実装した機能（求職者一覧検索・面接一覧タブ・ヘッダー・求職者詳細案件表示・mock-data 型対応など）

---

## 1. セキュリティチェック

### [Medium] 検索文字列の LIKE ワイルドカード

**問題点:**
- `src/app/api/candidates/route.ts` 67行目で `search` をそのまま `ilike.%${search}%` に埋め込んでいる。
- ユーザーが `%` や `_` を入力すると、SQL の LIKE として意図しないマッチ（ワイルドカード扱い）になる。

**理由:**
- 現状は Supabase のクライアント経由でプレースホルダー化されているため SQL インジェクションにはならないが、`%`/`_` のエスケープをしていないと「全件ヒット」「1文字ワイルドカード」などの挙動になる。

**修正案:**
- 検索文字列から `%` と `_` をエスケープしてからクエリに渡す。

```ts
// Before
if (search) {
  query = query.or(`name.ilike.%${search}%,id.ilike.%${search}%,phone.ilike.%${search}%`)
}

// After（例）
const escapeForLike = (s: string) => s.replace(/[%_\\]/g, '\\$&')
const safeSearch = escapeForLike(search)
if (search) {
  query = query.or(`name.ilike.%${safeSearch}%,id.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%`)
}
```

**影響範囲:** 求職者一覧の検索結果のみ。既存の正常な入力には影響しない。

---

### [Low] その他

- データ取得は API 経由で、認証チェックも API 側で実施されている想定で問題なし。
- 機密情報のフロント露出や、課金判定のクライアント依存は見当たらず。

---

## 2. 設計・正確性チェック

### [Low] 面接一覧の二重取得

**問題点:**
- 面接一覧ページで `useInterviews` と `useCandidates({ status: '面接日程調整中', ... })` の 2 本を叩いている。
- 調整中タブで「面接未登録の面接日程調整中」を出すための妥当な設計だが、常に両方走る。

**理由:**
- 現状の要件（調整中に面接未登録も表示）を満たすには必要なトレードオフ。過度な最適化提案はしない。

**修正案:**
- 現状のままで可。将来的に「調整中タブを開いたときだけ候補取得」などにしてもよいが、必須ではない。

---

### [Low] 求職者詳細の `Project` 型アサート

**問題点:**
- `candidates/[id]/page.tsx` で `project as Project & { garden_name?: ... }` でキャストしている。
- 本番（Vercel）側の型とリポジトリの `Project` 型の不一致を吸収するための対応。

**理由:**
- 型定義が環境で揃っていないため、実行時には `garden_name` が返っている前提のキャストになっている。

**修正案:**
- 中期的には `src/types/database.ts` の `Project` に `garden_name` / `corporation_name` が含まれることを全環境で共通化し、キャストを外すのが望ましい。
- 短期は現状のキャストのままでよい。

---

### [Low] mock-data の `as unknown as Project[]`

**問題点:**
- `mockProjects` を `as unknown as Project[]` でアサートしている。
- ビルドを通すための対応で、型と実データの乖離を握りつぶしている。

**理由:**
- デプロイ環境の型とリポジトリの型の差を吸収するための暫定対応として理解できる。

**修正案:**
- 型定義を揃えたうえで、`as unknown as Project[]` を外し、`mockProjects: Project[]` で宣言できるようにするのが理想。

---

## 3. コード品質・規約

### [Low] ヘッダーの `data-app-rev` のハードコード

**問題点:**
- `data-app-rev="20260205-no-search"` が固定値。
- 本番が「どのビルドか」の確認用としては有効だが、日付の更新を手動で行う前提になる。

**理由:**
- デプロイ確認用の簡易手段として許容範囲。自動化するかは運用次第。

**修正案:**
- 必要なら `process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA` やビルド日時を表示するようにしてもよい（任意）。

---

### [OK] React Hooks・Suspense

- 面接一覧で `useSearchParams` を `InterviewsPageContent` 内で使用し、デフォルト export で `Suspense` でラップできている。
- 求職者一覧も同様に `Suspense` でラップ済み。Hooks の順序・early return 前の呼び出しも問題なし。

---

### [OK] 求職者一覧の検索（Enter で実行）

- `searchInputValue` と `searchQuery` の分離、Enter で `setSearchQuery(searchInputValue)` する仕様は意図どおり。
- プレースホルダー「(Enterで検索)」で挙動が分かりやすい。

---

### [OK] 面接一覧の求職者ステータス連動

- タブの出し分け・件数・表示ステータスをすべて `candidate.status`（面接日程調整中 / 面接確定済 / 面接実施済（結果待ち））基準にしてあり、仕様と一致。
- 調整中タブに「面接未登録の面接日程調整中」をプレースホルダーで含める実装も妥当。
- プレースホルダー行の `consultant: c.consultant ?? undefined` で null を潰しており、型エラー対策として適切。

---

## 4. パフォーマンス

- 面接一覧で `useCandidates` を limit 1000 で呼んでいるが、調整中タブ用の候補取得として許容範囲。
- `useMemo` で `reschedulingList` / `candidateIdsInInterviewsList` などを計算しており、不要な再計算は抑えられている。

---

## 5. まとめ

| 優先度 | 件数 | 内容 |
|--------|------|------|
| Critical | 0 | - |
| High | 0 | - |
| Medium | 1 | 検索文字列の `%` / `_` エスケープ（API） |
| Low | 4 | 二重取得の整理検討、Project 型統一、mock 型アサート、data-app-rev の運用 |

**推奨対応**
- **Medium**: 求職者検索 API で `search` を LIKE 用にエスケープする処理を入れる。
- **Low**: 型定義（`Project` / mock）を環境で揃え、キャストや `as unknown as` を減らす方向で余裕があれば対応。

**総評**
- 実装した機能（Enter 検索、面接タブの求職者ステータス連動、調整中に面接未登録表示、ヘッダー仕様明示）は仕様どおり動作する設計になっており、セキュリティ上の致命的な問題はない。型まわりは環境差の吸収でキャストが入っているので、型定義の統一で少しずつ整理するのがよい。

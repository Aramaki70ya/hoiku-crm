# コードレビュー: ダッシュボード面接・成約集計ロジック変更（2026-02-09）

## 対象
- `src/app/dashboard-summary/page.tsx` の変更のみ

## 変更概要
1. **面接数**: その月に「面接フェーズ」のステータスになった人のみカウント（成約のみその月の人は含めない）
2. **成約数**: status_history と contracts を常にマージして集計（漏れ防止）
3. **面接数**: status_history（面接フェーズのみ）と interviews を常にマージ

---

## レビュー結果

### 1. セキュリティ
- **問題なし**: 集計ロジックの変更のみ。入力値の検証・RLS・認証には変更なし。

### 2. 設計・正確性
- **問題なし**: 面接数は「面接日程調整中・面接確定済・面接実施済（結果待ち）」に限定し、成約のみの人は含めない仕様で一貫している。
- **問題なし**: 成約は status_history と periodContracts を Set でマージしているため重複は除去される。

### 3. 型・品質
- **問題なし**: INTERVIEW_PHASE_STATUSES / INTERVIEW_RELEVANT_STATUSES の分割は明確。getStatusCases 内の INTERVIEW_RELEVANT_STATUSES は従来どおり（面接一覧用）で、混同なし。
- **問題なし**: useMemo の依存配列に periodInterviews, projects, periodContracts が正しく含まれている。

### 4. パフォーマンス
- **問題なし**: periodInterviews / periodContracts は既存の useMemo に依存。追加のループは Set への add のみで軽量。

### 5. 規約・既存パターン
- **問題なし**: 既存の「ソース1・ソース2」コメントスタイルと useMemo の書き方に準拠。

---

## 軽微な確認事項（対応任意）

**[Low] periodContracts と is_cancelled**
- `periodContracts` は現在 `contracts` を期間でフィルタしているのみで、`is_cancelled` で除外していない。
- 成約数に「解約済み」を含めたくない場合は、`periodContracts` の useMemo 内で `c.is_cancelled` を除外する検討余地あり。既存仕様が「契約テーブルをそのまま集計」であれば変更不要。

---

## チェック実施
- [x] TypeScript `tsc --noEmit`: 成功
- [x] ビルド `npm run build`: 成功
- [x] 変更ファイルの Lint: 対象ファイルに新規エラーなし（他ファイルの lint エラーは既存）

**結論: 問題なし。push してよい。**

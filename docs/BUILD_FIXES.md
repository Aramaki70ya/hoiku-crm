# ビルドエラー修正ドキュメント

## 発生したエラーと根本原因

### 1. Next.js 16の型エラー（Request → NextRequest）

**エラー**: `Type 'Request' is not assignable to type 'NextRequest'`

**根本原因**: Next.js 16では、API Routeハンドラーの第1引数は`NextRequest`型である必要がある

**修正ファイル**:
- `src/app/api/users/[id]/route.ts`
- `src/app/api/users/route.ts`
- `src/app/api/users/reset-password/route.ts`

**修正内容**: `Request` → `NextRequest` に変更

---

### 2. 型の衝突（Userアイコン vs User型）

**エラー**: `Duplicate identifier 'User'`

**根本原因**: `lucide-react`の`User`アイコンと`@/types/database`の`User`型が同じ名前で衝突

**修正ファイル**: `src/app/interviews/page.tsx`

**修正内容**: 
- `lucide-react`の`User`を`UserIcon`にリネーム
- 型インポートをファイルの先頭に移動

---

### 3. 不完全なリファクタリング（mockProjects）

**エラー**: `Cannot find name 'mockProjects'`

**根本原因**: モックデータからAPI連携に移行する際に、一部の参照が残っていた

**修正ファイル**: `src/app/members/page.tsx`

**修正内容**: `mockProjects` → `projects`（状態変数）に変更

---

### 4. 型定義とモックデータの不整合

**エラー**: `Property 'project_id' is missing in type...`

**根本原因**: データベーススキーマ（`schema_additional.sql`）に追加されたカラムがモックデータに反映されていない

**修正ファイル**: `src/lib/mock-data.ts`

**修正内容**: すべての`mockContracts`エントリに以下を追加：
- `project_id: null | string`
- `contracted_at: string`
- `entry_date: null | string`

---

### 5. 重複エクスポート（queries.ts）

**エラー**: `Cannot redeclare exported variable 'getCandidates'`

**根本原因**: `queries.ts`で再エクスポートと古い関数定義が重複していた

**修正ファイル**: `src/lib/supabase/queries.ts`

**修正内容**: 古い関数定義を削除し、再エクスポートのみに統一

---

### 6. AppLayoutの必須プロパティ

**エラー**: `Property 'title' is missing in type...`

**根本原因**: `AppLayout`コンポーネントの`title`プロパティが必須になっている

**修正ファイル**: `src/app/page.tsx`

**修正内容**: ローディング時の`AppLayout`に`title`と`description`を追加

---

## 根本的な原因のまとめ

1. **Next.js 16の型チェックの厳格化**
   - 以前は警告だったものがエラーになった
   - `Request` → `NextRequest`の変更が必要

2. **不完全なリファクタリング**
   - モックデータからAPI連携への移行時に、一部の参照が残っていた
   - 型定義の更新がモックデータに反映されていなかった

3. **型の衝突**
   - 外部ライブラリ（`lucide-react`）のアイコン名と型名が衝突
   - 名前空間の管理が必要

4. **重複コード**
   - 後方互換性のための再エクスポートと古い実装が混在
   - 古いコードの削除が不十分

---

## 今後の対策

1. **型チェックの徹底**
   - ビルド前に`npm run build`で型エラーを確認
   - TypeScriptのstrictモードを有効化

2. **リファクタリング時の注意**
   - モックデータと型定義の整合性を保つ
   - 使用されていない参照を削除

3. **命名規則の統一**
   - アイコンは`Icon`サフィックスを付ける（例：`UserIcon`）
   - 型は明確な名前空間を使用

4. **コードの整理**
   - 非推奨コードは完全に削除するか、明確にマーク
   - 重複コードを避ける

---

## 修正日時

2025-01-23

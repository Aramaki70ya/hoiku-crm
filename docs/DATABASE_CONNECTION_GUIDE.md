# データベース接続ガイド

## 現在の実装状況

### デモモード（開発環境）

現在、`DEMO_MODE=true`が設定されている場合、すべてのデータ取得は`mock-data.ts`から行われます。

**実装方法**:
- `queries-client-with-fallback.ts`を使用
- デモモード時は自動的に`mock-data.ts`からデータを取得
- Supabase接続エラー時も自動的にフォールバック

### 本番環境（Supabase接続時）

`DEMO_MODE`が設定されていない、または`false`の場合、Supabaseからデータを取得します。

**必要な環境変数**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## データ取得の統一

### 推奨方法

すべての画面で`queries-client-with-fallback.ts`を使用してください：

```typescript
import {
  getCandidatesClient,
  getProjectsClient,
  getContractsClient,
  getUsersClient,
  getSourcesClient,
} from '@/lib/supabase/queries-client-with-fallback'
```

### メリット

1. **デモモード対応**: 自動的にモックデータを使用
2. **エラーハンドリング**: Supabase接続エラー時も自動フォールバック
3. **開発効率**: データベース接続なしで開発可能
4. **本番対応**: 環境変数を設定するだけで本番環境でも動作

## 移行手順

### 1. 既存の画面を移行

現在、直接`mock-data.ts`を使用している画面を移行：

**変更前**:
```typescript
import { mockCandidates, mockUsers } from '@/lib/mock-data'

const candidates = mockCandidates
const users = mockUsers
```

**変更後**:
```typescript
import { getCandidatesClient, getUsersClient } from '@/lib/supabase/queries-client-with-fallback'

const [candidates, setCandidates] = useState<Candidate[]>([])
const [users, setUsers] = useState<User[]>([])

useEffect(() => {
  async function fetchData() {
    const [candidatesData, usersData] = await Promise.all([
      getCandidatesClient(),
      getUsersClient(),
    ])
    setCandidates(candidatesData)
    setUsers(usersData)
  }
  fetchData()
}, [])
```

### 2. デモデータの確認

`mock-data.ts`に以下のデータが含まれていることを確認：
- `mockCandidates`: 求職者データ
- `mockUsers`: ユーザーデータ
- `mockProjects`: 案件データ
- `mockInterviews`: 面接データ
- `mockContracts`: 成約データ
- `mockSources`: 媒体データ

### 3. 本番環境への移行

1. Supabaseプロジェクトを作成
2. スキーマを適用（`supabase/schema.sql`）
3. 環境変数を設定
4. `DEMO_MODE`を削除または`false`に設定
5. データをインポート（CSVから）

## トラブルシューティング

### データが表示されない

1. **デモモードの確認**:
   ```bash
   # .env.localを確認
   cat .env.local | grep DEMO_MODE
   ```

2. **コンソールエラーの確認**:
   - ブラウザの開発者ツールでエラーを確認
   - Supabase接続エラーの場合は自動的にフォールバック

3. **モックデータの確認**:
   ```typescript
   // mock-data.tsにデータが存在するか確認
   console.log(mockCandidates.length)
   ```

### Supabase接続エラー

1. **環境変数の確認**:
   ```bash
   # .env.localに正しい値が設定されているか確認
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

2. **RLS（Row Level Security）の確認**:
   - SupabaseダッシュボードでRLSポリシーを確認
   - 認証済みユーザーがデータにアクセスできることを確認

3. **テーブルの存在確認**:
   - Supabaseダッシュボードでテーブルが作成されているか確認
   - スキーマが正しく適用されているか確認

## 次のステップ

1. ✅ タイムラインの編集ボタンを削除（完了）
2. ✅ フォールバック付きクエリの実装（完了）
3. ⏳ 各画面のデータ取得を統一
4. ⏳ デモデータの充実（期間フィルタリングテスト用）
5. ⏳ 本番環境への移行準備

---

**最終更新**: 2025-01-22

# 保育CRM システム実装ドキュメント

## 概要

本ドキュメントは、保育CRMシステムの実装内容を記載しています。

## システム構成

### 技術スタック

- **フロントエンド**: Next.js 14 (App Router)
- **UI**: React + Tailwind CSS + shadcn/ui
- **バックエンド**: Next.js API Routes
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth

### ディレクトリ構成

```
hoiku-crm/
├── src/
│   ├── app/                    # Next.js App Router ページ
│   │   ├── api/                # API Routes
│   │   │   ├── candidates/     # 求職者API
│   │   │   ├── contracts/      # 成約API
│   │   │   ├── interviews/     # 面接API
│   │   │   ├── projects/       # プロジェクトAPI
│   │   │   ├── sources/        # 媒体マスタAPI
│   │   │   ├── users/          # ユーザーAPI
│   │   │   └── auth/           # 認証API
│   │   ├── candidates/         # 求職者管理画面
│   │   ├── contracts/          # 成約管理画面
│   │   ├── interviews/         # 面接一覧画面
│   │   ├── members/            # メンバー画面
│   │   ├── admin/              # 管理画面
│   │   ├── dashboard-summary/  # 営業進捗サマリー
│   │   └── page.tsx            # ダッシュボード
│   ├── components/             # 共通コンポーネント
│   ├── hooks/                  # カスタムフック
│   ├── lib/                    # ユーティリティ・設定
│   │   ├── supabase/           # Supabase関連
│   │   └── mock-data.ts        # モックデータ（デモモード用）
│   └── types/                  # 型定義
│       └── database.ts         # データベース型
├── docs/                       # ドキュメント
└── public/                     # 静的ファイル
```

---

## API エンドポイント仕様

### 1. 求職者API (`/api/candidates`)

#### GET /api/candidates
求職者一覧を取得します。

**クエリパラメータ**:
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| search | string | 名前・ID・電話番号で検索 |
| status | string | ステータスでフィルタ |
| consultant_id | string | 担当者IDでフィルタ |
| limit | number | 取得件数（デフォルト: 50） |
| offset | number | オフセット（デフォルト: 0） |

**レスポンス**:
```json
{
  "data": [
    {
      "id": "C001",
      "name": "山田太郎",
      "phone": "090-1234-5678",
      "status": "contacting",
      "consultant": {
        "id": "u1",
        "name": "田中花子"
      },
      "source": {
        "id": "1",
        "name": "Indeed"
      }
    }
  ],
  "total": 100
}
```

#### POST /api/candidates
新規求職者を登録します。

**リクエストボディ**:
```json
{
  "name": "山田太郎",
  "phone": "090-1234-5678",
  "email": "yamada@example.com",
  "consultant_id": "u1",
  "source_id": "1"
}
```

#### PATCH /api/candidates/[id]
求職者情報を更新します。

**リクエストボディ**:
```json
{
  "status": "interviewing",
  "memo": "面接日程調整中"
}
```

#### DELETE /api/candidates/[id]
求職者を削除します。

---

### 2. 成約API (`/api/contracts`)

#### GET /api/contracts
成約一覧を取得します。

**クエリパラメータ**:
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| month | string | 年月（YYYY-MM形式） |
| consultant_id | string | 担当者IDでフィルタ |

**レスポンス**:
```json
{
  "data": [
    {
      "id": "ct001",
      "candidate_id": "C001",
      "accepted_date": "2025-10-15",
      "revenue_excluding_tax": 300000,
      "candidate": {
        "name": "山田太郎",
        "consultant_id": "u1",
        "source": {
          "name": "Indeed"
        }
      }
    }
  ],
  "total": 10
}
```

#### POST /api/contracts
新規成約を登録します（候補者のステータスも自動的に「成約」に更新）。

#### PATCH /api/contracts/[id]
成約情報を更新します（キャンセル処理含む）。

---

### 3. 面接API (`/api/interviews`)

#### GET /api/interviews
面接一覧を取得します。

**クエリパラメータ**:
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| month | string | 年月（YYYY-MM形式） |
| status | string | ステータス（scheduled/completed/cancelled） |
| consultant_id | string | 担当者IDでフィルタ |

#### POST /api/interviews
新規面接を登録します。

#### PATCH /api/interviews/[id]
面接情報を更新します（ステータス変更、フィードバック追加）。

---

### 4. プロジェクトAPI (`/api/projects`)

#### GET /api/projects
プロジェクト一覧を取得します。

**クエリパラメータ**:
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| candidate_id | string | 求職者IDでフィルタ |

#### POST /api/projects
新規プロジェクトを登録します。

#### PATCH /api/projects/[id]
プロジェクト情報を更新します（フェーズ変更、確度変更）。

---

### 5. 媒体マスタAPI (`/api/sources`)

#### GET /api/sources
媒体マスタ一覧を取得します。

#### POST /api/sources
新規媒体を登録します。

#### PATCH /api/sources/[id]
媒体情報を更新します。

#### DELETE /api/sources/[id]
媒体を削除します。

---

### 6. ユーザーAPI (`/api/users`)

#### GET /api/users
ユーザー一覧を取得します。

#### POST /api/users
新規ユーザーを登録します（Supabase Authにも登録）。

#### PATCH /api/users/[id]
ユーザー情報を更新します。

#### DELETE /api/users/[id]
ユーザーを削除します。

---

## カスタムフック

### useCandidates
求職者データの取得・更新を行うフック。

```typescript
const { candidates, isLoading, error, updateCandidate, refetch } = useCandidates({
  status: 'contacting',
  consultantId: 'u1',
  search: '山田',
})
```

### useContracts
成約データの取得・更新を行うフック。

```typescript
const { contracts, isLoading, updateContract, createContract } = useContracts({
  month: '2025-10',
  consultantId: 'u1',
})
```

### useInterviews
面接データの取得・更新を行うフック。

```typescript
const { interviews, isLoading, updateInterview } = useInterviews({
  month: '2025-10',
  status: 'scheduled',
})
```

### useUsers
ユーザーデータの取得を行うフック。

```typescript
const { users, consultants, isLoading } = useUsers()
```

### useSources
媒体マスタデータのCRUD操作を行うフック。

```typescript
const { sources, createSource, updateSource, deleteSource } = useSources()
```

---

## 画面機能一覧

### 1. ダッシュボード (`/`)
- 本日の営業KPI表示
- 月間目標進捗
- 担当者別パフォーマンス
- 今週の面接予定

### 2. 求職者管理 (`/candidates`)
- 求職者一覧表示
- ステータス・担当者によるフィルタリング
- インライン編集（ステータス、担当者、雇用形態）
- 優先度管理（タスクタブ）
- 求職者詳細ページへのリンク

### 3. 成約管理 (`/contracts`)
- 月別成約一覧
- 担当者フィルタ
- 成約情報の編集
- キャンセル処理・返金管理

### 4. 面接一覧 (`/interviews`)
- 月別面接一覧
- ステータス別タブ（予定/完了）
- 担当者の割り当て変更
- 面接ステータスの更新

### 5. メンバー画面 (`/members`)
- 担当者別の求職者管理
- ステータス・メモの編集
- プロジェクト確度の管理

### 6. 管理画面 (`/admin`)
- ダッシュボード設定
- ユーザー管理（追加・編集・削除・パスワードリセット）
- マスタデータ管理（媒体マスタ）
- システム設定

---

## デモモード

環境変数 `DEMO_MODE=true` を設定すると、Supabaseの代わりにモックデータを使用します。

```bash
# .env.local
DEMO_MODE=true
```

デモモードでは以下の動作になります：
- API Routeはモックデータを返却
- データの永続化は行われない（リロードでリセット）
- 認証チェックはスキップ

---

## デプロイ手順

### 1. 環境変数の設定

```bash
# 本番環境用
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# デモモード無効化
DEMO_MODE=false
```

### 2. データベースのセットアップ

Supabaseダッシュボードで以下のテーブルを作成：
- users（ユーザー）
- candidates（求職者）
- projects（プロジェクト）
- interviews（面接）
- contracts（成約）
- sources（媒体マスタ）

### 3. ビルド・デプロイ

```bash
npm run build
npm start
```

または、Vercelへのデプロイ：
```bash
vercel --prod
```

---

## セキュリティ

### 認証
- Supabase Authによるメール認証
- JWTトークンによるセッション管理
- 管理画面へのアクセス制限（AdminGuardコンポーネント）

### API認証
- 全APIエンドポイントでSupabase Authトークンを検証
- 未認証リクエストは401エラーを返却

### データアクセス
- Row Level Security (RLS) による行レベルのアクセス制御
- ユーザーロールに基づく権限管理

---

## 今後の拡張予定

1. **CSV インポート/エクスポート機能**
2. **メール通知機能**
3. **カレンダー連携（Google Calendar）**
4. **レポート・分析ダッシュボード**
5. **モバイル対応（PWA）**

---

## トラブルシューティング

### よくある問題

**Q: データが表示されない**
- Supabaseの接続設定を確認
- 環境変数が正しく設定されているか確認
- デモモードが意図せず有効になっていないか確認

**Q: 認証エラーが発生する**
- Supabase Authの設定を確認
- JWTトークンの有効期限を確認

**Q: API呼び出しでエラーが発生する**
- ブラウザのネットワークタブでレスポンスを確認
- サーバーログでエラー詳細を確認

---

## 更新履歴

| バージョン | 日付 | 内容 |
|-----------|------|------|
| 1.0.0 | 2025-01-23 | 初回リリース - 全画面の本番環境対応実装 |


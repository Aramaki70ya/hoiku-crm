# データフローと状態管理

> **重要**: このドキュメントはデータがどこから来て、どこに行くかを明確に記載しています。AIエージェントがデータを扱う際の判断基準として使用してください。

## データソース一覧

### 1. mock-data.ts (`src/lib/mock-data.ts`)

**目的**: プロトタイプ用のモックデータ。本番環境ではSupabaseに置き換わる。

**含まれるデータ**:
- `mockCandidates`: 求職者マスタ
- `mockProjects`: 案件（選考プロセス）
- `mockInterviews`: 面接ログ
- `mockUsers`: ユーザー（コンサルタント）
- `mockContracts`: 成約情報
- `mockMemos`: メモ
- `mockSources`: 媒体マスタ
- `mockMemberStats`: メンバー別統計情報
- `totalBudget`: 予算（定数）
- `kpiAssumptions`: KPI目標値（定数）
- `statusLabels`, `statusColors`: ステータスの表示名と色（定数）

**データの性質**:
- **読み取り専用**: プロトタイプでは変更しない
- **全画面で共有**: すべての画面で同じデータを参照
- **静的なデータ**: ページリロードまで変更されない

### 2. localStorage

**目的**: 画面間でデータを共有するための一時的なストレージ。

**使用箇所**:
- **タイムラインイベント**: `timelineEvents`キーに保存
  - 面接一覧ページでステータス・担当者を変更した時に作成
  - 求職者詳細ページで表示

**データの性質**:
- **読み書き可能**: 作成・更新・削除が可能
- **ブラウザに依存**: ブラウザを閉じても保持される
- **画面間で共有**: 複数の画面からアクセス可能

### 3. useState（画面内の状態管理）

**目的**: 画面内でのみ有効な状態を管理。

**使用例**:
- フィルター状態（`statusFilter`, `consultantFilter`など）
- 検索クエリ（`searchQuery`）
- 編集状態（`editingContractId`, `editData`など）
- 変更されたデータ（`candidateStatuses`, `interviewStatuses`など）

**データの性質**:
- **画面内でのみ有効**: ページを離れると失われる
- **即座に反映**: 変更すると即座にUIに反映される
- **プロトタイプでは保存されない**: データソース（mock-data.ts）には反映されない

### 4. useMemo（計算結果のキャッシュ）

**目的**: 計算コストの高い処理の結果をキャッシュし、パフォーマンスを最適化。

**使用例**:
- フィルタリング結果（`filteredCandidates`, `filteredInterviews`など）
- 集計結果（`totalSales`, `priorityCounts`など）
- データの拡張（`enrichedInterviews`, `memberData`など）

**データの性質**:
- **計算結果**: 依存する値が変わらない限り、再計算されない
- **読み取り専用**: 直接変更しない
- **パフォーマンス最適化**: 不要な再計算を防ぐ

### 5. API Route Handlers（サーバー側API）

**目的**: 認証情報の取得とユーザー管理をサーバー側で提供する。

**使用箇所**:
- `GET /api/auth/me`: セッション検証とユーザー情報の取得
- `GET /api/users`: ユーザー一覧（管理者のみ）
- `POST /api/users`: ユーザー追加（管理者のみ）

**データの性質**:
- **認証必須**: セッションがない場合は401/403
- **権限制御**: `users.role`で管理者判定

## 各画面でのデータの扱い方

### ダッシュボード (`/`)

**データの取得**:
- `mockMemberStats` → 売上、ヨミを集計
- `mockCandidates` → ステータス別集計、転換率計算、登録者数サマリー
- `mockSources` → 流入経路マスタ（登録者数サマリーで使用）
- `totalBudget`, `kpiAssumptions` → 目標値

**データの更新**:
- なし（読み取り専用）

**状態管理**:
- `periodType`: 期間タイプ（`current_month`, `previous_month`, `custom`）
- `customStartDate`, `customEndDate`: カスタム期間の開始日・終了日

### 今日のタスク (`/tasks`)

**データの取得**:
- `mockCandidates` → アクティブなステータスの求職者のみ抽出
- `getApproachPriority`関数 → 優先度を自動判定

**データの更新**:
- `priorities` state: 優先度の変更（画面内でのみ有効）

**状態管理**:
- `priorityFilter`: 優先度フィルター
- `consultantFilter`: 担当者フィルター
- `priorities`: 変更された優先度

### 求職者管理 (`/candidates`)

**データの取得**:
- `mockCandidates` → すべての求職者
- `mockUsers` → 担当者情報
- `mockContracts` → 成約情報（ステータス変更時の自動作成用）

**データの更新**:
- `candidateStatuses` state: ステータスの変更
- `candidateConsultants` state: 担当者の変更
- `contracts` state: 成約情報の作成（`closed_won`になった時）

**状態管理**:
- `searchQuery`: 検索クエリ
- `statusFilter`: ステータスフィルター
- `consultantFilter`: 担当者フィルター
- `activeTab`: タブ（全体/アクティブ）
- `candidateStatuses`: 変更されたステータス
- `candidateConsultants`: 変更された担当者
- `contracts`: 成約情報（新規作成されたもの）

### 求職者詳細 (`/candidates/[id]`)

**データの取得**:
- `mockCandidates` → 該当IDの求職者
- `mockProjects` → 該当求職者の案件
- `mockInterviews` → 該当案件の面接
- `mockContracts` → 該当求職者の成約情報
- `mockMemos` → 該当求職者のメモ
- `localStorage` → タイムラインイベント

**データの更新**:
- `contractForm` state: 成約情報の編集（ダイアログ内）
- `memoContent` state: メモの編集（ダイアログ内）

**状態管理**:
- `candidateStatus`: 求職者のステータス（編集用）
- `contractForm`: 成約情報の編集フォーム
- `isContractEditDialogOpen`: 成約情報編集ダイアログの開閉
- `isEditDialogOpen`: 編集ダイアログの開閉
- `editType`: 編集タイプ（`timeline`, `project`, `memo`）
- `memoContent`: メモの内容
- `timelineEvents`: タイムラインイベント（localStorageから取得）
- `isTaskCompleted`: タスクの完了状態

### 成約管理 (`/contracts`)

**データの取得**:
- `mockContracts` → すべての成約情報
- `contractConsultants` → 成約者の担当者マッピング
- `mockUsers` → 担当者情報

**データの更新**:
- `contracts` state: 成約情報の編集

**状態管理**:
- `selectedMonth`: 選択された月（`YYYY-MM`形式）
- `selectedConsultant`: 選択された担当者
- `contracts`: 成約情報（編集可能）
- `editingContractId`: 編集中の成約ID
- `editData`: 編集データ

### メンバー (`/members`)

**データの取得**:
- `mockUsers` → すべてのユーザー
- `mockMemberStats` → メンバー別統計情報
- `mockCandidates` → 担当求職者
- `mockProjects` → 担当求職者の案件

**データの更新**:
- なし（読み取り専用、ただしステータス変更は可能）

**状態管理**:
- `selectedMember`: 選択されたメンバーID
- `isMemberCardVisible`: メンバーカードの表示/非表示

### 面接一覧 (`/interviews`)

**データの取得**:
- `mockInterviews` → すべての面接
- `mockProjects` → 案件情報
- `mockCandidates` → 求職者情報
- `mockUsers` → 担当者情報

**データの更新**:
- `interviewStatuses` state: 面接ステータスの変更
- `interviewConsultants` state: 面接担当者の変更
- `candidateConsultants` state: 求職者担当者の変更（連動）
- `timelineEvents` state + `localStorage`: タイムラインイベントの作成

**状態管理**:
- `statusFilter`: ステータスフィルター
- `consultantFilter`: 担当者フィルター
- `interviewStatuses`: 変更された面接ステータス
- `interviewConsultants`: 変更された面接担当者
- `candidateConsultants`: 変更された求職者担当者（面接担当者変更時に連動）
- `timelineEvents`: タイムラインイベント（localStorageにも保存）

## データ更新の流れ

### プロトタイプ（現状）

```
ユーザー操作
  ↓
useStateで状態更新
  ↓
UIに即座に反映
  ↓
データソース（mock-data.ts）には反映されない
```

### 本番環境（将来）

```
ユーザー操作
  ↓
useStateで状態更新
  ↓
Supabaseに保存（API呼び出し）
  ↓
UIに反映（リアルタイム更新）
```

## タイムラインイベントの仕組み

### 作成タイミング

1. **面接一覧ページ**:
   - 面接ステータスを変更した時
   - 面接担当者を変更した時

### 保存先

- **面接一覧ページ**: `timelineEvents` state + `localStorage`（`timelineEvents`キー）
- **求職者詳細ページ**: `localStorage`から読み込み

### データ構造

```typescript
{
  id: string                    // 一意のID（`tl-${Date.now()}-${interview.id}`形式）
  candidate_id: string          // 求職者ID
  event_type: string            // イベントタイプ（`consultant_change`, `interview_status_change`など）
  title: string                 // イベントタイトル（`担当者変更`, `面接ステータス変更`など）
  description: string           // イベント説明（変更内容）
  created_at: string            // 作成日時（ISO形式）
}
```

### 表示タイミング

- **求職者詳細ページのタイムラインタブ**: 該当求職者のイベントのみ表示
- **メモと統合**: タイムラインイベントとメモを時系列で統合表示

## 状態管理の方針

### useStateの使い分け

1. **フィルター・検索**: 画面内でのみ有効な状態
2. **編集状態**: 編集中のデータを一時的に保持
3. **変更されたデータ**: データソースには反映しないが、画面内では変更を反映

### useMemoの使い分け

1. **フィルタリング結果**: 依存する値が変わった時のみ再計算
2. **集計結果**: 計算コストの高い処理の結果をキャッシュ
3. **データの拡張**: 複数のデータソースを結合した結果をキャッシュ

### localStorageの使い分け

1. **タイムラインイベント**: 画面間で共有する必要があるデータ
2. **一時的なデータ**: ページリロード後も保持したいが、データベースに保存する必要がないデータ

## データの整合性を保つためのルール

### 1. 関連データの連動更新

**例**: 面接一覧で担当者を変更した場合
- `interviewConsultants` stateを更新
- `candidateConsultants` stateも更新（関連する求職者の担当者も変更）
- タイムラインイベントを作成

### 2. 自動処理の実行

**例**: 求職者のステータスが`closed_won`になった場合
- 自動的に`contracts`にレコードを作成
- 既存のレコードがある場合は作成しない

### 3. データソースの優先順位

1. **変更されたデータ**（`candidateStatuses`, `interviewStatuses`など）: 最優先
2. **元のデータ**（`mock-data.ts`）: 変更されていない場合のフォールバック

## AIエージェント向けの判断基準

### データを取得する時

1. **基本データ**: 常に`mock-data.ts`から取得
2. **タイムラインイベント**: `localStorage`から取得
3. **計算結果**: `useMemo`で計算（依存する値が変わった時のみ再計算）

### データを更新する時

1. **プロトタイプ**: `useState`で管理（データソースには反映しない）
2. **本番環境（将来）**: Supabaseに保存
3. **タイムラインイベント**: `localStorage`に保存

### 状態管理を追加する時

1. **画面内でのみ有効**: `useState`を使用
2. **計算結果**: `useMemo`を使用
3. **画面間で共有**: `localStorage`を使用（タイムラインイベントなど）

### データの整合性を保つ時

1. **関連データの連動**: 変更時に関連するデータも更新
2. **自動処理の実行**: ビジネスルールに基づいて自動処理を実行
3. **データソースの優先順位**: 変更されたデータを最優先

## 関連ドキュメント

- [システム目的と設計思想](./SYSTEM_PURPOSE.md) - システムの基本方針
- [画面仕様とビジネスロジック](./SCREEN_LOGIC.md) - 各画面の詳細仕様
- [ビジネスルール集](./BUSINESS_RULES.md) - システムの動作ルール

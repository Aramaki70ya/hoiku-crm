# Hoiku CRM データ定義書

## 概要

本ドキュメントは、Hoiku CRMシステムが動作するために必要なデータベーステーブルとカラムの定義を記載します。
各テーブルのカラム名、データ型、制約、説明を明記しています。

## テーブル一覧

1. [users（ユーザー/コンサルタント）](#1-usersユーザーコンサルタント)
2. [sources（媒体マスタ）](#2-sources媒体マスタ)
3. [candidates（求職者マスタ）](#3-candidates求職者マスタ)
4. [projects（案件）](#4-projects案件)
5. [interviews（面接・面談ログ）](#5-interviews面接面談ログ)
6. [contracts（成約）](#6-contracts成約)
7. [memos（メモ）](#7-memosメモ)

---

## 1. users（ユーザー/コンサルタント）

コンサルタントの基本情報とロール管理を行うテーブル。

| カラム名 | データ型 | 制約 | NULL許可 | デフォルト値 | 説明 |
|---------|---------|------|---------|------------|------|
| id | UUID | PRIMARY KEY | NOT NULL | uuid_generate_v4() | ユーザーID（主キー） |
| email | TEXT | UNIQUE | NOT NULL | - | メールアドレス（Supabase Authと連携） |
| name | TEXT | - | NOT NULL | - | コンサルタント名（表示名） |
| role | TEXT | CHECK (role IN ('admin', 'user')) | NOT NULL | 'user' | ロール（admin: 管理者, user: 一般ユーザー） |
| created_at | TIMESTAMPTZ | - | NOT NULL | NOW() | 作成日時 |

### インデックス
- なし（UUID主キーのため不要）

### 外部キー制約
- なし

### 備考
- Supabase Authのユーザー情報と連携する想定
- 認証はSupabase Authで行い、このテーブルは追加情報を保持

---

## 2. sources（媒体マスタ）

求職者の登録経路（媒体）を管理するマスタテーブル。

| カラム名 | データ型 | 制約 | NULL許可 | デフォルト値 | 説明 |
|---------|---------|------|---------|------------|------|
| id | UUID | PRIMARY KEY | NOT NULL | uuid_generate_v4() | 媒体ID（主キー） |
| name | TEXT | UNIQUE | NOT NULL | - | 媒体名（例: LINE, バイトル, 求人版） |
| category | TEXT | - | NULL | - | カテゴリ（例: SNS, 求人サイト, 自社メディア） |

### インデックス
- なし（UUID主キーのため不要）

### 外部キー制約
- なし

### 初期データ
以下の媒体が初期データとして投入されます：
- LINE (SNS)
- バイトル (求人サイト)
- 求人版 (自社メディア)
- スタンバイ（求人版）(求人サイト)
- グーグル（求人版）(検索)
- ジョブカン（SGL）(求人サイト)
- ジョブカン（女性）(求人サイト)
- Q-mate（indeed）(求人サイト)
- Q-mate（求人ボックス）(求人サイト)
- 求人ボックス（求人版）(求人サイト)
- 求人ボックス（サポーター）(求人サイト)
- NAVIS (求人サイト)
- アイデム (求人サイト)
- お祝い勤 (求人サイト)
- ほいくis (求人サイト)
- エントリーポケット (求人サイト)
- 個人掘起こし (自社)
- 受電 (自社)
- LP (自社)
- SMS (自社)
- その他 (その他)

---

## 3. candidates（求職者マスタ）

求職者の基本情報、ステータス、担当者情報を管理するテーブル。

| カラム名 | データ型 | 制約 | NULL許可 | デフォルト値 | 説明 |
|---------|---------|------|---------|------------|------|
| id | TEXT | PRIMARY KEY | NOT NULL | - | 求職者ID（20206138形式、既存ルール踏襲） |
| name | TEXT | - | NOT NULL | - | 氏名 |
| kana | TEXT | - | NULL | - | フリガナ |
| phone | TEXT | - | NULL | - | 電話番号 |
| email | TEXT | - | NULL | - | メールアドレス |
| birth_date | DATE | - | NULL | - | 生年月日 |
| age | INTEGER | - | NULL | - | 年齢 |
| prefecture | TEXT | - | NULL | - | 都道府県 |
| address | TEXT | - | NULL | - | 市区町村以降の住所 |
| qualification | TEXT | - | NULL | - | 保有資格（カンマ区切り、例: 保育士, 幼稚園教諭） |
| desired_employment_type | TEXT | - | NULL | - | 希望雇用形態（例: 正社員, パート） |
| desired_job_type | TEXT | - | NULL | - | 希望職種（例: 保育士, 栄養士） |
| status | TEXT | CHECK (status IN ('new', 'contacting', 'first_contact_done', 'proposing', 'interviewing', 'offer', 'closed_won', 'closed_lost', 'pending', 'on_hold')) | NOT NULL | 'new' | ステータス（新規, 連絡中, 初回済み, 提案中, 面接中, 内定, 成約, NG, 追客中, 意向回収） |
| source_id | UUID | REFERENCES sources(id) | NULL | - | 登録媒体ID（外部キー） |
| registered_at | DATE | - | NULL | - | 登録日 |
| consultant_id | UUID | REFERENCES users(id) | NULL | - | 担当者ID（外部キー） |
| approach_priority | TEXT | CHECK (approach_priority IN ('S', 'A', 'B', 'C')) | NULL | - | アプローチ優先度（タスク画面用: S=最優先, A=高, B=中, C=低） |
| rank | TEXT | CHECK (rank IN ('S', 'A', 'B', 'C')) | NULL | - | ランク（求職者管理画面用: S=最優先, A=高, B=中, C=低） |
| memo | TEXT | - | NULL | - | 基本備考 |
| created_at | TIMESTAMPTZ | - | NOT NULL | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | - | NOT NULL | NOW() | 更新日時（自動更新トリガーあり） |

### インデックス
- `idx_candidates_status` ON `status` - ステータス別検索用
- `idx_candidates_consultant` ON `consultant_id` - 担当者別検索用
- `idx_candidates_registered` ON `registered_at` - 登録日別検索用

### 外部キー制約
- `source_id` → `sources(id)`
- `consultant_id` → `users(id)`

### トリガー
- `update_candidates_updated_at`: UPDATE時に`updated_at`を自動更新

### ステータス値の説明
- `new`: 新規
- `contacting`: 連絡中
- `first_contact_done`: 初回済み
- `proposing`: 提案中
- `interviewing`: 面接中
- `offer`: 内定
- `closed_won`: 成約
- `closed_lost`: NG
- `pending`: 追客中
- `on_hold`: 意向回収

---

## 4. projects（案件）

求職者と園を紐づけた案件情報、選考プロセスのフェーズ、ヨミ金額を管理するテーブル。

| カラム名 | データ型 | 制約 | NULL許可 | デフォルト値 | 説明 |
|---------|---------|------|---------|------------|------|
| id | UUID | PRIMARY KEY | NOT NULL | uuid_generate_v4() | 案件ID（主キー） |
| candidate_id | TEXT | REFERENCES candidates(id) ON DELETE CASCADE | NOT NULL | - | 求職者ID（外部キー） |
| client_name | TEXT | - | NOT NULL | - | 園名/法人名 |
| phase | TEXT | CHECK (phase IN ('proposed', 'document_screening', 'interview_scheduled', 'interviewing', 'offer', 'accepted', 'rejected', 'withdrawn')) | NOT NULL | 'proposed' | フェーズ（提案済, 書類選考中, 面接予定, 面接中, 内定, 入社確定, 不採用, 辞退） |
| expected_amount | INTEGER | - | NULL | - | ヨミ金額（円） |
| probability | TEXT | CHECK (probability IN ('A', 'B', 'C')) | NULL | - | 確度（A=高, B=中, C=低） |
| expected_entry_date | DATE | - | NULL | - | 入職予定時期 |
| note | TEXT | - | NULL | - | 進捗メモ |
| created_at | TIMESTAMPTZ | - | NOT NULL | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | - | NOT NULL | NOW() | 更新日時（自動更新トリガーあり） |

### インデックス
- `idx_projects_candidate` ON `candidate_id` - 求職者別検索用
- `idx_projects_phase` ON `phase` - フェーズ別検索用

### 外部キー制約
- `candidate_id` → `candidates(id)` ON DELETE CASCADE

### トリガー
- `update_projects_updated_at`: UPDATE時に`updated_at`を自動更新

### フェーズ値の説明
- `proposed`: 提案済
- `document_screening`: 書類選考中
- `interview_scheduled`: 面接予定
- `interviewing`: 面接中
- `offer`: 内定
- `accepted`: 入社確定
- `rejected`: 不採用
- `withdrawn`: 辞退

---

## 5. interviews（面接・面談ログ）

面接・面談の記録（日程、場所、結果）を管理するテーブル。

| カラム名 | データ型 | 制約 | NULL許可 | デフォルト値 | 説明 |
|---------|---------|------|---------|------------|------|
| id | UUID | PRIMARY KEY | NOT NULL | uuid_generate_v4() | 面接ID（主キー） |
| project_id | UUID | REFERENCES projects(id) ON DELETE CASCADE | NOT NULL | - | 案件ID（外部キー） |
| type | TEXT | CHECK (type IN ('first_meeting', 'interview', 'tour', 'second_interview', 'final_interview')) | NOT NULL | - | 種別（初回面談, 面接, 見学, 二次面接, 最終面接） |
| start_at | TIMESTAMPTZ | - | NOT NULL | - | 開始日時 |
| end_at | TIMESTAMPTZ | - | NULL | - | 終了日時 |
| location | TEXT | - | NULL | - | 場所/URL |
| status | TEXT | CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduling')) | NOT NULL | 'scheduled' | 状態（予定, 完了, キャンセル, リスケ中） |
| feedback | TEXT | - | NULL | - | 結果・所感 |
| created_at | TIMESTAMPTZ | - | NOT NULL | NOW() | 作成日時 |

### インデックス
- `idx_interviews_project` ON `project_id` - 案件別検索用
- `idx_interviews_start` ON `start_at` - 日時別検索用

### 外部キー制約
- `project_id` → `projects(id)` ON DELETE CASCADE

### 種別値の説明
- `first_meeting`: 初回面談
- `interview`: 面接
- `tour`: 見学
- `second_interview`: 二次面接
- `final_interview`: 最終面接

### ステータス値の説明
- `scheduled`: 予定
- `completed`: 完了
- `cancelled`: キャンセル
- `rescheduling`: リスケ中

---

## 6. contracts（成約）

成約情報、売上、入金日、入職先を管理するテーブル。

| カラム名 | データ型 | 制約 | NULL許可 | デフォルト値 | 説明 |
|---------|---------|------|---------|------------|------|
| id | UUID | PRIMARY KEY | NOT NULL | uuid_generate_v4() | 成約ID（主キー） |
| candidate_id | TEXT | REFERENCES candidates(id) ON DELETE CASCADE | NOT NULL | - | 求職者ID（外部キー） |
| accepted_date | DATE | - | NOT NULL | - | 承諾日 |
| employment_restriction_until | DATE | - | NULL | - | 転職勧奨禁止期間 |
| employment_type | TEXT | - | NULL | - | 雇用形態（正社員、パート等） |
| job_type | TEXT | - | NULL | - | 職種（保育士、栄養士等） |
| revenue_excluding_tax | INTEGER | - | NOT NULL | - | 売上（税抜、円） |
| revenue_including_tax | INTEGER | - | NOT NULL | - | 売上（税込、円） |
| payment_date | DATE | - | NULL | - | 入金日 |
| invoice_sent_date | DATE | - | NULL | - | 請求書発送日 |
| calculation_basis | TEXT | - | NULL | - | 算出根拠（例: 3,438,000円×20%） |
| document_url | TEXT | - | NULL | - | 格納先URL |
| placement_company | TEXT | - | NULL | - | 入職先（園名/法人名）※後方互換性のため残す |
| placement_company_name | TEXT | - | NULL | - | 入職先（法人名） |
| placement_facility_name | TEXT | - | NULL | - | 入職先（園名） |
| note | TEXT | - | NULL | - | 備考 |
| is_cancelled | BOOLEAN | - | NULL | - | キャンセル済みかどうか |
| refund_required | BOOLEAN | - | NULL | - | 返金あり/なし |
| refund_date | DATE | - | NULL | - | 返金日（返金ありの場合のみ） |
| refund_amount | INTEGER | - | NULL | - | 返金額（返金ありの場合のみ、円） |
| cancellation_reason | TEXT | - | NULL | - | キャンセル理由（備考） |
| created_at | TIMESTAMPTZ | - | NOT NULL | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | - | NOT NULL | NOW() | 更新日時（自動更新トリガーあり） |

### インデックス
- `idx_contracts_candidate` ON `candidate_id` - 求職者別検索用
- `idx_contracts_accepted_date` ON `accepted_date` - 承諾日別検索用
- `idx_contracts_payment_date` ON `payment_date` - 入金日別検索用

### 外部キー制約
- `candidate_id` → `candidates(id)` ON DELETE CASCADE

### トリガー
- `update_contracts_updated_at`: UPDATE時に`updated_at`を自動更新

### 備考
- `placement_company`は後方互換性のため残していますが、将来的には`placement_company_name`と`placement_facility_name`に移行予定
- 入社キャンセル対応のため、`is_cancelled`、`refund_required`、`refund_date`、`refund_amount`、`cancellation_reason`を追加

---

## 7. memos（メモ）

求職者へのメモを管理するテーブル。

| カラム名 | データ型 | 制約 | NULL許可 | デフォルト値 | 説明 |
|---------|---------|------|---------|------------|------|
| id | UUID | PRIMARY KEY | NOT NULL | uuid_generate_v4() | メモID（主キー） |
| candidate_id | TEXT | REFERENCES candidates(id) ON DELETE CASCADE | NOT NULL | - | 求職者ID（外部キー） |
| content | TEXT | - | NOT NULL | - | メモ内容 |
| created_by | UUID | REFERENCES users(id) | NULL | - | 作成者ID（外部キー） |
| created_at | TIMESTAMPTZ | - | NOT NULL | NOW() | 作成日時 |

### インデックス
- なし（必要に応じて`candidate_id`にインデックスを追加可能）

### 外部キー制約
- `candidate_id` → `candidates(id)` ON DELETE CASCADE
- `created_by` → `users(id)`

### 備考
- スキーマファイルには定義されていませんが、型定義に存在するため、将来的に実装予定のテーブルです

---

## データ型の説明

### UUID
- PostgreSQLのUUID型
- 主キーとして使用
- `uuid_generate_v4()`で自動生成

### TEXT
- 可変長文字列
- 日本語対応

### DATE
- 日付型（時刻なし）
- 形式: YYYY-MM-DD

### TIMESTAMPTZ
- タイムゾーン付きタイムスタンプ
- 形式: YYYY-MM-DD HH:MM:SS+TZ

### INTEGER
- 整数型
- 金額などに使用

### BOOLEAN
- 真偽値型
- true/false

---

## 制約の説明

### PRIMARY KEY
- 主キー制約
- 一意性とNOT NULLを保証

### FOREIGN KEY（外部キー）
- 参照整合性を保証
- `ON DELETE CASCADE`: 親レコード削除時に子レコードも自動削除

### UNIQUE
- 一意性制約
- 重複を禁止

### CHECK
- 値の範囲を制限
- 例: `CHECK (status IN ('new', 'contacting', ...))`

### NOT NULL
- NULL値を禁止

---

## インデックス戦略

### 検索・フィルタリング用
- `candidates.status` - ステータス別集計
- `candidates.consultant_id` - 担当者別集計
- `candidates.registered_at` - 登録日別集計
- `contracts.accepted_date` - 承諾日別集計
- `contracts.payment_date` - 入金日別集計

### リレーション用
- `projects.candidate_id` - 求職者別案件検索
- `interviews.project_id` - 案件別面接検索

### 時系列ソート用
- `interviews.start_at` - 面接日時順ソート

---

## Row Level Security (RLS)

すべてのテーブルでRLSが有効化されています。

### 基本方針
- 認証済みユーザー（`authenticated`）は全データを閲覧可能
- 認証済みユーザーは全データを挿入・更新可能
- 将来的に担当者制限を追加予定

### ポリシー
各テーブルに以下のポリシーが設定されています：
- `SELECT`: 認証済みユーザーは全データを閲覧可能
- `INSERT`: 認証済みユーザーは全データを挿入可能
- `UPDATE`: 認証済みユーザーは全データを更新可能

---

## 自動更新トリガー

以下のテーブルで`updated_at`が自動更新されます：
- `candidates`
- `projects`
- `contracts`

トリガー関数: `update_updated_at_column()`

---

## データ移行時の注意事項

### 必須カラム
- `candidates.id`: 既存の形式（20206138等）を維持
- `candidates.name`: 必須
- `candidates.status`: デフォルト値'new'が設定される

### 外部キー解決
- `candidates.source_id`: 媒体名から`sources.id`へのマッピングが必要
- `candidates.consultant_id`: 担当者名から`users.id`へのマッピングが必要
- `projects.candidate_id`: 求職者IDとの紐づけが必要
- `interviews.project_id`: 案件IDとの紐づけが必要
- `contracts.candidate_id`: 求職者IDとの紐づけが必要

### データ型変換
- 日付: `2025/10/10` → `2025-10-10` (DATE型)
- 数値: `"687,600"` → `687600` (INTEGER型)
- 電話番号: ハイフン除去等の正規化

---

## 改訂履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-01-XX | 1.0 | 初版作成 |

---

## 関連ドキュメント

- [データベース設計書](./DATABASE_DESIGN.md)
- [スプレッドシート移行ガイド](./SPREADSHEET_MIGRATION.md)
- [スキーマ定義](./supabase/schema.sql)

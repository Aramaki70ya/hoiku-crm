# Hoiku CRM データベース設計書

## 概要

Hoiku CRMのデータベース構成とテーブル設計について説明します。

## テーブル一覧

### 1. 基本テーブル

#### users（ユーザー/コンサルタント）
- コンサルタントの基本情報
- ロール管理（admin/user）

#### sources（媒体マスタ）
- 流入経路のマスタデータ
- カテゴリ分類

#### candidates（求職者）
- 求職者の基本情報
- ステータス管理
- 担当者、優先度、ランク

### 2. 選考管理テーブル

#### projects（案件）
- 求職者と園を紐づけた案件
- 選考フェーズ管理
- ヨミ金額

#### interviews（面接・面談ログ）
- 面接・面談の記録
- 日程、場所、結果

### 3. 成約管理テーブル

#### contracts（成約）
- 成約情報
- 売上、入金日、入職先

### 4. 補助テーブル

#### memos（メモ）
- 求職者へのメモ
- 作成者、作成日時

#### approach_priorities（アプローチ優先度）
- タスク画面用の優先度
- タスクコメント

#### candidate_ranks（求職者ランク）
- 求職者管理画面用のランク

#### settings（システム設定）
- ダッシュボードの予算、KPI目標値
- システム設定

#### notifications（通知）
- ユーザーへの通知
- 未読/既読管理

#### timeline_events（タイムラインイベント）
- 求職者の活動履歴
- ステータス変更、メモ追加など

#### status_history（ステータス変更履歴）
- ステータス変更の履歴
- 変更者、変更日時

## リレーション図

```
users
  ├── candidates (consultant_id)
  ├── memos (created_by)
  ├── notifications (user_id)
  └── settings (updated_by)

sources
  └── candidates (source_id)

candidates
  ├── projects (candidate_id)
  ├── contracts (candidate_id)
  ├── memos (candidate_id)
  ├── approach_priorities (candidate_id)
  ├── candidate_ranks (candidate_id)
  ├── timeline_events (candidate_id)
  └── status_history (candidate_id)

projects
  └── interviews (project_id)

contracts
  ├── notifications (related_contract_id)
  └── timeline_events (metadata)
```

## 主要な機能とテーブルの対応

### ダッシュボード
- `settings` - 予算、KPI目標値
- `candidates` - ステータス別集計
- `contracts` - 成約数、売上

### 求職者管理
- `candidates` - 基本情報
- `candidate_ranks` - ランク管理
- `memos` - メモ機能

### タスク管理
- `approach_priorities` - 優先度とタスクコメント
- `candidates` - ステータスでフィルタ

### 成約管理
- `contracts` - 成約情報
- `candidates` - 成約者の基本情報

### タイムライン
- `timeline_events` - 活動履歴
- `status_history` - ステータス変更履歴

### 通知機能
- `notifications` - 通知データ
- トリガーで自動生成（面接予定、成約確定など）

## 自動化機能

### 1. ステータス変更時の自動処理
- `log_status_change()` トリガー
- ステータス変更時に履歴を記録
- タイムラインイベントを自動作成

### 2. 成約時の自動処理
- `create_contract_on_closed_won()` トリガー
- ステータスが「closed_won」になったら自動でcontractsテーブルに追加

### 3. updated_atの自動更新
- `update_updated_at_column()` 関数
- 各テーブルの更新時に自動でupdated_atを更新

## インデックス戦略

### 検索・フィルタリング用
- `candidates.status`
- `candidates.consultant_id`
- `candidates.registered_at`
- `contracts.accepted_date`
- `contracts.payment_date`

### リレーション用
- `projects.candidate_id`
- `interviews.project_id`
- `memos.candidate_id`

### 時系列ソート用
- `timeline_events.created_at DESC`
- `notifications.created_at DESC`

## セキュリティ（RLS）

### 基本方針
- 認証済みユーザーは全データを閲覧可能
- 管理者のみ設定を変更可能
- 通知は自分のみ閲覧可能

### 今後の拡張
- 担当者制限（自分の担当求職者のみ閲覧）
- 部署・チーム単位のアクセス制御

## データ移行

### モックデータからの移行
1. `mockCandidates` → `candidates`
2. `mockContracts` → `contracts`
3. `mockApproachPriorities` → `approach_priorities`
4. `mockMemos` → `memos`
5. `mockUsers` → `users`（Supabase Authと連携）

### 注意事項
- candidate_idは既存の形式（20206138）を維持
- UUIDとTEXTの混在に注意
- 外部キー制約の確認



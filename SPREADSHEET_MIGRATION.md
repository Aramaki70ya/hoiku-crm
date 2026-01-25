# スプレッドシートからデータベースへの移行ガイド

## 概要

現在使用しているスプレッドシートの構造を分析し、データベース設計に反映しました。

## スプレッドシートとデータベーステーブルの対応

### 1. 成約データ（元データ/成約YYYY_MM.csv）
**対応テーブル**: `contracts（成約）`  
**目的**: 成約金額、承諾日、入金日などの確定情報を登録する。

| CSVカラム | データベースカラム | 備考 |
|---------|-----------------|------|
| ID | candidate_id（求職者ID） | 外部キー |
| 承諾日 | accepted_date（承諾日） | |
| 転職勧奨禁止期間 | employment_restriction_until（禁止期間） | |
| 雇用 | employment_type（雇用形態） | |
| 職種 | job_type（職種） | |
| 入金 | payment_date（入金日） | |
| 売上(税抜) | revenue_excluding_tax（税抜売上） | |
| 売上(税込) | revenue_including_tax（税込売上） | |
| 請求書発送 | invoice_sent_date（請求書発送日） | |
| 算出根拠 | calculation_basis（算出根拠） | |
| 格納先URL | document_url（格納先URL） | |
| 入職先 | placement_company（入職先） | |

### 2. 求職者管理 - 連絡先一覧（元データ/求職者管理 - 連絡先一覧.csv）
**対応テーブル**: `candidates（求職者マスタ）`  
**目的**: 求職者の基本情報の基準データとして使用する。

| CSVカラム | データベースカラム | 備考 |
|---------|-----------------|------|
| 担当者 | consultant_id（担当者ID） | users.name で紐づけ |
| 媒体 | source_id（媒体ID） | sources.name で紐づけ |
| 日付 | registered_at（登録日） | |
| ステータス | status（ステータス） | 変換が必要 |
| ID | id（求職者ID） | |
| 氏名 | name（氏名） | |
| 電話番号 | phone（電話番号） | |
| メールアドレス | email（メール） | |
| 生年月日 | birth_date（生年月日） | |
| 年齢 | age（年齢） | |
| 都道府県 | prefecture（都道府県） | |
| 市区町村 | address（住所） | |
| 正・パ | desired_employment_type（希望雇用形態） | |
| 保有資格 | qualification（保有資格） | |
| 応募職種 | desired_job_type（希望職種） | |

### 3. メンバーシート（元データ/メンバーシート/*.csv）
**対応テーブル**: `projects（案件）` / `interviews（面接ログ）`  
**目的**: 面接フラグ日・面接日など「日付の正」はこのシートで扱う。

| CSVカラム | データベースカラム | 備考 |
|---------|-----------------|------|
| 面接フラグ | interviews.type（面接種別） | TRUE の場合のみ作成 |
| 面接フラグ日 | interviews.created_at（面接設定日） | |
| 面接日 | interviews.start_at（面接日） | |
| 園名 | projects.client_name（園名） | 可能なら法人名と結合 |
| 法人名 | projects.client_name（法人名） | |

### 4. 月次マージシート（【保育】数値管理シート_最新版 - 全メンバーマージシート.csv）
**対応テーブル**: `projects（案件）` / `candidates（求職者マスタ）`  
**目的**: 月次スナップショットとして最新のステータス・ヨミ金額を反映。

| CSVカラム | データベースカラム | 備考 |
|---------|-----------------|------|
| 年月 | month_text（年月文字列） | |
| メンバー名 | consultant_id（担当者ID） | users.name で紐づけ |
| ID | candidate_id（求職者ID） | |
| ステータス | projects.phase / candidates.status | 変換が必要 |
| ヨミ金額 | projects.expected_amount（ヨミ金額） | |
| ヨミ確度(当月) | projects.probability（確度） | |

## データ移行の手順

### ステップ1: 事前変換（ローカル）
1. `元データ` のCSVを、Supabase取り込み用のステージングCSVに変換
2. 変換後のCSVは `hoiku-crm/supabase/` 配下に出力

### ステップ2: SupabaseにCSV取り込み
1. Supabase Dashboard → Table Editor でステージングテーブルを作成
2. 変換済みCSVをImport

### ステップ3: 本テーブルへ一括反映
1. `import_full_data.sql` をSQL Editorで実行
2. users / sources → candidates → projects → interviews → contracts の順に反映
1. `sources` - 媒体マスタ（既に初期データあり）
2. `users` - ユーザー/コンサルタント
3. `candidates` - 求職者基本情報

### ステップ2: 詳細データの移行
1. `candidate_details` - 求職者詳細情報
2. `contact_history` - 連絡履歴
3. `consultant_metrics` - 担当者別数値管理

### ステップ3: 選考・成約データの移行
1. `projects` - 案件（選考プロセス）
2. `interview_management` - 面接管理
3. `interview_deadlines` - 面接予定期限
4. `contracts` - 成約データ

### ステップ4: 補助データの移行
1. `memos` - メモ
2. `approach_priorities` - アプローチ優先度
3. `candidate_ranks` - 求職者ランク
4. `timeline_events` - タイムラインイベント

## 注意事項

### データの正規化
- 同じデータが複数のスプレッドシートに存在する場合、一つのテーブルに統合
- 外部キーを使用してリレーションを維持

### 日付・時刻の変換
- CSVの日付形式（2025/10/10等）をDATE型に変換
- 時刻情報がある場合はTIME型またはTIMESTAMPTZ型を使用

### 数値の変換
- カンマ区切りの数値（"687,600"）をINTEGER型に変換
- パーセンテージ（"30%"）から数値部分を抽出

### 絵文字・特殊文字
- ステータスの絵文字（🟢、🟤等）は`status_emoji`カラムに保存
- 通常のステータスは`status`カラムに保存

### カンマ区切りデータ
- `qualification`（保有資格）はカンマ区切りで保存
- `proposed_gardens`（提案園）もカンマ区切りで保存
- 将来的にJSONB型への移行を検討

## 移行スクリプトの作成

各スプレッドシート用のCSVインポートスクリプトを作成することを推奨します。

1. CSVファイルの読み込み
2. データの検証・クリーニング
3. 外部キーの解決（氏名→ID、媒体名→ID等）
4. データベースへの挿入
5. エラーハンドリングとログ出力



# スプレッドシートからデータベースへの移行ガイド

## 概要

現在使用しているスプレッドシートの構造を分析し、データベース設計に反映しました。

## スプレッドシートとデータベーステーブルの対応

### 1. 【自動更新】成約データ - 2025_10.csv
**対応テーブル**: `contracts`

| CSVカラム | データベースカラム | 備考 |
|---------|-----------------|------|
| ID | candidate_id | 外部キー |
| 承諾日 | accepted_date | |
| 転職勧奨禁止期間 | employment_restriction_until | |
| 氏名 | candidates.name | リレーション |
| 経由 | sources.name | リレーション |
| 担当 | users.name | リレーション |
| 雇用 | employment_type | |
| 職種 | job_type | |
| 登録日 | candidates.registered_at | リレーション |
| 入金 | payment_date | |
| 売上(税抜) | revenue_excluding_tax | |
| 売上(税込) | revenue_including_tax | |
| 請求書発送 | invoice_sent_date | |
| 算出根拠 | calculation_basis | |
| 格納先URL | document_url | |
| 入職先 | placement_company | |

### 2. 【保育】数値管理シート_最新版 - 11月面接.csv
**対応テーブル**: `interview_management`

| CSVカラム | データベースカラム | 備考 |
|---------|-----------------|------|
| 担当 | consultant_id | 外部キー |
| 氏名 | candidate_id | 外部キー |
| 確度 | probability, probability_percentage | |
| 雇用 | employment_type | |
| 職種 | job_type | |
| 手数料 | commission_rate | |
| 時期 | expected_period | |
| エリア | area | |
| 面接日 | interview_date | |
| 園名 | garden_name | |
| 法人名 | corporation_name | |
| 併願 | concurrent_application | |
| 契約書 | contract_rate | |
| 併願の状況 | concurrent_status | |
| 面接練習 | interview_practice | |
| 戦略 | strategy | |
| 本人 | candidate_notes | |
| 法人 | corporation_notes | |
| 面接後の詳細 | interview_result | |

### 3. 【保育】数値管理シート_最新版 - 瀧澤.csv
**対応テーブル**: `consultant_metrics`

| CSVカラム | データベースカラム | 備考 |
|---------|-----------------|------|
| 割り振り日 | assignment_date | |
| 求職者名 | candidate_id | 外部キー |
| リード獲得先 | lead_source | |
| カテゴリ | category | |
| ステータス | status_emoji | |
| ヨミ金額(MIN) | expected_amount_min | |
| ヨミ確度(当月) | expected_probability_current | |
| ヨミ確度(翌月) | expected_probability_next | |
| 成約金額 | closed_amount | |
| 面接フラグ | interview_flag | |
| 面接フラグ日 | interview_flag_date | |
| 成約日 | closed_date | |
| エリア | area | |
| 面接日 | interview_date | |
| 職種 | job_type | |
| 入職時期 | entry_period | |
| 園名 | garden_name | |
| 法人名 | corporation_name | |
| 併願 | concurrent_application | |

### 4. 求職者管理 - 大塚.csv
**対応テーブル**: `candidates` + `candidate_details`

| CSVカラム | データベースカラム | 備考 |
|---------|-----------------|------|
| 優先度 | approach_priority | candidatesテーブル |
| ステータス | status | candidatesテーブル |
| ID | id | candidatesテーブル |
| 初回面談日 | first_meeting_date | candidate_details |
| 求職者氏名 | name | candidatesテーブル |
| 電話番号 | phone | candidatesテーブル |
| メールアドレス | email | candidatesテーブル |
| 生年月日 | birth_date | candidatesテーブル |
| 年齢 | age | candidatesテーブル |
| 都道府県 | prefecture | candidatesテーブル |
| 市区町村 | address | candidatesテーブル |
| 希望エリア | - | 要追加検討 |
| 保有資格 | qualification | candidatesテーブル |
| 雇用形態 | desired_employment_type | candidatesテーブル |
| 経験 | experience | candidate_details |
| 入社時期 | - | projects.expected_entry_date |
| 退職状況 | resignation_status | candidate_details |
| 退職理由 | resignation_reason | candidate_details |
| 給与 | desired_salary | candidate_details |
| 園児数 | desired_children_count | candidate_details |
| 勤務時間その他 | desired_working_hours | candidate_details |
| 提案園 | proposed_gardens | candidate_details |
| 登録日 | registered_at | candidatesテーブル |
| 初回 | first_contact_done | candidate_details |
| 初回面談日 | first_contact_date | candidate_details |
| 初回点数 | first_contact_score | candidate_details |
| AC | ac_done | candidate_details |
| 提案 | proposal_done | candidate_details |
| 初提案日 | first_proposal_date | candidate_details |
| 一括 | batch_done | candidate_details |
| 一括完了日 | batch_completion_date | candidate_details |
| 提携開始 | partnership_started | candidate_details |
| 提携開始日 | partnership_start_date | candidate_details |
| 提携完了 | partnership_completed | candidate_details |
| 提携完了日 | partnership_completion_date | candidate_details |
| 開拓開始 | development_started | candidate_details |
| 開拓開始日 | development_start_date | candidate_details |
| 開拓完了 | development_completed | candidate_details |
| 開拓完了日 | development_completion_date | candidate_details |
| スピード | speed_score | candidate_details |
| ボリューム | volume_score | candidate_details |
| 意向獲得 | intention_obtained | candidate_details |
| 意向獲得日 | intention_obtained_date | candidate_details |
| 面接日 | interview_date | candidate_details |
| 成約確度 | closing_probability | candidate_details |
| 併願設定 | concurrent_setting | candidate_details |
| 面接対策 | interview_preparation | candidate_details |
| 面接前フォロー | pre_interview_followup | candidate_details |
| 対策点数 | preparation_score | candidate_details |
| 合否 | interview_result | candidate_details |
| 承諾日 | acceptance_date | candidate_details |
| 要因分析 | factor_analysis | candidate_details |
| クロージング | closing_notes | candidate_details |
| 追客コア | followup_core | candidate_details |
| 追客期限 | followup_deadline | candidate_details |
| 対応点数 | response_score | candidate_details |
| 初回→一括 | days_first_to_batch | candidate_details |
| 初回→提案 | days_first_to_proposal | candidate_details |
| 提案→意向 | days_proposal_to_intention | candidate_details |
| 意向→面接 | days_intention_to_interview | candidate_details |

### 5. 求職者管理 - 連絡先一覧.csv
**対応テーブル**: `contact_history`

| CSVカラム | データベースカラム | 備考 |
|---------|-----------------|------|
| 担当者 | consultant_id | 外部キー |
| 媒体 | source_id | 外部キー |
| 日付 | contact_date | |
| 曜日 | day_of_week | |
| 時間 | contact_time | |
| 電話予約 | phone_reservation | |
| ステータス | status | |
| ID | candidate_id | 外部キー |
| 氏名 | candidates.name | リレーション |
| 電話番号 | candidates.phone | リレーション |
| メールアドレス | candidates.email | リレーション |
| 生年月日 | candidates.birth_date | リレーション |
| 年齢 | candidates.age | リレーション |
| 都道府県 | candidates.prefecture | リレーション |
| 市区町村 | candidates.address | リレーション |
| 正・パ | candidates.desired_employment_type | リレーション |
| 保有資格 | candidates.qualification | リレーション |
| 応募職種 | candidates.desired_job_type | リレーション |
| 応募・気になる求人 | applied_job | |
| 備考 | notes | |
| フォロー中断理由 | followup_interruption_reason | |

### 6. 保育事業部動いている人 - シート1.csv
**対応テーブル**: `interview_deadlines`

| CSVカラム | データベースカラム | 備考 |
|---------|-----------------|------|
| 担当者 | consultant_id | 外部キー |
| 優先順位 | priority | |
| 求職者番号 | candidate_id | 外部キー |
| 登録日 | registration_date | |
| 面接設定期限 | interview_deadline | |
| 求職者名 | candidates.name | リレーション |
| カテゴリ | category | |
| ステータス | status_emoji | |
| 面接フラグ | interview_flag | |
| 面接日 | interview_date | |
| 面接予定園 | scheduled_garden | |
| 読み金額 | expected_amount | |
| 都道府県 | candidates.prefecture | リレーション |
| 市町村区以下 | city | |
| 入職時期 | entry_period | |
| 職種 | job_type | |
| 雇用形態 | employment_type | |
| 備考 | notes | |

## データ移行の手順

### ステップ1: 基本データの移行
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



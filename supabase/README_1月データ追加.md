# 1月分データ追加手順

## 概要
現在のDBは12月分までですが、1月分（2026_01）のデータを追加します。

## 手順

### ステップ0: 1月分のCSVファイルを作成（初回のみ）

元のCSVファイルには10月〜1月の全データが含まれているため、1月分だけを抽出したCSVファイルを作成します。

```bash
cd "/Users/a2025-057/Desktop/ishii/12_SaaS開発ドキュメント/hoiku-crm/supabase"
python3 extract_january_csv.py
```

成功すると、`stg_member_monthly_2026_01.csv` が作成されます（327件のデータ）

### ステップ1: CSVデータをSupabaseにインポート

1. Supabase Dashboardにログイン
2. **Table Editor** → `stg_member_monthly` テーブルを開く
3. **Import CSV** ボタンをクリック
4. 以下のCSVファイルをアップロード：
   - `hoiku-crm/supabase/stg_member_monthly_2026_01.csv`（ステップ0で作成したファイル）
5. カラムマッピングを確認：
   - `年月` → `month_text`
   - `メンバー名` → `member_name`
   - `ID` → `candidate_id`
   - `割り振り日` → `assigned_date`
   - `求職者名` → `candidate_name`
   - `リード獲得先` → `lead_source`
   - `カテゴリ` → `category`
   - `ステータス` → `status`
   - `ヨミ金額` → `expected_amount`
   - `ヨミ確度(当月)` → `prob_current`
   - `ヨミ確度(翌月)` → `prob_next`
   - `成約金額` → `contract_amount`
   - `面接フラグ` → `interview_flag`
6. **Import** を実行

**注意**: 既に全データがインポート済みの場合は、このステップをスキップしてステップ2に進んでください。

### ステップ2: projectsテーブルにデータを反映

1. Supabase Dashboard → **SQL Editor** を開く
2. 以下のいずれかのSQLファイルを実行：

#### オプションA: 1月分のみ追加（推奨）
`import_january_data.sql` を実行

#### オプションB: 10月〜1月分を一括追加
`import_monthly_projects.sql` を実行（既に更新済みで1月分も含まれています）

### ステップ3: 結果確認

SQL実行後、以下のクエリで1月分のデータが正しく追加されたか確認できます：

```sql
-- 1月分のデータ件数確認
SELECT 
  month_text,
  COUNT(*) as project_count
FROM projects
WHERE month_text = '2026_01'
GROUP BY month_text;

-- 月別データ件数確認（全期間）
SELECT 
  month_text,
  COUNT(*) as project_count
FROM projects
WHERE month_text IS NOT NULL
GROUP BY month_text
ORDER BY month_text DESC;
```

## 注意事項

- 既存のプロジェクト（同じ`candidate_id`と`month_text`の組み合わせ）は重複して追加されません
- `candidates`テーブルに存在しない`candidate_id`のデータはスキップされます
- ヨミ金額はカンマ区切りの文字列から数値に変換されます

## トラブルシューティング

### エラー: "relation stg_member_monthly does not exist"
→ `import_csv_data.sql` のStep 1を先に実行してテーブルを作成してください

### エラー: "duplicate key value violates unique constraint"
→ 既に同じデータが存在している可能性があります。`NOT EXISTS`条件により重複は防がれていますが、手動で確認してください

### データが追加されない
→ `candidates`テーブルに対応する`candidate_id`が存在するか確認してください

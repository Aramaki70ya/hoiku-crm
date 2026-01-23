# データ検証レポート

生成日時: 2026-01-21T02:22:24.515Z

## データ件数

| テーブル | 件数 |
|---------|------|
| users | 11 |
| sources | 12 (追加分) |
| candidates | 855 |
| projects | 29 |
| contracts | 25 |
| interviews | 0 |

## 外部キー整合性

### contracts → candidates
- 参照エラー: 4件

### projects → candidates
- 参照エラー: 3件

## 注意事項

- contracts: candidate_id '20204369' not found in candidates
- contracts: candidate_id '20205637' not found in candidates
- contracts: candidate_id '20205851' not found in candidates
- contracts: candidate_id '20206086' not found in candidates
- projects: candidate_id '20205298' not found in candidates
- projects: candidate_id '20205959' not found in candidates
- projects: candidate_id '20203025' not found in candidates
- candidates: 664 records may have NULL name

## エラー

- なし

## 実行順序

1. schema.sql（テーブル作成）
2. 01_users.sql（ユーザーデータ）
3. 02_sources.sql（媒体マスタ追加分）
4. 03_candidates.sql（求職者データ）
5. 04_projects.sql（案件データ）
6. 05_contracts.sql（成約データ）
7. 06_interviews.sql（面接データ）

## 備考

- source_idは現在NULLとして挿入されています。必要に応じて後続のUPDATEクエリで設定してください。
- 外部キー参照エラーがある場合、該当のcandidate_idがcandidatesテーブルに存在しない可能性があります。
- interviewsテーブルはproject_idが必須のため、projectsテーブルに対応するレコードが存在する場合のみ挿入されます。

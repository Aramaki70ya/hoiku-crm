# ダッシュボード 営業進捗状況テーブルの計算ロジック

## テーブルの各カラムの計算方法

### データソース

- `candidates`: 求職者テーブル
- `projects`: 案件テーブル
- `interviews`: 面接テーブル
- `contracts`: 成約テーブル
- `users`: ユーザー（コンサルタント）テーブル

### 計算ロジック（期間対応）

#### 1. 担当（totalCount）
**定義**: 期間内に登録された求職者数

**計算方法**:
```typescript
const userPeriodCandidates = periodCandidates.filter(
  (c) => c.consultant_id === user.id
)
const totalCount = userPeriodCandidates.length
```

**データソース**:
- `candidates.registered_at`が期間内
- `candidates.consultant_id`が該当ユーザー

---

#### 2. 初回（firstContactCount）
**定義**: 初回連絡済みの求職者数

**計算方法**:
```typescript
const firstContactCount = userPeriodCandidates.filter(
  (c) => !['new', 'contacting'].includes(c.status)
).length
```

**データソース**:
- 期間内に登録された求職者のうち
- ステータスが`first_contact_done`以降の求職者

**ステータス判定**:
- `new`: 新規（初回未実施）
- `contacting`: 連絡中（初回未実施）
- `first_contact_done`以降: 初回済み

---

#### 3. 面接（interviewCount）
**定義**: 期間内に面接を設定したユニークな求職者数

**計算方法**:
```typescript
const interviewCandidateIds = new Set<string>()
periodInterviews.forEach((i) => {
  const project = projects.find((p) => p.id === i.project_id)
  if (project) {
    const candidate = candidates.find((c) => c.id === project.candidate_id)
    if (candidate && candidate.consultant_id === user.id) {
      interviewCandidateIds.add(candidate.id)
    }
  }
})
const interviewCount = interviewCandidateIds.size
```

**データソース**:
- `interviews.created_at`が期間内（面接を設定した日時）
- `interviews.project_id` → `projects.candidate_id` → `candidates.consultant_id`で担当者を特定
- 同じ求職者が複数回面接を設定していても、1人としてカウント

**重要**: 
- ユニークな求職者数をカウント（重複排除）
- **「設定した」日時で判定**（`created_at`を使用）

---

#### 4. 成約（closedCount）
**定義**: 期間内に成約を設定した数

**計算方法**:
```typescript
const closedCount = periodContracts.filter((c) => {
  const candidate = candidates.find((ca) => ca.id === c.candidate_id)
  return candidate && candidate.consultant_id === user.id
}).length
```

**データソース**:
- `contracts.created_at`が期間内（成約を設定した日時）
- `contracts.candidate_id` → `candidates.consultant_id`で担当者を特定

**重要**: **「設定した」日時で判定**（`created_at`を使用）

---

#### 5. 面談率（担当→初回）
**計算式**:
```
面談率 = (初回 / 担当) × 100
```

**例**:
- 担当: 20人
- 初回: 9人
- 面談率: (9 / 20) × 100 = 45%

---

#### 6. 設定率（初回→面接）
**計算式**:
```
設定率 = (面接 / 初回) × 100
```

**例**:
- 初回: 9人
- 面接: 1人
- 設定率: (1 / 9) × 100 = 11.1%

---

#### 7. 成約率（面接→成約）
**計算式**:
```
成約率 = (成約 / 面接) × 100
```

**例**:
- 面接: 1人
- 成約: 1人
- 成約率: (1 / 1) × 100 = 100%

---

## ステータス別案件の分類

### 調整中（adjusting）
**条件**:
- `projects.phase === 'interview_scheduled'`
- かつ、`interviews.status === 'rescheduling'`の面接が存在

**表示内容**:
- 求職者名
- ヨミ確度と確率（例: `Aヨミ(80%)`）
- ヨミ金額（例: `¥30万`）

---

### 面接前（beforeInterview）
**条件**:
- `projects.phase === 'interview_scheduled'`
- かつ、`interviews.status === 'scheduled'`の面接が存在
- かつ、完了した面接がない（`interviews.status === 'completed'`が0件）

**表示内容**:
- 求職者名
- ヨミ確度と確率
- ヨミ金額

---

### 結果待ち（waitingResult）
**条件**:
- `projects.phase === 'interviewing'`
- かつ、完了した面接が存在（`interviews.status === 'completed'`が1件以上）

**表示内容**:
- 求職者名
- ヨミ確度と確率
- ヨミ金額

---

### 本人返事待ち（waitingReply）
**条件**:
- `projects.phase === 'offer'`
- または、`candidates.status === 'offer'`

**表示内容**:
- 求職者名
- ヨミ確度と確率
- ヨミ金額

---

## 期間フィルタリング

### 期間の計算

```typescript
// 当月
startDate = new Date(now.getFullYear(), now.getMonth(), 1)
endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

// 前月
const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
startDate = new Date(prev.getFullYear(), prev.getMonth(), 1)
endDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 0, 23, 59, 59)

// 指定期間
startDate = new Date(customStartDate)
endDate = new Date(customEndDate)
endDate.setHours(23, 59, 59, 999)
```

### フィルタリング対象

1. **担当件数**: `candidates.registered_at`が期間内（対象期間内に登録した人数）
2. **面接数**: `interviews.created_at`が期間内（対象期間内に設定した人数）
3. **成約数**: `contracts.created_at`が期間内（対象期間内に設定した人数）

**注意**: 
- 初回接触数は、期間内に登録された求職者のうち、初回済みの数をカウント（登録日が期間内であることが条件）
- **面接・成約は「設定した」日時（`created_at`）で判定**（実施日や確定日ではない）

---

## 実装のポイント

### 1. ユニークな求職者数のカウント

面接数は、同じ求職者が複数回面接を設定していても、1人としてカウントする必要があります。

```typescript
const interviewCandidateIds = new Set<string>()
periodInterviews.forEach((i) => {
  // ... 担当者を特定
  interviewCandidateIds.add(candidate.id)
})
const interviewCount = interviewCandidateIds.size
```

### 2. リレーションの追跡

面接から求職者を特定するには、以下のリレーションを追跡する必要があります：

```
interviews.project_id → projects.candidate_id → candidates.consultant_id
```

### 3. 期間フィルタリングの一貫性

すべての集計値は、同じ期間基準で計算する必要があります。

### 4. 「設定した」日時の使用

- **面接**: `interviews.created_at`（面接を設定した日時）で判定
- **成約**: `contracts.created_at`（成約を設定した日時）で判定

**重要**: 実施日（`start_at`）や確定日（`contracted_at`）ではなく、**作成日（`created_at`）で判定**します。

---

## データベースクエリ例（将来の実装）

### Supabaseでの集計クエリ

```sql
-- 期間内の担当件数
SELECT consultant_id, COUNT(*) as total_count
FROM candidates
WHERE registered_at >= :start_date AND registered_at <= :end_date
GROUP BY consultant_id

-- 期間内の初回接触数
SELECT consultant_id, COUNT(*) as first_contact_count
FROM candidates
WHERE registered_at >= :start_date AND registered_at <= :end_date
  AND status NOT IN ('new', 'contacting')
GROUP BY consultant_id

-- 期間内の面接設定数（ユニークな求職者数）
SELECT DISTINCT c.consultant_id, COUNT(DISTINCT c.id) as interview_count
FROM interviews i
JOIN projects p ON i.project_id = p.id
JOIN candidates c ON p.candidate_id = c.id
WHERE i.created_at >= :start_date AND i.created_at <= :end_date
GROUP BY c.consultant_id

-- 期間内の成約設定数
SELECT c.consultant_id, COUNT(*) as closed_count
FROM contracts ct
JOIN candidates c ON ct.candidate_id = c.id
WHERE ct.created_at >= :start_date AND ct.created_at <= :end_date
GROUP BY c.consultant_id
```

---

---

## 売上数字テーブルの計算ロジック

### カラムの説明

| カラム | 計算方法 | データソース |
|--------|----------|-------------|
| **社員名** | ユーザー名 | `users.name` |
| **売上予算** | 予算設定値 | `settings`テーブル（未実装、現在はmock） |
| **成約額** | 期間内の成約売上合計 | `contracts.revenue_excluding_tax`（`created_at`が期間内） |
| **対予算(%)** | (成約額 / 売上予算) × 100 | 計算値 |
| **面接設定目標** | 目標設定値 | `settings`テーブル（未実装、現在はmock） |
| **面接設定数** | 期間内に面接を組んだ人数（1人複数件でも1カウント） | `interviews.created_at`が期間内のユニーク求職者数 |
| **対面接設定(%)** | (面接設定数 / 面接設定目標) × 100 | 計算値 |

### 重要なポイント

1. **成約額**: 期間内に設定（`created_at`）した成約の税抜売上合計
2. **面接設定数**: 期間内に面接を設定したユニークな求職者数（同じ求職者で複数面接を設定しても1カウント）

---

## 更新履歴

- 2025-01-22: 初版作成（実際のデータベースから計算するロジックを実装）
- 2025-01-22: 修正 - 面接・成約は「設定した」日時（`created_at`）で判定するように変更
- 2025-01-23: 売上数字テーブルの計算ロジックを追加

# API仕様（認証・ユーザー管理）

## 共通
- ベースURL: `/api`
- 認証: Supabase Authのセッション（Cookie）
- 権限: `users.role` が `admin` のみ実行可能なAPIあり

## 認証

### GET /auth/me
セッション中のユーザー情報を取得する。

**レスポンス例**
```json
{
  "authUser": { "id": "auth-user-id", "email": "user@example.com" },
  "user": { "id": "uuid", "name": "山田", "email": "user@example.com", "role": "admin" }
}
```

### POST /auth/logout
セッションを破棄する。

**レスポンス**: `204 No Content`

## ユーザー管理

### GET /users
ユーザー一覧を取得する（認証済みなら取得可能）。

### POST /users
ユーザーを追加する（管理者のみ）。

**リクエスト例**
```json
{ "name": "山田", "email": "user@example.com", "role": "user" }
```

### PATCH /users/:id
ユーザー情報を更新する（管理者のみ）。

**リクエスト例**
```json
{ "name": "山田", "email": "user@example.com", "role": "admin" }
```

### DELETE /users/:id
ユーザーを削除する（管理者のみ）。

**レスポンス**: `204 No Content`

### POST /users/reset-password
パスワードリセットメールを送信する（管理者のみ、Email/Password利用時）。

**リクエスト例**
```json
{ "email": "user@example.com" }
```

---

## 外部連携（スプレッドシート取り込み）

### POST /sync/candidates
スプレッドシートの行配列を受け取り、新規の求職者のみ `candidates` に追加する。

**認証**
- Cookie セッション、または `Authorization: Bearer <SYNC_API_KEY>`
- APIキー連携時は `SUPABASE_SERVICE_ROLE_KEY` の設定が必要

**リクエストボディ**
```json
{
  "rows": [
    {
      "ID": "1001",
      "氏名": "山田 花子",
      "登録日": "2024-01-15",
      "担当者": "佐藤",
      "媒体": "LINE"
    }
  ]
}
```

**必須項目**
- `ID`（求職者ID）
- `氏名`（氏名）

**補足**
- 登録日は `日付` または `登録日` のどちらでも可
- 1リクエストあたり最大100行（超過分は未処理）

**レスポンス例**
```json
{
  "inserted": 2,
  "skipped": 3,
  "backfilled": 1,
  "errors": [],
  "insertedLog": [{"id": "1001", "name": "山田 花子"}],
  "skippedLog": [{"id": "1002", "name": "佐藤 太郎"}],
  "backfilledLog": [{"id": "1003", "name": "鈴木 一郎"}],
  "message": "2件追加、1件の登録日を補完、3件は既に登録済み。"
}
```

**エラーレスポンス**
- `401`: 認証が必要
- `403`: デモモードでは取り込み不可
- `503`: APIキー連携だが `SUPABASE_SERVICE_ROLE_KEY` 未設定

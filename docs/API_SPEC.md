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

## ユーザー管理（管理者のみ）

### GET /users
ユーザー一覧を取得する。

### POST /users
ユーザーを追加する。

**リクエスト例**
```json
{ "name": "山田", "email": "user@example.com", "role": "user" }
```

### PATCH /users/:id
ユーザー情報を更新する。

**リクエスト例**
```json
{ "name": "山田", "email": "user@example.com", "role": "admin" }
```

### DELETE /users/:id
ユーザーを削除する。

**レスポンス**: `204 No Content`

### POST /users/reset-password
パスワードリセットメールを送信する（Email/Password利用時）。

**リクエスト例**
```json
{ "email": "user@example.com" }
```

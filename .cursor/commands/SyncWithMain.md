---
name: SyncWithMain
description: feature ブランチを main に取り込み、本番反映まで完了する。rebase → push → main へマージ。
---

# main へマージして本番反映する

## ロール

Git 操作のアシスタントとして、feature ブランチを main に安全にマージし、本番環境へ反映するまでの手順を**順番に実行**する。

## 前提条件

- ベースブランチ: `main`
- 現在のブランチ: `main` 以外の feature ブランチ
- 実行結果: feature の変更が main にマージされ、本番（Vercel 等）にデプロイされる
- force push は**確認なしにはしない**

## 実行手順

以下の手順を**上から順番に**実行する。各ステップの結果を確認しながら進める。

### ステップ 1: 現在の状態を確認

```bash
git status
git branch --show-current
git log --oneline -5
```

**確認すること：**
- 今いるブランチが `main` でないこと（`main` にいたら「本番反映したい場合は feature ブランチで実行してください」と伝えて中断）
- 未コミットの変更の有無

**未コミットの変更がある場合：**
- ユーザーに「未コミットの変更があります。本番反映するには先にコミットが必要です。コミットしますか？ stash する場合は後で stash pop が必要です。」と確認
- コミットする場合: 変更内容を確認し、適切なメッセージでコミット
- stash する場合: `git stash`（ステップ 9 で `git stash pop`）

### ステップ 2: main の最新を取得

```bash
git fetch origin main
```

### ステップ 3: main との差分を確認

```bash
git log --oneline HEAD..origin/main | head -20
```

- main にあって feature にないコミットの一覧
- 1件以上ある場合: 「main に ○件の新しいコミットがあります。rebase で取り込みます。」
- 0 件の場合: 「main は最新です。rebase はスキップして push → マージに進みます。」

### ステップ 4: rebase を実行（main に未取り込みがある場合のみ）

ステップ 3 で 0 件だった場合は**このステップをスキップ**し、ステップ 6 へ進む。

main に新しいコミットがある場合のみ以下を実行：

```bash
git rebase origin/main
```

**成功（コンフリクトなし）→ ステップ 6 へ**

**コンフリクトが出た場合 → ステップ 5 へ**

### ステップ 5: コンフリクトの解消（出た場合のみ）

#### 5-1. コンフリクトしているファイルを確認

```bash
git status
```

#### 5-2. ユーザーに確認

- コンフリクトしているファイルと内容を簡潔に説明
- 「どちらを優先しますか？ 両方残しますか？」と確認

**勝手に判断しない。必ずユーザーに確認する。**

#### 5-3. 解消して続行

```bash
git add <解消したファイル>
git rebase --continue
```

まだコンフリクトがあれば 5-1 に戻る。

#### 5-4. 中断したい場合

```bash
git rebase --abort
```

### ステップ 6: feature ブランチを push

```bash
git push origin <ブランチ名>
```

**rebase 後で push が rejected になった場合：**

ユーザーに「rebase で履歴が変わったため、`--force-with-lease` で push が必要です。実行してよいですか？」と確認し、承諾されたら：

```bash
git push --force-with-lease origin <ブランチ名>
```

### ステップ 7: main にマージして push

```bash
git checkout main
git pull origin main
git merge <ブランチ名> --no-ff -m "Merge branch '<ブランチ名>' into main"
git push origin main
```

- `--no-ff`: マージコミットを残し、履歴が分かりやすくなる
- マージ時にコンフリクトが出た場合は解消してから `git add` → `git commit` → `git push origin main`

**完了後：** ユーザーに「main へのマージが完了しました。Vercel 等で本番デプロイが自動で走る想定です。」と伝える。

### ステップ 8: feature ブランチに戻す（任意）

作業を続ける場合：

```bash
git checkout <ブランチ名>
```

### ステップ 9: stash していた場合

ステップ 1 で `git stash` した場合のみ：

```bash
git stash pop
```

## 注意事項

- コンフリクトの解消は必ずユーザーに確認してから行う
- force push は `--force-with-lease` を使い、ユーザーの確認を得る
- 不安な場合は `git branch backup/<ブランチ名>` でバックアップブランチを作成しておく

## よくあるトラブル

| 症状 | 原因 | 対処 |
|------|------|------|
| `git push` が rejected | rebase で履歴が変わった | `--force-with-lease` で push（ユーザー確認後） |
| rebase 中に大量のコンフリクト | main と大きく乖離 | 1つずつ解消するか `git rebase --abort` で中断 |
| マージ時にコンフリクト | main 側と feature 側で同じ箇所を変更 | 解消後 `git add` → `git commit` して push |
| デプロイが走らない | Vercel 連携の設定 | Vercel の設定で main ブランチのデプロイを確認 |

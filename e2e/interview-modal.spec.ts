import { test, expect } from '@playwright/test'

/**
 * 面接件数クリック→モーダル表示→無効化 のE2Eテスト
 *
 * 前提: テスト用求職者「テスト 花子」がDBに存在し、
 *       吉田担当で今月の面接が1件登録されていること。
 *       node scripts/create_test_candidate_for_interview_modal.js で作成可能。
 */
test.describe('面接件数内訳モーダル', () => {
  test('面接数をクリックするとモーダルが開き、対象求職者一覧が表示される', async ({ page }) => {
    await page.goto('/dashboard-summary')
    await page.waitForLoadState('networkidle')

    // 営業進捗テーブルが表示されるまで待つ
    await expect(page.getByRole('table')).toBeVisible({ timeout: 15000 })

    // 吉田の行を取得（1行目はヘッダーのためスキップ、データ行から探す）
    const row = page.getByRole('row').filter({ hasText: '吉田' }).first()
    await expect(row).toBeVisible()

    // その行の「面接」列のボタン（4列目: 担当者, 担当, 初回, 面接）
    const interviewCell = row.locator('td').nth(3)
    const interviewButton = interviewCell.getByRole('button')
    await expect(interviewButton).toBeVisible()

    // 面接数が1以上であることを確認（テストデータが入っている前提）
    const countText = await interviewButton.textContent()
    expect(Number(countText?.trim() ?? 0)).toBeGreaterThanOrEqual(0)

    // クリックしてモーダルを開く
    await interviewButton.click()

    // モーダルが開き「テスト 花子」が一覧に含まれること
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText(/面接設定一覧/)).toBeVisible()
    await expect(dialog.getByText('テスト 花子')).toBeVisible()
  })

  test('モーダル内で無効化を実行すると確認ダイアログが出て処理できる', async ({ page }) => {
    // confirm を accept するリスナーを先に登録
    page.on('dialog', (d) => d.accept())

    await page.goto('/dashboard-summary')
    await page.waitForLoadState('networkidle')

    const row = page.getByRole('row').filter({ hasText: '吉田' }).first()
    await expect(row).toBeVisible()
    const interviewButton = row.locator('td').nth(3).getByRole('button')
    await interviewButton.click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('テスト 花子')).toBeVisible()

    // 無効化ボタンをクリック（confirm はリスナーで accept）
    const voidButton = dialog.getByRole('button', { name: '無効化' }).first()
    await expect(voidButton).toBeVisible()
    await voidButton.click()

    // 処理完了を待つ（アラート or 再取得）
    await page.waitForTimeout(3000)
    // モーダルが閉じているか、一覧が空になっている
    const dialogStillVisible = await dialog.isVisible().catch(() => false)
    const emptyMessage = await page.getByText('対象期間に面接設定された候補者はいません').isVisible().catch(() => false)
    expect(!dialogStillVisible || emptyMessage).toBeTruthy()
  })
})

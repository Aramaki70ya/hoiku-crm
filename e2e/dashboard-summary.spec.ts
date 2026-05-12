import { test, expect, type Page, type TestInfo } from '@playwright/test'

/**
 * 認証済み状態でダッシュボードサマリーへ進む。
 * 未ログインのときは環境変数 E2E_LOGIN_EMAIL / E2E_LOGIN_PASSWORD でログイン試行する。
 * 両方とも未設定ならこのテストをスキップする（ローカルの既存セッションだけで回す構成も許容）。
 */
async function navigateToDashboardSummaryAuthenticated(page: Page, testInfo: TestInfo): Promise<boolean> {
  await page.goto('/dashboard-summary')
  await page.waitForLoadState('networkidle')

  if (!page.url().includes('/login')) return true

  const email = process.env.E2E_LOGIN_EMAIL?.trim()
  const password = process.env.E2E_LOGIN_PASSWORD
  if (!email || !password) {
    testInfo.skip(true, 'ログインへリダイレクトされたが E2E_LOGIN_EMAIL / E2E_LOGIN_PASSWORD 未設定')
    return false
  }

  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'ログイン' }).click()
  await expect(page).not.toHaveURL(/\/login\b/, { timeout: 45000 })

  await page.goto('/dashboard-summary')
  await page.waitForLoadState('networkidle')
  return true
}

test.describe('dashboard-summary regression', () => {
  test('集計期間切替と面接・成約サマリー表示', async ({ page }, testInfo) => {
    if (!(await navigateToDashboardSummaryAuthenticated(page, testInfo))) return

    // 主要カードが表示されること
    await expect(page.getByText('主要実績サマリー')).toBeVisible({ timeout: 15000 })
    // 主要実績サマリーの各メトリクス行
    const kpiCard = page.locator('[data-slot="card"]').filter({ hasText: '主要実績サマリー' }).first()
    await expect(kpiCard.getByText('売上合計')).toBeVisible()
    await expect(kpiCard.getByText('ヨミ数字合計')).toBeVisible()
    await expect(kpiCard.getByText('新規登録数')).toBeVisible()
    await expect(kpiCard.getByText('初回ヒアリング数')).toBeVisible()

    const summaryCard = page.locator('[data-slot="card"]').filter({ hasText: '担当者別 面接・成約サマリー' }).first()
    await expect(summaryCard).toBeVisible()

    // グラフ系列ラベル（面接実績 / 成約）が表示されること
    await expect(summaryCard.getByText('面接実績')).toBeVisible()
    await expect(summaryCard.getByText('成約')).toBeVisible()
    await expect(summaryCard.getByText('面接目標')).toHaveCount(0)

    // 先月へ切替するとバッジが先月表示になること
    await page.getByRole('button', { name: '先月' }).click()
    await expect(page.getByText(/年\d+月（先月）/)).toBeVisible()

    // 今月へ戻せること
    await page.getByRole('button', { name: '今月' }).click()
    await expect(page.getByText(/年\d+月（今月）/)).toBeVisible()
  })
})

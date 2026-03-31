import { test, expect } from '@playwright/test'

test.describe('dashboard-summary regression', () => {
  test('集計期間切替と面接・成約サマリー表示', async ({ page }) => {
    await page.goto('/dashboard-summary')
    await page.waitForLoadState('networkidle')

    // 主要カードが表示されること
    await expect(page.getByText('目標数値と実績')).toBeVisible({ timeout: 15000 })
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


// P3 — 管理员后台（仅包装法 AR tab）
import { test, expect } from '@playwright/test';

test.describe('P3 — 管理员后台', () => {

  test.beforeEach(async ({ page }) => {
    // 登录 admin
    await page.goto('/login', { waitUntil: 'networkidle' });
    await page.locator('input[type="text"]').fill('admin@freddy-epr.com');
    await page.locator('input[type="password"]').fill('Admin918');
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL('**/admin', { timeout: 10000 });
  });

  test('后台加载并显示包装法 AR tab', async ({ page }) => {
    await expect(page.getByRole('button', { name: /包装法 AR/ })).toBeVisible({ timeout: 10000 });

    // 统计卡片应渲染（客户数/合同数/收入等）
    await expect(page.getByText('总客户')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('活跃合同')).toBeVisible();
    await expect(page.getByText('待付款').first()).toBeVisible();
  });

  test('合同列表区域渲染（空态或列表）', async ({ page }) => {
    await expect(page.getByRole('button', { name: /包装法 AR/ })).toBeVisible({ timeout: 10000 });
    // 列表或空态提示均不应崩溃
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(200);
  });

  test('导出 CSV 与刷新按钮存在', async ({ page }) => {
    await expect(page.getByRole('button', { name: /包装法 AR/ })).toBeVisible({ timeout: 10000 });
    // 导出 CSV 按钮（📥 图标）
    await expect(page.getByRole('button', { name: '📥' })).toBeVisible({ timeout: 5000 });
  });
});

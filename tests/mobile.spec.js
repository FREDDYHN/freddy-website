// P5 — 移动端响应式
import { test, expect } from '@playwright/test';

test.describe('P5 — 移动端', () => {

  test('375px 首页正常加载', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'networkidle' });

    const body = await page.locator('body').textContent();
    expect(body).toContain('包装法授权代表');
    expect(body).toContain('€29');
  });

  test('375px 签约流程可操作', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/signup/packaging', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: '委托方信息' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder('福瑞笛（上海）信息咨询有限公司')).toBeVisible();
  });
});

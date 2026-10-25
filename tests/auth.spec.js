// P2 — 登录认证
import { test, expect } from '@playwright/test';

test.describe('P2 — 登录认证', () => {

  test('管理员登录成功跳转 /admin', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    await page.locator('input[type="text"]').fill('admin@freddy-epr.com');
    await page.locator('input[type="password"]').fill('Admin918');
    await page.locator('form button[type="submit"]').click();

    await page.waitForURL('**/admin', { timeout: 10000 });
  });

  test('错误密码显示错误并停留 /login', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    await page.locator('input[type="text"]').fill('admin@freddy-epr.com');
    await page.locator('input[type="password"]').fill('wrong-password-123');
    await page.locator('form button[type="submit"]').click();

    // 显示错误（后端返回 Invalid credentials）
    await expect(page.getByText(/Invalid|错误|失败/)).toBeVisible({ timeout: 5000 });
    // 停留 /login
    expect(page.url()).toContain('/login');
  });
});

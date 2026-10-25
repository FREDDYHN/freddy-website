// P4 — 公开页面完整性与新价格
import { test, expect } from '@playwright/test';

test.describe('P4 — 公开页面', () => {

  test('/packaging 显示三套餐新价格 €29/49/79', async ({ page }) => {
    await page.goto('/packaging', { waitUntil: 'networkidle' });
    await expect(page.getByText('授权代表服务套餐')).toBeVisible({ timeout: 10000 });

    const body = await page.locator('body').textContent();
    expect(body).toContain('€29');
    expect(body).toContain('€49');
    expect(body).toContain('€79');
    // 旧价格不应再出现
    expect(body).not.toContain('€89');
    expect(body).not.toContain('€159');
    expect(body).not.toContain('€249');
  });

  test('公开页面均返回 200 且非空白', async ({ page }) => {
    const paths = ['/faq', '/contact', '/about', '/privacy', '/terms', '/calculator'];
    for (const p of paths) {
      const res = await page.goto(p, { waitUntil: 'networkidle' });
      expect(res?.status(), `${p} 返回 ${res?.status()}`).toBe(200);
      const body = await page.locator('body').textContent();
      expect(body?.trim().length, `${p} 内容为空`).toBeGreaterThan(100);
    }
  });

  test('导航链接无 404', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    const nav = page.locator('nav');
    const links = nav.locator('a[href]');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    const checked = new Set();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      if (href && href.startsWith('/') && !href.startsWith('//') && !checked.has(href)) {
        checked.add(href);
        const res = await page.request.get(href);
        expect(res.status(), `导航链接 ${href} 返回 ${res.status()}`).toBeLessThan(400);
      }
    }
  });
});

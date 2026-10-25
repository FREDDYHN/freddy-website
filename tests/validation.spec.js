// P1 — 表单验证
import { test, expect } from '@playwright/test';

test.describe('P1 — 表单验证', () => {

  test('步骤1 必填字段未填时下一步按钮禁用', async ({ page }) => {
    await page.goto('/signup/packaging', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: '委托方信息' })).toBeVisible({ timeout: 10000 });

    const nextBtn = page.getByRole('button', { name: /下一步/ });
    await expect(nextBtn).toBeDisabled();
  });

  test('邮箱格式非法时报错且停留步骤1', async ({ page }) => {
    await page.goto('/signup/packaging', { waitUntil: 'networkidle' });

    await page.getByPlaceholder('福瑞笛（上海）信息咨询有限公司').fill('测试公司');
    await page.getByPlaceholder('FREDDY (SHANGHAI) INFORMATION CONSULTING LTD.').fill('Test Co');
    await page.getByPlaceholder('中国上海市浦东新区陆家嘴环路88号金茂大厦58层5808室').fill('地址');
    await page.getByPlaceholder('冯巩').fill('法人');
    await page.getByPlaceholder('Gong Feng').fill('Legal');
    await page.getByPlaceholder('潘长江').fill('联系人');
    await page.getByPlaceholder('Changjiang Pan').fill('Contact');
    await page.getByPlaceholder('139xxxxxxxx').fill('13800138000');
    await page.getByPlaceholder('freddy_epr').fill('wechat');
    await page.getByPlaceholder('your@email.com').fill('invalid-email');

    await page.getByRole('button', { name: /下一步/ }).click();

    await expect(page.getByText('邮箱格式不正确')).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: '委托方信息' })).toBeVisible(); // 仍停留步骤1
  });
});

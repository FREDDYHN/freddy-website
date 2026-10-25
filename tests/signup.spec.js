// P0 — 核心签约流程（包装法授权代表）
import { test, expect } from '@playwright/test';

// 测试数据（时间戳保证每次运行邮箱唯一，避免重复注册冲突）
const ts = () => Date.now();
const TEST = {
  company: 'E2E测试公司',
  companyEn: 'E2E Test Company',
  address: '测试注册地址 1 号',
  legal: '测试法人',
  legalEn: 'Test Legal Rep',
  contact: '测试联系人',
  contactEn: 'Test Contact',
  phone: '13800138000',
  wechat: 'e2e_test_wechat',
  email: `e2e-test-${ts()}@example.com`,
};

test.describe('P0 — 首页与签约流程', () => {

  test('首页显示新价格 €29 与签约 CTA', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // 首页 CTA 应为 €29/年起，链接到包装法签约
    const cta = page.getByText('立即签约', { exact: false }).first();
    await expect(cta).toBeVisible({ timeout: 10000 });
    await expect(cta).toContainText('€29/年');

    // 包装法套餐卡显示 €29
    const body = await page.locator('body').textContent();
    expect(body).toContain('包装法授权代表');
    expect(body).toContain('€29');
  });

  test('签约三步向导完整走通并创建合同', async ({ page }) => {
    await page.goto('/signup/packaging', { waitUntil: 'networkidle' });

    // ── 步骤 1：委托方信息 ──
    await expect(page.getByRole('heading', { name: '委托方信息' })).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('福瑞笛（上海）信息咨询有限公司').fill(TEST.company);
    await page.getByPlaceholder('FREDDY (SHANGHAI) INFORMATION CONSULTING LTD.').fill(TEST.companyEn);
    await page.getByPlaceholder('中国上海市浦东新区陆家嘴环路88号金茂大厦58层5808室').fill(TEST.address);
    await page.getByPlaceholder('冯巩').fill(TEST.legal);
    await page.getByPlaceholder('Gong Feng').fill(TEST.legalEn);
    await page.getByPlaceholder('潘长江').fill(TEST.contact);
    await page.getByPlaceholder('Changjiang Pan').fill(TEST.contactEn);
    await page.getByPlaceholder('139xxxxxxxx').fill(TEST.phone);
    await page.getByPlaceholder('freddy_epr').fill(TEST.wechat);
    await page.getByPlaceholder('your@email.com').fill(TEST.email);

    // 下一步
    await page.getByRole('button', { name: /下一步/ }).click();

    // ── 步骤 2：包装预申报 ──
    await expect(page.getByRole('heading', { name: '包装预申报' })).toBeVisible({ timeout: 5000 });

    // 塑料/Kunststoffe 行（第5个材料）填 500 kg
    await page.getByRole('spinbutton').nth(4).fill('500');

    await page.getByRole('button', { name: /下一步/ }).click();

    // ── 步骤 3：信息确认 ──
    await expect(page.getByRole('heading', { name: '信息确认' })).toBeVisible({ timeout: 5000 });

    // 确认信息显示公司名与套餐（basic 默认）
    const body = await page.locator('body').textContent();
    expect(body).toContain(TEST.company);

    // 提交创建合同
    await page.getByRole('button', { name: /确认无误，创建合同/ }).click();

    // 成功提示
    await expect(page.getByText('合同已创建', { exact: false })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(TEST.email)).toBeVisible();
  });
});

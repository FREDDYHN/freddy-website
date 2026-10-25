// P0 — 意大利客户注册流程（境外税号 + EU USt-IdNr）
// 覆盖：国家下拉切换、境外宽松税号校验、USt-IdNr 必填、三步向导走通到信息确认
// 注意：只走到「信息确认」，不点击「创建合同」，避免在线上生成真实测试合同
import { test, expect } from '@playwright/test';

const ts = () => Date.now();
const TEST = {
  companyZh: '意大利测试贸易有限公司',
  companyEn: 'Italia Test Trading SRL',
  addressZh: '意大利米兰市罗马街1号',
  addressEn: 'Via Roma 1, 20100 Milano, Italy',
  tax: 'DRBRND61M22B925M',        // 意大利 Codice Fiscale（16位）
  vat: 'IT12345678901',           // 意大利 Partita IVA
  legalZh: '测试法人',
  legalEn: 'Mario Rossi',
  contactZh: '测试联系人',
  contactEn: 'Giulia Bianchi',
  phone: '3931234567',
  wechat: 'e2e_italy',
  email: `e2e-italy-${ts()}@example.com`,
};

test.describe('意大利客户注册流程', () => {

  test('选择意大利后切换为境外税号字段并出现 USt-IdNr', async ({ page }) => {
    await page.goto('/signup/packaging', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: '委托方信息' })).toBeVisible({ timeout: 10000 });

    // 默认中国：显示统一社会信用代码，无 USt-IdNr，显示主体类型切换
    await expect(page.getByPlaceholder('91340400MADDK97K4X')).toBeVisible();
    await expect(page.getByPlaceholder('IT12345678901')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '个人' })).toBeVisible();

    // 国家下拉选择意大利（ISO 码 IT）
    await page.locator('select').first().selectOption('IT');

    // 税号字段切换为境外税号（placeholder 为意大利 Codice Fiscale 示例）
    await expect(page.getByPlaceholder('DRBRND61M22B925M')).toBeVisible();
    await expect(page.getByPlaceholder('91340400MADDK97K4X')).toHaveCount(0);
    // USt-IdNr 字段出现
    await expect(page.getByPlaceholder('IT12345678901')).toBeVisible();
    // 主体类型切换隐藏（境外客户无需中文身份证/信用代码二选一）
    await expect(page.getByRole('button', { name: '个人' })).toHaveCount(0);
  });

  test('意大利税号通过校验，USt-IdNr 必填控制下一步，走通到信息确认', async ({ page }) => {
    await page.goto('/signup/packaging', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: '委托方信息' })).toBeVisible({ timeout: 10000 });

    // 选意大利
    await page.locator('select').first().selectOption('IT');

    // 填写委托方信息（境外税号 + 意大利地址）
    await page.getByPlaceholder('福瑞笛（上海）信息咨询有限公司').fill(TEST.companyZh);
    await page.getByPlaceholder('FREDDY (SHANGHAI) INFORMATION CONSULTING LTD.').fill(TEST.companyEn);
    await page.getByPlaceholder('中国上海市浦东新区陆家嘴环路88号金茂大厦58层5808室').fill(TEST.addressZh);
    await page.getByPlaceholder('Room 5808, 58th Floor, Jin Mao Tower, 88 Lujiazui Ring Road, Shanghai, China').fill(TEST.addressEn);
    await page.getByPlaceholder('DRBRND61M22B925M').fill(TEST.tax);   // 意大利税号（宽松校验应通过）
    await page.getByPlaceholder('冯巩').fill(TEST.legalZh);
    await page.getByPlaceholder('Gong Feng').fill(TEST.legalEn);
    await page.getByPlaceholder('潘长江').fill(TEST.contactZh);
    await page.getByPlaceholder('Changjiang Pan').fill(TEST.contactEn);
    await page.getByPlaceholder('139xxxxxxxx').fill(TEST.phone);
    await page.getByPlaceholder('freddy_epr').fill(TEST.wechat);
    await page.getByPlaceholder('your@email.com').fill(TEST.email);

    // USt-IdNr 留空 → 下一步按钮禁用（必填）
    await expect(page.getByRole('button', { name: /下一步/ })).toBeDisabled();

    // 填入 USt-IdNr → 下一步按钮启用
    await page.getByPlaceholder('IT12345678901').fill(TEST.vat);
    await expect(page.getByRole('button', { name: /下一步/ })).toBeEnabled();

    // 下一步 → 包装预申报
    await page.getByRole('button', { name: /下一步/ }).click();
    await expect(page.getByRole('heading', { name: '包装预申报' })).toBeVisible({ timeout: 5000 });

    // 塑料/Kunststoffe 行（第5个材料）填 500 kg
    await page.getByRole('spinbutton').nth(4).fill('500');
    await page.getByRole('button', { name: /下一步/ }).click();

    // 信息确认：应显示国家「意大利」、境外税号、USt-IdNr
    await expect(page.getByRole('heading', { name: '信息确认' })).toBeVisible({ timeout: 5000 });
    const body = await page.locator('body').textContent();
    expect(body).toContain('意大利');
    expect(body).toContain(TEST.tax);
    expect(body).toContain(TEST.vat);
  });

});

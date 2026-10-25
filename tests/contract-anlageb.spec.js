// P0 — 合同生成附件B数据表验证（针对 {packaging_rows} 占位符修复）
import { test, expect } from '@playwright/test';
import mammoth from 'mammoth';

const ts = Date.now();

test('生成合同附件B包含包装明细数据', async ({ request }) => {
  // 1. 创建合同（带一条包装明细：塑料 B2C 500kg）
  const resp = await request.post('/api/contracts', {
    data: {
      service_type: 'packaging',
      company_name: 'E2E附件B验证公司',
      company_name_en: 'E2E AnlageB Verify Co',
      registered_address: '测试注册地址 1 号',
      registered_address_en: 'Test Addr 1',
      uscc: '91310000E2E',
      legal_representative: '测试法人',
      legal_representative_en: 'Test Legal Rep',
      contact_person: '测试联系人',
      contact_person_en: 'Test Contact',
      contact_email: `e2e-anlageb-${ts}@example.com`,
      contact_phone: '139' + String(ts).slice(-8),
      wechat_id: 'e2e_anlageb',
      tier: 'basic',
      packaging_items: [
        { material_type: 'plastics', category: 'B2C', example: 'E2E测试产品', estimated_kg: 500 },
      ],
    },
  });

  expect(resp.status(), `创建合同失败: ${await resp.text()}`).toBe(201);
  const body = await resp.json();
  expect(body.download_url, '合同创建成功但未返回 download_url（预览生成可能失败）').toBeTruthy();

  // 2. 下载生成的合同 DOCX（/projects/generated 公开静态服务，无需鉴权）
  const dl = await request.get(body.download_url);
  expect(dl.status(), `下载合同失败: ${body.download_url}`).toBe(200);
  const buffer = await dl.body();
  expect(buffer.length).toBeGreaterThan(1000);

  // 3. 提取文本，验证附件B数据表已正确填充
  const extracted = await mammoth.extractRawText({ buffer });
  const text = extracted.value;

  // 附件B表头
  expect(text, '缺少附件B表头').toContain('Materialfraktion');
  expect(text).toContain('材料类别');

  // 附件B数据行：材料 / 类别 / 数量 / 示例 四项都应出现
  expect(text, '附件B缺少材料 plastics').toContain('plastics');
  expect(text, '附件B缺少类别 B2C').toContain('B2C');
  expect(text, '附件B缺少数量 500').toContain('500');
  expect(text, '附件B缺少示例 E2E测试产品').toContain('E2E测试产品');
});

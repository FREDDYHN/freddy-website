// ===== Multi-step form navigation =====
let currentStep = 1;
const totalSteps = 4;

function nextStep(n) {
  // Hide all steps
  for (let i = 1; i <= totalSteps; i++) {
    const el = document.getElementById('formStep' + i);
    if (el) el.style.display = 'none';
  }
  // Show target
  const target = document.getElementById('formStep' + n);
  if (!target) return;
  target.style.display = '';
  currentStep = n;

  // Update step indicators
  for (let i = 1; i <= totalSteps; i++) {
    const stepEl = document.getElementById('step' + i);
    if (stepEl) {
      stepEl.classList.remove('active', 'done');
      if (i < n) stepEl.classList.add('done');
      if (i === n) stepEl.classList.add('active');
    }
  }

  // Generate summary on step 4
  if (n === 4) generateSummary();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== Show/hide battery fields =====
document.addEventListener('DOMContentLoaded', () => {
  const hasBattery = document.getElementById('hasBattery');
  if (hasBattery) {
    hasBattery.addEventListener('change', () => {
      document.getElementById('batteryWeightGroup').style.display =
        hasBattery.value === 'yes' ? '' : 'none';
    });
  }
});

// ===== Generate summary =====
function generateSummary() {
  const getVal = (id) => document.getElementById(id)?.value || '-';
  const services = [];
  document.querySelectorAll('input[name="service"]:checked').forEach(cb => {
    services.push(cb.value === 'weee' ? 'WEEE 电子电气' : '电池法 BattG');
  });

  const html = `
    <p><strong>申报服务：</strong>${services.join(' + ') || '未选择'}</p>
    <p><strong>商标名称：</strong>${getVal('brandName')}</p>
    <p><strong>设备功能：</strong>${getVal('deviceFunction')}</p>
    <p><strong>包含电池：</strong>${getVal('hasBattery') === 'yes' ? '是' : getVal('hasBattery') === 'no' ? '否' : '-'}</p>
    <hr style="margin:12px 0;border-color:#e0e0e0;">
    <p><strong>企业全称：</strong>${getVal('companyName')}</p>
    <p><strong>地址：</strong>${getVal('street')}, ${getVal('postalCode')} ${getVal('city')}, ${getVal('country')}</p>
    <p><strong>电子邮箱：</strong>${getVal('email')}</p>
    <p><strong>税号：</strong>${getVal('taxId')}</p>
    <p><strong>授权代表人：</strong>${getVal('repPerson')}</p>
    <p><strong>设备类型：</strong>${getVal('deviceType')}</p>
    <p><strong>年投放重量：</strong>${getVal('deviceWeight')} kg</p>
  `;
  document.getElementById('summaryContent').innerHTML = html;
}

// ===== Form submission =====
document.getElementById('registerForm').addEventListener('submit', function(e) {
  e.preventDefault();

  if (!document.getElementById('agreeTerms').checked) {
    alert('请先勾选确认信息。');
    return;
  }

  // Collect all data
  const formData = {
    services: [],
    gerätebeschreibung: {},
    stammdatenblatt: {},
    deviceInfo: {},
    submittedAt: new Date().toISOString(),
  };

  document.querySelectorAll('input[name="service"]:checked').forEach(cb => {
    formData.services.push(cb.value);
  });

  formData.gerätebeschreibung = {
    brandName: document.getElementById('brandName')?.value,
    brandPhoto: document.getElementById('brandPhoto')?.value,
    techData: document.getElementById('techData')?.value,
    deviceFunction: document.getElementById('deviceFunction')?.value,
    hasBattery: document.getElementById('hasBattery')?.value,
    batteryOver4kg: document.getElementById('batteryOver4kg')?.value,
    batteryPhoto: document.getElementById('batteryPhoto')?.value,
  };

  formData.stammdatenblatt = {
    companyName: document.getElementById('companyName')?.value,
    street: document.getElementById('street')?.value,
    postalCode: document.getElementById('postalCode')?.value,
    city: document.getElementById('city')?.value,
    country: document.getElementById('country')?.value,
    phone: document.getElementById('phone')?.value,
    fax: document.getElementById('fax')?.value,
    email: document.getElementById('email')?.value,
    taxId: document.getElementById('taxId')?.value,
    repPerson: document.getElementById('repPerson')?.value,
    contactPerson: document.getElementById('contactPerson')?.value,
    contactEmail: document.getElementById('contactEmail')?.value,
    contactPhone: document.getElementById('contactPhone')?.value,
    billingEmail: document.getElementById('billingEmail')?.value,
  };

  formData.deviceInfo = {
    deviceType: document.getElementById('deviceType')?.value,
    deviceBrand: document.getElementById('deviceBrand')?.value,
    deviceWeight: document.getElementById('deviceWeight')?.value,
  };

  // For now: generate mailto link + copy to clipboard
  const subject = encodeURIComponent('【福瑞笛】WEEE/电池法注册申报');
  const body = encodeURIComponent(JSON.stringify(formData, null, 2));

  // Also show a success message
  document.getElementById('formStep4').innerHTML = `
    <div style="font-size:4rem;margin-bottom:16px;">✅</div>
    <h3 style="margin-bottom:12px;">提交成功！</h3>
    <p style="color:var(--color-text-light);margin-bottom:24px;">
      您的申报数据已准备好。由于自动发送功能开发中，请通过以下方式发送：
    </p>
    <div style="background:var(--color-bg);padding:24px;border-radius:8px;margin-bottom:24px;text-align:left;">
      <p><strong>方式一：</strong>点击下方按钮自动打开邮件客户端</p>
      <a href="mailto:zifeng.qian@outlook.com?subject=${subject}&body=${body}"
         class="btn btn-accent" style="margin:12px 0;">📧 打开邮件发送</a>
      <p style="margin-top:16px;"><strong>方式二：</strong>复制下方数据</p>
      <textarea readonly style="width:100%;height:200px;font-family:monospace;font-size:0.8rem;padding:12px;border:1px solid var(--color-border);border-radius:4px;"
        onclick="this.select()">${JSON.stringify(formData, null, 2)}</textarea>
    </div>
    <p style="color:var(--color-text-muted);font-size:0.85rem;">
      接收邮箱：zifeng.qian@outlook.com<br>
      福瑞笛收到信息后将尽快处理您的注册申请。
    </p>
    <a href="/pages/forms.html" class="btn btn-outline" style="margin-top:16px;">提交新的申报 →</a>
  `;

  window.scrollTo({ top: 0, behavior: 'smooth' });
});

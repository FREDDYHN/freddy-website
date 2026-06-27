export default function Privacy() {
  return (
    <div>
      <section className="text-white text-center py-14 px-4" style={{ background: 'linear-gradient(135deg, #3d5a48, #527a60, #3d5a48)' }}>
        <h1 className="text-2xl font-extrabold">隐私政策</h1>
        <p className="text-sm text-white/60 mt-1">Datenschutzerklärung / Privacy Policy</p>
      </section>
      <section className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white border border-gray-100 rounded-lg p-6 md:p-8 text-sm leading-relaxed text-gray-600 space-y-5">
          <p>最后更新日期：2026年6月</p>

          <h2 className="text-lg font-bold text-primary">1. 总则</h2>
          <p>福瑞笛（上海）信息咨询有限公司淮南分公司（以下简称"FREDDY"或"我们"）重视您的个人信息保护。本隐私政策适用于 www.freddy-epr.com 网站及 FREDDY 提供的德国跨境合规服务。我们依据《中华人民共和国个人信息保护法》及欧盟《通用数据保护条例》(GDPR) 处理您的个人数据。</p>

          <h2 className="text-lg font-bold text-primary">2. 我们收集的信息</h2>
          <p>为向您提供德国包装法、WEEE、电池法的授权代表签约服务，我们可能收集以下信息：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>公司信息：</strong>公司名称（中/英文）、注册地址、统一社会信用代码/税号</li>
            <li><strong>联系人信息：</strong>联系人姓名、电子邮箱、手机号码、微信号</li>
            <li><strong>法定代表人信息：</strong>法定代表人姓名</li>
            <li><strong>产品数据：</strong>包装材料类型及数量、电子电气设备类别及品牌数量、电池品牌数量</li>
            <li><strong>合同数据：</strong>授权代表合同内容、签署信息、付款记录</li>
          </ul>

          <h2 className="text-lg font-bold text-primary">3. 信息使用目的</h2>
          <p>我们收集的信息仅用于以下目的：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>生成德国授权代表合同（Bevollmächtigungsvertrag）及服务合同</li>
            <li>将必要信息提交至德国授权代表（LIVANTO GmbH / WEEE Return GmbH）以完成法定注册</li>
            <li>向德国主管机构（ZSVR、Stiftung EAR、UBA）提交合规申报数据</li>
            <li>处理合同相关的支付、发票及客户服务</li>
            <li>发送合规提醒（年报截止日期、合同续期等）</li>
          </ul>

          <h2 className="text-lg font-bold text-primary">4. 数据跨境传输</h2>
          <p>您的部分数据（公司名称、产品数据）将传输至德国授权代表 LIVANTO GmbH 及 WEEE Return GmbH，用于履行德国法定合规义务。数据传输基于欧盟标准合同条款 (SCC) 及 GDPR 第49条第1款(a)项的明确同意。您可通过书面通知随时撤回该同意。</p>

          <h2 className="text-lg font-bold text-primary">5. 数据存储与安全</h2>
          <p>您的数据存储于阿里云服务器（德国法兰克福节点），采用行业标准加密措施保护。我们仅在合同有效期内及法定期限内保留您的数据。合同终止后，法定保留期限届满时我们将删除您的数据。</p>

          <h2 className="text-lg font-bold text-primary">6. 您的权利</h2>
          <p>您有权：查阅您的个人数据、更正不准确的数据、要求删除数据（在法定义务允许范围内）、限制数据处理、数据可携权、撤回同意。如需行使上述权利，请联系：<strong>info@freddy-epr.com</strong></p>

          <h2 className="text-lg font-bold text-primary">7. Cookie 与追踪</h2>
          <p>本网站仅使用必要的会话 Cookie 以维持登录状态，不使用第三方追踪、分析或广告 Cookie。</p>

          <h2 className="text-lg font-bold text-primary">8. 政策更新</h2>
          <p>我们可能不时更新本隐私政策。更新版本将在本页面发布，重大变更将通过电子邮件通知。</p>

          <h2 className="text-lg font-bold text-primary">9. 联系方式</h2>
          <p>福瑞笛（上海）信息咨询有限公司淮南分公司<br />邮箱：info@freddy-epr.com</p>
        </div>
      </section>
    </div>
  )
}

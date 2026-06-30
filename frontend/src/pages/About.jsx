export default function About() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-2">关于我们</h1>
      <p className="text-gray-400 mb-10">About FREDDY</p>

      <div className="space-y-10 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-bold mb-4">公司简介</h2>
          <p className="text-gray-600 mb-3">
            福瑞笛（FREDDY）是一家专注中欧跨境合规的服务商，总部位于上海，淮南设有分公司，德国关联公司 LIVANTO GmbH 位于多特蒙德。
            我们帮助中国出口企业应对欧盟日益严格的环保合规要求，涵盖德国包装法（VerpackG）、电子电气设备法（ElektroG / WEEE）和电池法（BattG）。
          </p>
          <p className="text-gray-600">
            自 2025 年欧盟《包装与包装废弃物法规》（PPWR）和碳边境调节机制（CBAM）陆续生效以来，
            中国出口商面临的合规压力急剧增加。福瑞笛正是在这一背景下成立的——我们的使命是让中国工厂的欧盟合规变得简单、透明、可负担。
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">核心优势</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: '德国本土授权', desc: '通过德国关联公司 LIVANTO GmbH 和合作方 WEEE Return GmbH，提供符合 §35(2) VerpackG 和 §6(2) ElektroG 要求的本土授权代表服务。' },
              { title: '全流程中文服务', desc: '从合同签署、数据申报到核查机构对接，全流程中文支持。中国工厂不需要懂德语，我们帮你翻译、解释、代办。' },
              { title: '价格透明', desc: '公开价目表，无隐藏费用。年费制，包含所有法定授权代表义务，客户只需按实际包装/设备数量缴纳回收费用。' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-5">
                <h3 className="font-semibold text-primary mb-2">{item.title}</h3>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">合作资质</h2>
          <div className="bg-gray-50 rounded-lg p-5 space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <span className="text-green-600 font-bold flex-shrink-0">✓</span>
              <div>
                <p className="font-semibold">LIVANTO GmbH</p>
                <p className="text-gray-500">德国注册有限责任公司，多特蒙德地方法院，有权依据 §35(2) VerpackG 担任授权代表。</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-600 font-bold flex-shrink-0">✓</span>
              <div>
                <p className="font-semibold">WEEE Return GmbH</p>
                <p className="text-gray-500">德国注册电子电气设备回收服务商，注册号 HRB 177217（柏林夏洛滕堡地方法院），依据 §6(2) ElektroG 提供 WEEE 合规服务。</p>
                <div className="flex gap-3 mt-1.5">
                  <a href="/wr-hrb.pdf" target="_blank" className="text-[10px] text-primary hover:underline">📄 商业登记摘录</a>
                  <a href="/wr-qualification.pdf" target="_blank" className="text-[10px] text-primary hover:underline">📄 资质证明</a>
                  <a href="/wr-cooperation.pdf" target="_blank" className="text-[10px] text-primary hover:underline">📄 合作协议</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-4">成功案例</h2>
          <p className="text-sm text-gray-500 mb-4">以下为 WEEE Return GmbH 代理完成的 EAR 注册确认函（Registrierungsbescheid），均为真实客户案例。</p>
          <div className="grid md:grid-cols-3 gap-3 text-xs">
            {[
              { name: 'SysMed', doc: 'WEEE', file: 'SysMed WEEE-Registrierungsbescheid.pdf' },
              { name: 'ATT', doc: 'WEEE', file: 'ATTWEEE_Registrierungsbescheid_Elektrogeräte.pdf' },
              { name: 'ATT', doc: '电池法', file: 'ATT电池法_Registrierungsbescheid_Batterien.pdf' },
              { name: 'Laijimi', doc: 'WEEE', file: 'Laijimi_WEEE_Registrierungsbescheid.pdf' },
              { name: 'Laijimi', doc: '电池法', file: 'Laijimi_电池法_Registrierungsbescheid(1).pdf' },
              { name: 'PIZZICS', doc: 'WEEE', file: 'PIZZICS_WEEE_Registrierungsbescheid.pdf' },
              { name: '山西 Guaner', doc: 'WEEE', file: '山西guanerWEEE-Registrierungsbescheid_CANTOBE_Kleingeräte.pdf' },
              { name: '山西 Guaner', doc: '电池法', file: '山西guaner电池法-Registrierungsbescheid_CANTOBE_Gerätebatterien.pdf' },
              { name: '有朵云', doc: 'WEEE', file: '有朵云WEEE_Registrierungsbescheid_Lahoomu_Großgeräte.pdf' },
            ].map((c, i) => (
              <a key={i} href={`/cases/WEEE Return下号文件/${c.file}`} target="_blank"
                className="border border-gray-200 rounded-lg p-3 hover:border-primary hover:bg-primary/5 transition-colors">
                <p className="font-semibold text-gray-700">{c.name}</p>
                <p className="text-gray-400 mt-0.5">{c.doc} · EAR 注册确认函</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

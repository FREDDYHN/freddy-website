import { Link } from 'react-router-dom'

export default function Packaging() {
  const materials = [
    { name: '玻璃 (Glas)', min: '0.02', max: '0.05' },
    { name: '纸/纸板/纸箱 (Papier/Pappe)', min: '0.02', max: '0.15' },
    { name: '黑色金属 (Eisenmetalle)', min: '0.15', max: '0.40' },
    { name: '铝 (Aluminium)', min: '0.15', max: '0.40' },
    { name: '塑料 (Kunststoffe)', min: '0.30', max: '0.80' },
    { name: '复合材料 (Verbunde)', min: '0.20', max: '0.50' },
    { name: '饮料纸盒 (Getränkekarton)', min: '0.15', max: '0.35' },
  ]

  const faqs = [
    { q: '什么是德国包装法 (VerpackG)？', a: '德国包装法规定了在德国市场上销售包装产品的所有生产商、进口商和电商卖家必须履行的包装回收和再生利用义务。自2022年7月起，所有类型的包装（不仅限于面向个人消费者的包装）都必须在LUCID包装品登记处注册。' },
    { q: '2026年8月12日后有什么变化？', a: '欧盟《包装与包装废弃物法规》(PPWR) 2025/40全面生效。所有在德国无分支机构的厂商——包括来自其他欧盟成员国和第三国的厂商——必须指定一名德国本土授权代表。这是强制性要求，不可选择。' },
    { q: 'LIVANTO授权代表帮我做什么？', a: 'LIVANTO GmbH作为您根据§35(2) VerpackG的授权代表，承担除LUCID注册外的全部义务：签订双元系统合同、数据申报、完整性声明（如需要）、运输包装回收组织、官方通信等。您只需自行在LUCID注册，我们会提供中文指南。' },
  ]

  return (
    <div>
      {/* Hero */}
      <section className="packaging-gradient text-white py-16 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">德国包装法 · 授权代表</h1>
        <p className="text-lg text-gray-300 mb-2">Verpackungsgesetz (VerpackG) §35(2) — 本土授权代表服务</p>
        <p className="text-xl font-bold text-accent">€89 / 年起</p>
        <div className="mt-6">
          <Link to="/signup" className="inline-block px-6 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent-light transition-colors">
            立即签约 →
          </Link>
        </div>
      </section>

      {/* What & Who */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { title: '生产商/制造商', desc: '在德国以自己的名称/品牌销售包装产品的企业' },
            { title: '进口商', desc: '将包装产品首次进口到德国市场的企业' },
            { title: '跨境电商卖家', desc: '通过Amazon/Temu等平台向德国消费者发货的卖家' },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-primary mb-2">{c.title}</h3>
              <p className="text-sm text-gray-600">{c.desc}</p>
            </div>
          ))}
        </div>

        {/* Process */}
        <h2 className="text-2xl font-bold text-center mb-8">三步完成包装法合规</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'LUCID 注册', desc: '在ZSVR官网自行注册，获取LUCID注册号。我们提供中文图文指南。' },
            { step: '2', title: '签约授权代表', desc: '在LIVANTO平台填写公司+包装信息，在线签署授权代表合同，支付年费。' },
            { step: '3', title: 'LIVANTO处理合规', desc: '我们在LUCID确认授权→签订双元系统合同→提交年度数据申报。您只需每年2月前报告包装量。' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-3 font-bold">{s.step}</div>
              <h3 className="font-bold mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">双元系统费用参考</h2>
          <p className="text-center text-sm text-gray-500 mb-6">以下为双元系统许可费用（按包装材料重量计费），与授权代表年费分开。具体以实际签约的双元系统价格为准。</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="p-3 text-left">材料类别</th>
                  <th className="p-3 text-right">最低 €/kg</th>
                  <th className="p-3 text-right">最高 €/kg</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="p-3">{m.name}</td>
                    <td className="p-3 text-right">€{m.min}</td>
                    <td className="p-3 text-right">€{m.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* AR Pricing Tiers */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-8">LIVANTO 授权代表服务套餐</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: '基础', price: '€89/年', features: ['核心AR服务', 'LUCID数据申报', '双元系统合同', '官方通信处理'] },
            { name: '标准', price: '€159/年', features: ['基础全部内容', '优先响应 (48h)', '扩展分类咨询', '年度合规简报'], highlight: true },
            { name: '高级', price: '€249/年', features: ['标准全部内容', '完整性声明协调', '专属客户经理', '24h响应时间'] },
          ].map((t, i) => (
            <div key={i} className={`bg-white rounded-xl p-6 shadow-sm border-2 ${t.highlight ? 'border-primary' : 'border-gray-100'} flex flex-col`}>
              <h3 className="text-lg font-bold mb-1">{t.name}</h3>
              <p className="text-2xl font-bold text-primary mb-4">{t.price}</p>
              <ul className="text-sm text-gray-600 space-y-2 flex-1 mb-4">
                {t.features.map((f, j) => <li key={j} className="flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span> {f}</li>)}
              </ul>
              <Link to="/signup" className={`block text-center py-2 rounded-lg font-medium text-sm ${t.highlight ? 'bg-primary text-white' : 'border border-primary text-primary'}`}>
                选择{t.name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">常见问题</h2>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <details key={i} className="bg-gray-50 rounded-lg p-4 cursor-pointer group">
                <summary className="font-medium text-gray-800">{f.q}</summary>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

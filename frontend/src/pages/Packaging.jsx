import { Link } from 'react-router-dom'
import { PACKAGING_MATERIALS, AR_TIERS } from '@shared/constants.js'

const bgDark = '#0f1724'
const cardBg = '#1c2a3a'
const border = '#2a3b50'
const heading = '#e2e8f0'
const body = '#8899aa'
const cyan = '#00b4d8'

export default function Packaging() {
  const materials = PACKAGING_MATERIALS.map(m => ({
    name: m.label, min: m.dualSystemMin.toFixed(2), max: m.dualSystemMax.toFixed(2),
  }))
  const tiers = Object.values(AR_TIERS)

  const faqs = [
    { q: '什么是德国包装法 (VerpackG)？', a: '德国包装法规定了在德国市场上销售包装产品的所有生产商、进口商和电商卖家必须履行的包装回收和再生利用义务。自2022年7月起，所有类型的包装（不仅限于面向个人消费者的包装）都必须在LUCID包装品登记处注册。' },
    { q: '2026年8月12日后有什么变化？', a: '欧盟《包装与包装废弃物法规》(PPWR) 2025/40全面生效。所有在德国无分支机构的厂商必须指定一名德国本土授权代表。这是强制性要求，不可选择。' },
    { q: 'LIVANTO授权代表帮我做什么？', a: 'LIVANTO GmbH作为您根据§35(2) VerpackG的授权代表，承担除LUCID注册外的全部义务：签订双元系统合同、数据申报、完整性声明（如需要）、运输包装回收组织、官方通信等。' },
  ]

  return (
    <div>
      {/* Hero */}
      <section className="py-16 md:py-20 px-4 text-center" style={{ background: bgDark }}>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ color: heading }}>德国包装法 · 授权代表</h1>
        <p className="text-base mb-2" style={{ color: body }}>Verpackungsgesetz (VerpackG) §35(2) — 本土授权代表服务</p>
        <p className="text-xl font-bold" style={{ color: cyan }}>€{AR_TIERS.basic.feeEur} / 年起</p>
        <div className="mt-6">
          <Link to="/signup" className="inline-block px-6 py-3 font-semibold rounded-lg text-sm transition-all"
            style={{ background: cyan, color: '#fff', boxShadow: '0 4px 20px rgba(0,180,216,0.25)' }}>
            立即签约 →
          </Link>
        </div>
      </section>

      {/* Who needs this */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: heading }}>谁需要包装法授权代表？</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: '生产商/制造商', desc: '在德国以自己的名称/品牌销售包装产品的企业' },
            { title: '进口商', desc: '将包装产品首次进口到德国市场的企业' },
            { title: '跨境电商卖家', desc: '通过Amazon/Temu等平台向德国消费者发货的卖家' },
          ].map((c, i) => (
            <div key={i} className="card text-center" style={{ background: cardBg, border: `1px solid ${border}` }}>
              <h3 className="font-bold mb-2" style={{ color: heading }}>{c.title}</h3>
              <p className="text-sm" style={{ color: '#94a3b8' }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="py-16 px-4" style={{ background: '#1a2434' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: heading }}>三步完成包装法合规</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'LUCID 注册', desc: '在ZSVR官网自行注册，获取LUCID注册号。我们提供中文图文指南。' },
              { step: '2', title: '签约授权代表', desc: '在线填写公司+包装信息，签署授权代表合同，支付年费。' },
              { step: '3', title: 'LIVANTO处理合规', desc: '我们在LUCID确认授权→签订双元系统合同→提交年度数据申报。' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 font-bold" style={{ background: cyan, color: '#fff' }}>{s.step}</div>
                <h3 className="font-bold mb-2" style={{ color: heading }}>{s.title}</h3>
                <p className="text-sm" style={{ color: '#94a3b8' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dual System Pricing */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: heading }}>双元系统费用参考</h2>
        <p className="text-center text-sm mb-6" style={{ color: '#94a3b8' }}>以下为双元系统许可费用（按包装材料重量计费），与授权代表年费分开。以实际签约的双元系统价格为准。</p>
        <div className="overflow-x-auto card" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: cyan, borderBottom: `1px solid ${border}` }}>
                <th className="p-3 text-left">材料类别</th>
                <th className="p-3 text-right">最低 €/kg</th>
                <th className="p-3 text-right">最高 €/kg</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m, i) => (
                <tr key={i} className="border-b" style={{ borderColor: border }}>
                  <td className="p-3" style={{ color: heading }}>{m.name}</td>
                  <td className="p-3 text-right" style={{ color: body }}>€{m.min}</td>
                  <td className="p-3 text-right" style={{ color: body }}>€{m.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* AR Pricing Tiers */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: heading }}>LIVANTO 授权代表服务套餐</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t) => {
            const features = t.key === 'basic'
              ? ['核心AR服务', 'LUCID数据申报', '双元系统合同', '官方通信处理']
              : t.key === 'standard'
              ? ['基础全部内容', '优先响应 (48h)', '扩展分类咨询', '年度合规简报']
              : ['标准全部内容', '完整性声明协调', '专属客户经理', '24h响应时间']
            return (
            <div key={t.key} className="card flex flex-col" style={{
              background: cardBg,
              border: `2px solid ${t.featured ? cyan : border}`,
            }}>
              <h3 className="text-lg font-bold mb-1" style={{ color: heading }}>{t.name.split(' ')[0]}</h3>
              <p className="text-2xl font-extrabold mb-4" style={{ color: cyan }}>€{t.feeEur}/年</p>
              <ul className="text-sm space-y-2 flex-1 mb-4" style={{ color: '#94a3b8' }}>
                {features.map((f, j) => <li key={j} className="flex items-start gap-2"><span style={{ color: '#2dd4bf' }}>✓</span> {f}</li>)}
              </ul>
              <Link to="/signup" className={`block text-center py-2 rounded-lg font-semibold text-sm transition-all ${
                t.featured ? '' : ''
              }`} style={t.featured
                ? { background: cyan, color: '#fff' }
                : { background: 'transparent', color: cyan, border: `1px solid ${cyan}` }
              }>
                选择{t.name.split(' ')[0]}
              </Link>
            </div>
          )})}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4" style={{ background: '#1a2434' }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: heading }}>常见问题</h2>
          <div className="space-y-4">
            {faqs.map((f, i) => (
              <details key={i} className="card cursor-pointer" style={{ background: cardBg, border: `1px solid ${border}`, padding: 16 }}>
                <summary className="font-medium" style={{ color: heading }}>{f.q}</summary>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: '#94a3b8' }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

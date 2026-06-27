import { Link } from 'react-router-dom'
import { PACKAGING_MATERIALS, AR_TIERS } from '@shared/constants.js'

export default function Packaging() {
  const materials = PACKAGING_MATERIALS.map(m => ({ name: m.label, min: m.dualSystemMin.toFixed(2), max: m.dualSystemMax.toFixed(2) }))
  const tiers = Object.values(AR_TIERS)
  const faqs = [
    { q: '什么是德国包装法 (VerpackG)？', a: '德国包装法规定在德国市场销售包装产品的所有生产商、进口商和电商卖家必须履行包装回收和再生利用义务。自2022年7月起，所有类型包装均须在LUCID包装品登记处注册。' },
    { q: '2026年8月12日后有什么变化？', a: '欧盟《包装与包装废弃物法规》(PPWR) 2025/40 全面生效。所有在德国无分支机构的厂商必须指定德国本土授权代表，属强制性要求。' },
    { q: 'LIVANTO 授权代表帮我做什么？', a: 'LIVANTO GmbH 作为您依据 §35(2) VerpackG 的授权代表，承担除 LUCID 注册外的全部义务：双元系统合同签订、数据申报、完整性声明、运输包装回收组织、官方通信。' },
  ]

  return (
    <div>
      <section className="text-white text-center py-14 px-4" style={{ background: 'linear-gradient(135deg, #3d5a48, #527a60, #3d5a48)' }}>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6">德国包装法 · 本土授权代表</h1>
        <p className="text-sm text-white/50">依据《德国包装法》第35条第2款 / 欧盟《包装与包装废弃物法规》(PPWR) 2025/40</p>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-center mb-6">授权代表服务套餐</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {tiers.map(t => {
            const feats = t.key === 'basic' ? ['核心 AR 服务', 'LUCID 数据申报', '双元系统合同', '官方通信处理'] : t.key === 'standard' ? ['基础全部内容', '优先响应 (48h)', '扩展分类咨询', '年度合规简报'] : ['标准全部内容', '完整性声明协调', '专属客户经理', '24h 响应']
            return (
              <div key={t.key} className={`bg-white rounded-lg p-5 border-2 flex flex-col ${t.featured ? 'border-primary' : 'border-gray-100'}`}>
                <h3 className="font-bold mb-1">{t.name.split(' ')[0]}</h3>
                <p className="text-2xl font-extrabold text-primary mb-3">€{t.feeEur}/年</p>
                <ul className="text-sm text-gray-500 space-y-1.5 flex-1 mb-4">{feats.map((f, j) => <li key={j} className="flex gap-1.5"><span className="text-green-500">✓</span>{f}</li>)}</ul>
                <Link to="/signup/packaging" className={`block text-center py-2 rounded-md text-sm font-semibold ${t.featured ? 'bg-primary text-white' : 'border border-primary text-primary'}`}>选择{t.name.split(' ')[0]}</Link>
              </div>
            )
          })}
        </div>

        <h2 className="text-xl font-bold text-center mb-8">三步完成包装法合规</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {[{ s: '1', t: 'LUCID 注册', d: '在 ZSVR 官网自行注册获取 LUCID 号，我们提供中文指南' }, { s: '2', t: '签约授权代表', d: '在线填写公司+包装信息，签署授权代表合同，支付年费' }, { s: '3', t: 'LIVANTO 处理合规', d: '确认授权→签订双元系统合同→提交年度数据申报' }].map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold mx-auto mb-3">{s.s}</div>
              <h3 className="font-bold mb-1">{s.t}</h3>
              <p className="text-sm text-gray-500">{s.d}</p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-center mb-6">双元系统费用参考</h2>
        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden mb-12">
          <table className="w-full text-sm">
            <thead><tr className="bg-primary text-white"><th className="p-3 text-left">材料类别</th><th className="p-3 text-right">最低 €/kg</th><th className="p-3 text-right">最高 €/kg</th></tr></thead>
            <tbody>{materials.map((m, i) => <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}><td className="p-3">{m.name}</td><td className="p-3 text-right">€{m.min}</td><td className="p-3 text-right">€{m.max}</td></tr>)}</tbody>
          </table>
        </div>

        <h2 className="text-xl font-bold text-center mb-6">常见问题</h2>
        <div className="space-y-3 max-w-2xl mx-auto">{faqs.map((f, i) => <details key={i} className="bg-white border border-gray-100 rounded-lg p-4"><summary className="font-medium cursor-pointer">{f.q}</summary><p className="mt-2 text-sm text-gray-500">{f.a}</p></details>)}</div>
      </section>
    </div>
  )
}

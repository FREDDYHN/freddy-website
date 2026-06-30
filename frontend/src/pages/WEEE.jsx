import { Link } from 'react-router-dom'
import { WEEE_PRICES, WEEE_STARTING_PRICE } from '@shared/constants.js'

const cats = [
  { id: '1', n: '热交换器', de: 'Wärmeüberträger', ex: '冰箱、空调、冷柜、热泵' },
  { id: '2', n: '显示屏/屏幕', de: 'Bildschirme', ex: '电视、显示器 (>100cm²)' },
  { id: '3', n: '灯具', de: 'Lampen', ex: 'LED灯、荧光灯、节能灯' },
  { id: '4', n: '大型设备', de: 'Großgeräte', ex: '洗衣机、烤箱、复印机 (>50cm)' },
  { id: '5', n: '小型设备', de: 'Kleingeräte', ex: '手机、相机、吹风机 (<50cm)' },
  { id: '6', n: '小型IT设备', de: 'Kleine IT-Geräte', ex: '路由器、键盘、移动硬盘' },
]

const tiers = [
  { key: 'basic', name: '基础', price: WEEE_STARTING_PRICE - 20, feat: ['核心 WEEE 授权代表', 'EAR 注册', '年度数据申报', '官方通信处理'] },
  { key: 'standard', name: '标准', price: WEEE_STARTING_PRICE, feat: ['基础全部内容', '担保确认 (Garantie)', '多品牌 / 多类别', '回收处置方案'] },
  { key: 'premium', name: '高级', price: WEEE_STARTING_PRICE + 100, feat: ['标准全部内容', '优先处理 (48h)', '专属客户经理', '合规审计支持'] },
]

const fees = [
  { k: 'WEEE 回收基本费', v: '€'+WEEE_PRICES.baseFee.toFixed(2) },
  { k: '破产担保证明', v: '€'+WEEE_PRICES.insolvencyFee.toFixed(2) },
  { k: 'EAR 季度费 (每品牌)', v: '€'+WEEE_PRICES.earQuarterly.toFixed(2) },
  { k: 'EAR 品牌注册费', v: '€'+WEEE_PRICES.earBrandReg.toFixed(2) },
  { k: '额外设备类别 (每类)', v: '€'+WEEE_PRICES.extraCategory.toFixed(2) },
  { k: '额外品牌 (每品牌)', v: '€'+WEEE_PRICES.extraBrand.toFixed(2) },
]

const faqs = [
  { q: '什么是德国 WEEE (ElektroG)？', a: '德国《电子电气设备法》(ElektroG) 要求所有在德国市场销售电子电气设备的生产商和进口商必须在 EAR 基金会完成注册，并承担产品废弃后的回收处理义务。非欧盟生产商必须指定德国本土授权代表才能完成注册。' },
  { q: '谁必须注册 WEEE？', a: '任何向德国终端消费者销售电子电气设备的制造商、进口商或跨境电商卖家，无论公司注册地在哪，都必须遵守 ElektroG。覆盖范围包括自有品牌产品和贴牌代工产品。' },
  { q: 'WEEE Return GmbH 帮我做什么？', a: 'WEEE Return GmbH 作为您依据 §6(2) ElektroG 的授权代表，负责 EAR 注册、担保确认、年度数据申报、回收处置方案制定，以及与 UBA（联邦环境署）的全部官方沟通。' },
  { q: '注册需要多长时间？', a: 'EAR 注册通常需要 4-12 周。我们建议至少在计划上市前 3 个月启动注册流程。WEEE Return 将全程跟进加快处理。' },
]

export default function WEEE() {
  return (
    <div>
      <section className="text-white text-center py-14 px-4" style={{ background: 'linear-gradient(135deg, #4a5d50, #5f7565, #4a5d50)' }}>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6">德国 WEEE · 电子电气设备法</h1>
        <p className="text-sm text-white/50">Elektro- und Elektronikgerätegesetz (ElektroG) — 六大设备类别全覆盖</p>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-xl font-bold text-center mb-6">授权代表服务套餐</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {tiers.map(t => (
            <div key={t.key} className="bg-white rounded-lg border border-gray-100 flex flex-col overflow-hidden">
              <div className="bg-primary text-white text-center py-4"><h3 className="font-bold text-lg">{t.name}套餐</h3></div>
              <div className="p-5 flex flex-col flex-1">
                <ul className="text-sm text-gray-500 space-y-1.5 flex-1 mb-3">{t.feat.map((f, j) => <li key={j} className="flex gap-1.5"><span className="text-green-500">✓</span>{f}</li>)}</ul>
                <p className="text-2xl font-extrabold text-primary mb-3 text-right">€{t.price}<span className="text-sm text-gray-400 font-normal">/年起</span></p>
                <Link to="/signup/weee" className="block text-center py-2 rounded-md text-sm font-semibold border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors">选择</Link>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-center mb-8">四步完成 WEEE 合规</h2>
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {[
            { s: '1', t: 'EAR 注册', d: '在 EAR 基金会完成公司及品牌注册' },
            { s: '2', t: '签约授权代表', d: '指定 WEEE Return GmbH 为授权代表' },
            { s: '3', t: '担保确认', d: '提交破产担保证明，EAR 确认注册' },
            { s: '4', t: '年度申报', d: '每年提交设备投放量数据，WEEE Return 全程代理' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold mx-auto mb-3">{s.s}</div>
              <h3 className="font-bold mb-1">{s.t}</h3>
              <p className="text-sm text-gray-500">{s.d}</p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-center mb-6">六大设备类别</h2>
        <div className="grid md:grid-cols-2 gap-3 mb-12">
          {cats.map(c => (
            <div key={c.id} className="bg-white border border-gray-100 rounded-lg p-4 flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">{c.id}</span>
              <div>
                <h3 className="font-bold text-sm">{c.n} <span className="text-xs text-gray-400 font-normal">{c.de}</span></h3>
                <p className="text-xs text-gray-500 mt-0.5">{c.ex}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-center mb-6">费用参考</h2>
        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden mb-12">
          <table className="w-full text-sm">
            <thead><tr className="bg-primary text-white"><th className="p-3 text-left">项目</th><th className="p-3 text-right">金额</th></tr></thead>
            <tbody>{fees.map((f, i) => <tr key={i} className={i%2?'bg-gray-50':''}><td className="p-3">{f.k}</td><td className="p-3 text-right font-medium">{f.v}</td></tr>)}</tbody>
          </table>
          <p className="text-xs text-gray-400 p-3">* 首年另有 €{WEEE_PRICES.authFirstYear.toFixed(2)} EAR 一次性授权费。</p>
        </div>

        <h2 className="text-xl font-bold text-center mb-6">常见问题</h2>
        <div className="space-y-3 max-w-2xl mx-auto">{faqs.map((f, i) => <details key={i} className="bg-white border border-gray-100 rounded-lg p-4"><summary className="font-medium cursor-pointer">{f.q}</summary><p className="mt-2 text-sm text-gray-500">{f.a}</p></details>)}</div>
      </section>
    </div>
  )
}

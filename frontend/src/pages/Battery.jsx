import { Link } from 'react-router-dom'
import { BATTERY_PRICES, BATTERY_STARTING_PRICE } from '@shared/constants.js'

const tiers = [
  { key: 'basic', name: '基础', price: BATTERY_STARTING_PRICE - 30, feat: ['核心电池法授权代表', 'EAR 注册', '年度数据申报', '官方通信处理'] },
  { key: 'standard', name: '标准', price: BATTERY_STARTING_PRICE, feat: ['基础全部内容', '回收系统参与', '多品牌支持', '合规报告'] },
  { key: 'premium', name: '高级', price: BATTERY_STARTING_PRICE + 100, feat: ['标准全部内容', '优先处理 (48h)', '专属客户经理', '法规变更通知'] },
]

const fees = [
  { k: '电池法注册基本费', v: '€'+BATTERY_PRICES.baseFee.toFixed(2) },
  { k: '回收系统参与费', v: '€'+BATTERY_PRICES.takebackFee.toFixed(2) },
  { k: 'EAR 会员年费', v: '€'+BATTERY_PRICES.earMembership.toFixed(2) },
  { k: 'EAR 季度费 (每品牌)', v: '€'+BATTERY_PRICES.earQuarterly.toFixed(2) },
  { k: 'EAR 品牌注册费', v: '€'+BATTERY_PRICES.earBrandReg.toFixed(2) },
  { k: '额外品牌 (每品牌)', v: '€'+BATTERY_PRICES.extraBrand.toFixed(2) },
]

const faqs = [
  { q: '什么是德国电池法 (BattG)？', a: '德国《电池法》(Batteriegesetz) 规范所有类型电池在德国市场的投放、回收和处置。自2021年起扩展至设备电池、工业电池和汽车电池。生产商须在 UBA 下属 EAR 基金会完成注册。' },
  { q: '谁必须遵守电池法？', a: '任何在德国市场投放电池或含电池产品的制造商、进口商和电商卖家。包括：以自有品牌销售电池、产品内含电池（如玩具、电子设备）、通过跨境电商平台向德国发货。' },
  { q: 'WEEE Return GmbH 帮我做什么？', a: 'WEEE Return GmbH 作为授权代表，负责 EAR 注册、回收系统参与、年度申报、担保确认及全部官方沟通。您只需提供公司和产品信息，其余我们全包。' },
  { q: '电池法与 WEEE 可以一起办理吗？', a: '可以。电池法与 WEEE 均由 EAR 基金会管理，可同步注册。我们提供 WEEE + 电池法联合签约方案，一次提交，统一管理。' },
]

export default function Battery() {
  return (
    <div>
      <section className="text-white text-center py-14 px-4" style={{ background: 'linear-gradient(135deg, #4a5d50, #5f7565, #4a5d50)' }}>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6">德国电池法 · BattG</h1>
        <p className="text-sm text-white/50">Batteriegesetz — 电池及含电池产品合规全覆盖</p>
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
                <Link to="/signup/battery" className="block text-center py-2 rounded-md text-sm font-semibold border-2 border-primary text-primary hover:bg-primary hover:text-white transition-colors">选择</Link>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-center mb-8">四步完成电池法合规</h2>
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          {[
            { s: '1', t: 'EAR 注册', d: '在 EAR 基金会完成公司及品牌注册' },
            { s: '2', t: '签约授权代表', d: '指定 WEEE Return GmbH 为授权代表' },
            { s: '3', t: '回收系统参与', d: '加入回收系统，提交担保' },
            { s: '4', t: '年度申报', d: '每年提交投放量数据，授权代表全程代理' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold mx-auto mb-3">{s.s}</div>
              <h3 className="font-bold mb-1">{s.t}</h3>
              <p className="text-sm text-gray-500">{s.d}</p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-center mb-6">谁需要注册？</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {[
            { t: '电池制造商', d: '以自身品牌在德国市场销售电池' },
            { t: '含电池产品卖家', d: '产品含电池（玩具、电子设备等）' },
            { t: '跨境电商卖家', d: '通过平台向德国终端消费者发货' },
          ].map((c, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-lg p-5 text-center">
              <p className="font-bold text-primary mb-2">{c.t}</p>
              <p className="text-xs text-gray-500">{c.d}</p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold text-center mb-6">费用参考</h2>
        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden mb-12">
          <table className="w-full text-sm">
            <thead><tr className="bg-primary text-white"><th className="p-3 text-left">项目</th><th className="p-3 text-right">金额</th></tr></thead>
            <tbody>{fees.map((f, i) => <tr key={i} className={i%2?'bg-gray-50':''}><td className="p-3">{f.k}</td><td className="p-3 text-right font-medium">{f.v}</td></tr>)}</tbody>
          </table>
          <p className="text-xs text-gray-400 p-3">* 首年另有 €{BATTERY_PRICES.authFirstYear.toFixed(2)} EAR 一次性授权费。</p>
        </div>

        <h2 className="text-xl font-bold text-center mb-6">常见问题</h2>
        <div className="space-y-3 max-w-2xl mx-auto">{faqs.map((f, i) => <details key={i} className="bg-white border border-gray-100 rounded-lg p-4"><summary className="font-medium cursor-pointer">{f.q}</summary><p className="mt-2 text-sm text-gray-500">{f.a}</p></details>)}</div>
      </section>
    </div>
  )
}

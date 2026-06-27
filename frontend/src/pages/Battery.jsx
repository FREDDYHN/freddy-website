import { Link } from 'react-router-dom'
import { BATTERY_STARTING_PRICE, BATTERY_PRICES } from '@shared/constants.js'

export default function Battery() {
  return (
    <div>
      <section className="text-white text-center py-14 px-4" style={{ background: 'linear-gradient(135deg, #1a3a5c, #2c5f8a)' }}>
        <h1 className="text-2xl md:text-3xl font-extrabold mb-1">德国电池法 BattG</h1>
        <p className="text-sm text-white/60 mb-1">Batteriegesetz — 电池及含电池产品合规</p>
        <p className="text-xl font-bold mb-6">€{BATTERY_STARTING_PRICE}/年起</p>
        <Link to="/signup?type=battery" className="inline-block px-7 py-3 bg-white text-primary text-sm font-bold rounded-lg hover:-translate-y-0.5 transition-all">在线签约电池法 →</Link>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white border border-gray-100 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold mb-3">什么是电池法？</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">德国《电池法》(BattG) 规范所有类型电池在德国市场的投放、回收和处置。自2021年起扩展至设备电池、工业电池和汽车电池。生产商须在 UBA 下属 EAR 基金会完成注册。</p>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            {[{ t: '电池制造商', d: '以自身品牌在德销售电池' }, { t: '含电池产品卖家', d: '产品含电池（玩具、电子设备）' }, { t: '跨境电商', d: '通过平台向德国发货' }].map((c, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3"><p className="font-bold text-primary">{c.t}</p><p className="text-xs text-gray-500 mt-0.5">{c.d}</p></div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">费用参考</h2>
          <div className="space-y-2 text-sm">
            {[
              ['注册基本费', '€' + BATTERY_PRICES.baseFee.toFixed(2)],
              ['回收系统参与费', '€' + BATTERY_PRICES.takebackFee.toFixed(2)],
              ['EAR 会员年费', '€' + BATTERY_PRICES.earMembership.toFixed(2)],
              ['额外品牌 (每品牌)', '€' + BATTERY_PRICES.extraBrand.toFixed(2)],
            ].map(([k, v], i) => (
              <div key={i} className="flex justify-between py-2 border-b border-gray-50"><span className="text-gray-500">{k}</span><span className="font-medium">{v}</span></div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">* 首年另有 €{BATTERY_PRICES.authFirstYear.toFixed(2)} 的 EAR 一次性授权费。</p>
        </div>
      </section>
    </div>
  )
}

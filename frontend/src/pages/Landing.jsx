import { Link } from 'react-router-dom'
import { AR_TIERS, BATTERY_STARTING_PRICE, WEEE_STARTING_PRICE } from '@shared/constants.js'

const services = [
  { to: '/packaging', title: '包装法授权代表', price: `€${AR_TIERS.basic.feeEur}`, period: '/ 年', tag: '2026 强制', desc: 'LIVANTO GmbH 担任授权代表，承担双元系统对接、LUCID 数据申报、完整性声明及官方通信等全部法定义务。' },
  { to: '/battery', title: '德国电池法 BattG', price: `€${BATTERY_STARTING_PRICE}`, period: '/ 年起', desc: 'WEEE Return GmbH 担任授权代表，负责 EAR 注册、回收处置方案、年度申报及与德国联邦环境局 (UBA) 的全部官方沟通。' },
  { to: '/weee', title: '德国 WEEE 电子电气法', price: `€${WEEE_STARTING_PRICE}`, period: '/ 年起', tag: '6 大类别', desc: 'WEEE Return GmbH 担任授权代表，覆盖全部 6 个设备类别，承担 EAR 注册、担保确认及年度数据申报全流程。' },
]

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="text-white text-center py-14 md:py-16 px-4" style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2c5f8a 100%)' }}>
        <h1 className="text-2xl md:text-3xl font-extrabold mb-2 tracking-tight">德国跨境合规 · 一站式解决方案</h1>
        <p className="text-sm md:text-base mb-7 max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.7)' }}>
          包装法 · WEEE 电子电气法 · 电池法 BattG — 德国本土授权代表，从签约到申报全闭环
        </p>
        <Link to="/signup" className="inline-flex items-center gap-1.5 px-7 py-3 rounded-lg text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: '#fff', color: '#1a3a5c' }}>
          立即免费签约 →
        </Link>
      </section>

      {/* Services */}
      <section className="py-10 md:py-12 px-4" style={{ background: '#f8fafc' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-5">
            {services.map(s => (
              <Link key={s.to} to={s.to}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden no-underline text-inherit transition-all hover:shadow-lg hover:-translate-y-0.5 flex flex-col">
                <div className="p-5 pb-4 text-white" style={{ background: '#1a3a5c' }}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-base">{s.title}</h3>
                    {s.tag && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.18)' }}>{s.tag}</span>}
                  </div>
                  <p className="text-2xl font-extrabold">{s.price}<span className="text-sm font-normal opacity-60 ml-0.5">{s.period}</span></p>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">授权代表职责</p>
                  <p className="text-[13px] text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

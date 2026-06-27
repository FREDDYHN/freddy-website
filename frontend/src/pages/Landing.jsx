import { Link } from 'react-router-dom'
import { AR_TIERS, BATTERY_STARTING_PRICE, WEEE_STARTING_PRICE } from '@shared/constants.js'

const cards = [
  { to: '/packaging', title: '包装法授权代表', tag: '2026 强制', price: `€${AR_TIERS.basic.feeEur}`, period: '/ 年', desc: 'LIVANTO GmbH 担任授权代表，承担双元系统对接、LUCID 数据申报、完整性声明及官方通信等全部法定义务。' },
  { to: '/battery',   title: '德国电池法 BattG',                    price: `€${BATTERY_STARTING_PRICE}`, period: '/ 年起', desc: 'WEEE Return GmbH 担任授权代表，负责 EAR 注册、回收处置方案、年度申报及与 UBA 的全部官方沟通。' },
  { to: '/weee',      title: '德国 WEEE 电子电气法', tag: '6 大类别', price: `€${WEEE_STARTING_PRICE}`, period: '/ 年起', desc: 'WEEE Return GmbH 担任授权代表，覆盖全部 6 个设备类别，承担 EAR 注册、担保确认及年度数据申报全流程。' },
]

export default function Landing() {
  return (
    <div>
      <section className="text-white text-center py-14 px-4" style={{ background: 'linear-gradient(135deg, #3d5a48 0%, #527a60 50%, #3d5a48 100%)' }}>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">德国跨境合规 · 一站式解决方案</h1>
        <p className="text-sm md:text-base max-w-lg mx-auto text-white/70">包装法 · WEEE 电子电气法 · 电池法 BattG — 德国本土授权代表，从签约到申报全闭环</p>
      </section>

      <section className="py-10 px-4" style={{background:'#f4f2ef'}}>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5">
          {cards.map(c => (
            <Link key={c.to} to={c.to} className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="bg-primary text-white p-5 pb-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-base">{c.title}</h3>
                  {c.tag && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20">{c.tag}</span>}
                </div>
                <p className="text-2xl font-extrabold" style={{ color: '#c8a44e' }}>{c.price}<span className="text-sm font-normal text-white/50 ml-0.5">{c.period}</span></p>
              </div>
              <div className="p-4 flex-1">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">授权代表职责</p>
                <p className="text-[13px] text-gray-500 leading-relaxed">{c.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

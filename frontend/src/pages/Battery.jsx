import { Link } from 'react-router-dom'
import { BATTERY_STARTING_PRICE } from '@shared/constants.js'

const bgDark = '#0f1724'
const cardBg = '#1c2a3a'
const border = '#2a3b50'
const heading = '#e2e8f0'
const body = '#8899aa'
const cyan = '#00b4d8'
const orange = '#f59e0b'

export default function Battery() {
  return (
    <div>
      <section className="py-16 md:py-20 px-4 text-center" style={{ background: bgDark }}>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ color: heading }}>德国电池法 BattG</h1>
        <p className="text-base mb-2" style={{ color: body }}>Batteriegesetz — 电池及含电池产品合规</p>
        <p className="text-xl font-bold mb-6" style={{ color: orange }}>€{BATTERY_STARTING_PRICE}/年起</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/signup?type=battery" className="px-6 py-3 font-semibold rounded-lg text-sm transition-all"
            style={{ background: cyan, color: '#fff', boxShadow: '0 4px 20px rgba(0,180,216,0.25)' }}>在线签约电池法 →</Link>
          <Link to="/calculator" className="px-6 py-3 rounded-lg font-semibold text-sm"
            style={{ border: `1px solid rgba(0,180,216,0.5)`, color: cyan }}>费用计算器 →</Link>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="card mb-8" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: heading }}>什么是电池法？</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#94a3b8' }}>
            德国《电池法》(BattG) 规范了所有类型电池在德国市场上的投放、回收和处置。自2021年起适用范围扩展至所有类型的电池——包括设备电池、工业电池和汽车电池。生产商必须在德国联邦环境局 (UBA) 的EAR基金会完成注册。
          </p>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {[
              { title: '电池制造商', desc: '在德国以自己的品牌销售电池' },
              { title: '含电池产品卖家', desc: '产品中包含电池（如玩具、电子设备）' },
              { title: '跨境电商', desc: '通过Amazon/Temu等平台向德国发货' },
            ].map((c, i) => (
              <div key={i} className="p-4 rounded-lg text-center" style={{ background: '#0f1724', border: `1px solid ${border}` }}>
                <h3 className="font-bold mb-1 text-sm" style={{ color: heading }}>{c.title}</h3>
                <p className="text-xs" style={{ color: '#94a3b8' }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: heading }}>合规要求</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'EAR 注册', desc: '在EAR基金会完成生产商注册，获取注册号' },
            { step: '2', title: '授权代表', desc: '指定WEEE Return GmbH为德国本土授权代表' },
            { step: '3', title: '年度申报', desc: '每年提交投放市场的电池数量及回收处理数据' },
          ].map((s, i) => (
            <div key={i} className="card text-center" style={{ background: cardBg, border: `1px solid ${border}` }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 font-bold" style={{ background: cyan, color: '#fff' }}>{s.step}</div>
              <h3 className="font-bold mb-2" style={{ color: heading }}>{s.title}</h3>
              <p className="text-sm" style={{ color: '#94a3b8' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4" style={{ background: '#1a2434' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold mb-4" style={{ color: heading }}>准备开始电池法合规？</h2>
          <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>在线填写信息，5分钟完成签约。WEEE Return GmbH 接管后续全部合规工作。</p>
          <Link to="/signup?type=battery" className="inline-block px-6 py-3 font-semibold rounded-lg text-sm transition-all"
            style={{ background: cyan, color: '#fff', boxShadow: '0 4px 20px rgba(0,180,216,0.25)' }}>立即签约 →</Link>
        </div>
      </section>
    </div>
  )
}

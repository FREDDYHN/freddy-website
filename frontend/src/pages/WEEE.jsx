import { Link } from 'react-router-dom'
import { WEEE_STARTING_PRICE } from '@shared/constants.js'

const bgDark = '#0f1724'
const cardBg = '#1c2a3a'
const border = '#2a3b50'
const heading = '#e2e8f0'
const body = '#8899aa'
const cyan = '#00b4d8'
const green = '#2dd4bf'

const categories = [
  { id: '1', name: '热交换器', de: 'Wärmeüberträger', examples: '冰箱、空调、冷柜、热泵' },
  { id: '2', name: '显示屏/屏幕', de: 'Bildschirme', examples: '电视、显示器、笔记本电脑屏幕 (>100cm²)' },
  { id: '3', name: '灯具', de: 'Lampen', examples: 'LED灯、荧光灯、节能灯' },
  { id: '4', name: '大型设备', de: 'Großgeräte', examples: '洗衣机、烤箱、复印机 (>50cm)' },
  { id: '5', name: '小型设备', de: 'Kleingeräte', examples: '手机、相机、吹风机 (<50cm)' },
  { id: '6', name: '小型IT设备', de: 'Kleine IT-Geräte', examples: '路由器、键盘、移动硬盘' },
]

export default function WEEE() {
  return (
    <div>
      <section className="py-16 md:py-20 px-4 text-center" style={{ background: bgDark }}>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3" style={{ color: heading }}>德国 WEEE 电子电气设备法</h1>
        <p className="text-base mb-2" style={{ color: body }}>Elektro- und Elektronikgerätegesetz (ElektroG)</p>
        <p className="text-xl font-bold mb-6" style={{ color: green }}>€{WEEE_STARTING_PRICE}/年起</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/signup?type=weee" className="px-6 py-3 font-semibold rounded-lg text-sm transition-all"
            style={{ background: cyan, color: '#fff', boxShadow: '0 4px 20px rgba(0,180,216,0.25)' }}>在线签约 WEEE →</Link>
          <Link to="/calculator" className="px-6 py-3 rounded-lg font-semibold text-sm"
            style={{ border: `1px solid rgba(0,180,216,0.5)`, color: cyan }}>费用计算器 →</Link>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="card mb-8" style={{ background: cardBg, border: `1px solid ${border}` }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: heading }}>什么是 WEEE？</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: '#94a3b8' }}>
            德国《电子电气设备法》(ElektroG) 规范了电子电气设备在德国市场的投放、回收和处置。所有在德国销售电子电气设备的生产商必须在德国联邦环境局(UBA)下属的EAR基金会注册。
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
            WEEE Return GmbH 作为您的授权代表，承担 EAR 注册、回收担保、年度数据申报以及与主管部门的全部官方沟通。
          </p>
        </div>

        <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: heading }}>6大设备类别</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(c => (
            <div key={c.id} className="card" style={{ background: cardBg, border: `1px solid ${border}` }}>
              <h3 className="font-bold mb-1" style={{ color: heading }}>{c.name}</h3>
              <p className="text-xs mb-1" style={{ color: '#556677' }}>{c.de}</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>{c.examples}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4" style={{ background: '#1a2434' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-extrabold mb-4" style={{ color: heading }}>准备开始 WEEE 合规？</h2>
          <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>在线填写信息，5分钟完成签约。WEEE Return GmbH 接管后续全部合规工作。</p>
          <Link to="/signup?type=weee" className="inline-block px-6 py-3 font-semibold rounded-lg text-sm transition-all"
            style={{ background: cyan, color: '#fff', boxShadow: '0 4px 20px rgba(0,180,216,0.25)' }}>立即签约 →</Link>
        </div>
      </section>
    </div>
  )
}

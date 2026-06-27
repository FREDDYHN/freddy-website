import { Link } from 'react-router-dom'
import { WEEE_STARTING_PRICE } from '@shared/constants.js'

const cats = [
  { id: '1', n: '热交换器', de: 'Wärmeüberträger', ex: '冰箱、空调、冷柜、热泵' },
  { id: '2', n: '显示屏/屏幕', de: 'Bildschirme', ex: '电视、显示器 (>100cm²)' },
  { id: '3', n: '灯具', de: 'Lampen', ex: 'LED灯、荧光灯、节能灯' },
  { id: '4', n: '大型设备', de: 'Großgeräte', ex: '洗衣机、烤箱、复印机 (>50cm)' },
  { id: '5', n: '小型设备', de: 'Kleingeräte', ex: '手机、相机、吹风机 (<50cm)' },
  { id: '6', n: '小型IT设备', de: 'Kleine IT-Geräte', ex: '路由器、键盘、移动硬盘' },
]

export default function WEEE() {
  return (
    <div>
      <section className="text-white text-center py-14 px-4" style={{ background: 'linear-gradient(135deg, #1a3a2a, #2d5a3e, #1a3a2a)' }}>
        <h1 className="text-2xl md:text-3xl font-extrabold mb-1">德国 WEEE 电子电气设备法</h1>
        <p className="text-sm text-white/60 mb-1">Elektro- und Elektronikgerätegesetz (ElektroG)</p>
        <p className="text-xl font-bold mb-6">€{WEEE_STARTING_PRICE}/年起</p>
        <Link to="/signup/weee" className="inline-block px-7 py-3 text-white text-sm font-bold rounded-lg hover:-translate-y-0.5 transition-all" style={{ background: '#2d8a4e' }}>在线签约 WEEE →</Link>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white border border-gray-100 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-bold mb-3">什么是 WEEE？</h2>
          <p className="text-sm text-gray-500 leading-relaxed">德国《电子电气设备法》(ElektroG) 要求所有在德国市场销售电子电气设备的生产商和进口商必须在 EAR 基金会完成注册，并承担产品废弃后的回收处理义务。非欧盟生产商必须指定德国本土授权代表才能完成注册。</p>
        </div>

        <h2 className="text-lg font-bold mb-5">六大设备类别</h2>
        <div className="grid md:grid-cols-2 gap-3">
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
      </section>
    </div>
  )
}

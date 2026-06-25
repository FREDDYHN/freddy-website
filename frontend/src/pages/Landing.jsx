import { Link } from 'react-router-dom'

const services = [
  { to: '/packaging', title: '包装法授权代表', price: '€89/年', desc: '德国包装法 VerpackG §35(2) 本土授权代表，替代EASY-LIZE，自有签约+支付，LUCID注册指导。', gradient: 'from-[#1e3a5f] to-[#2a5a8a]', tag: '2026强制' },
  { to: '/battery', title: '德国电池法 BattG', price: '€129/年起', desc: '电池及含电池产品德国市场合规注册，与WEEE Return GmbH合作，EAR注册全流程代办。', gradient: 'from-[#5a3e1e] to-[#3d210d]' },
  { to: '/weee', title: '德国 WEEE 电子电气法', price: '€278/年起', desc: '电子电气设备德国回收合规，6大设备类别全覆盖，WEEE Return GmbH授权代表服务。', gradient: 'from-[#1e5a3f] to-[#0d3d21]' },
]

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient text-white py-20 px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">德国跨境合规 · 一站式解决方案</h1>
        <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          包装法授权代表 · WEEE电子电气法 · 电池法 BattG<br />
          德国本土授权代表 | LUCID注册 | 双元系统对接 | 中文全程服务
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/signup" className="px-6 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent-light transition-colors">
            在线签约包装法 AR
          </Link>
          <Link to="/calculator" className="px-6 py-3 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors">
            费用计算器 →
          </Link>
        </div>
      </section>

      {/* Service Cards */}
      <section className="max-w-6xl mx-auto px-4 -mt-8 relative z-10">
        <div className="grid md:grid-cols-3 gap-6">
          {services.map(s => (
            <Link key={s.to} to={s.to} className="block bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden group">
              <div className={`bg-gradient-to-r ${s.gradient} p-4 text-white`}>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg">{s.title}</h3>
                  {s.tag && <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{s.tag}</span>}
                </div>
                <p className="text-2xl font-bold mt-2">{s.price}</p>
              </div>
              <div className="p-4 text-sm text-gray-600 group-hover:text-gray-800">{s.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-12">三步完成德国合规</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: '①', title: '在线填写信息', desc: '公司信息 + 包装/产品数据，全程中文引导' },
            { step: '②', title: '系统生成合同', desc: '自动生成双语授权代表合同，在线签署' },
            { step: '③', title: '提交审批', desc: 'LUCID/EAR注册提交，获取合规编号' },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold">{s.step}</div>
              <h3 className="font-bold text-gray-700">{s.title}</h3>
              <p className="text-sm text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary to-primary-dark text-white py-16 px-4 text-center">
        <h2 className="text-2xl font-bold mb-4">2026年8月12日起，法规强制要求</h2>
        <p className="text-gray-300 mb-6 max-w-xl mx-auto">PPWR生效后，所有无德国分支机构的厂商必须在德国指定授权代表。提前准备，避免销售禁令。</p>
        <Link to="/signup" className="inline-block px-8 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent-light transition-colors">
          立即签约包装法 AR →
        </Link>
      </section>
    </div>
  )
}

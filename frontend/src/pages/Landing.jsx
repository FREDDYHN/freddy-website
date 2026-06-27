import { Link } from 'react-router-dom'
import { AR_TIERS, BATTERY_STARTING_PRICE, WEEE_STARTING_PRICE } from '@shared/constants.js'

const services = [
  { to: '/packaging', title: '包装法授权代表', price: `€${AR_TIERS.basic.feeEur}/年`, desc: '德国包装法 VerpackG §35(2) 本土授权代表，替代EASY-LIZE，自有签约+支付，LUCID注册指导。', gradient: 'from-[#1e3a5f] to-[#2a5a8a]', tag: '2026强制' },
  { to: '/battery', title: '德国电池法 BattG', price: `€${BATTERY_STARTING_PRICE}/年起`, desc: '电池及含电池产品德国市场合规注册，与WEEE Return GmbH合作，EAR注册全流程代办。', gradient: 'from-[#5a3e1e] to-[#3d210d]' },
  { to: '/weee', title: '德国 WEEE 电子电气法', price: `€${WEEE_STARTING_PRICE}/年起`, desc: '电子电气设备德国回收合规，6大设备类别全覆盖，WEEE Return GmbH授权代表服务。', gradient: 'from-[#1e5a3f] to-[#0d3d21]' },
]

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="hero-gradient text-white py-20 px-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">德国跨境合规 · 一站式解决方案</h1>
        <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          LIVANTO GMBH &nbsp;·&nbsp; EKO-PUNKT &nbsp;·&nbsp; WEEE RETURN GmbH
        </p>
      </section>

      {/* Service Cards */}
      <section className="max-w-6xl mx-auto px-4 -mt-8 relative z-10 pb-4">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">三大产品</h2>
        <p className="text-sm text-gray-500 text-center mb-8">根据您的出口产品类型，选择对应的合规服务</p>
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

      {/* Progress Flow */}
      <section className="bg-white py-20 px-4 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-16">四步完成合规，授权全程代表护航</h2>
          <div className="relative">
            {/* Progress bar line */}
            <div className="hidden md:block absolute top-5 left-[8%] right-[8%] h-0.5 bg-gray-200" />
            <div className="hidden md:block absolute top-5 left-[8%] h-0.5 bg-primary" style={{ width: '62%' }} />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
              {[
                { step: '01', icon: '📦', title: '选择产品', desc: '确定需要合规的产品类型：包装法、WEEE电子电气法、电池法 BattG' },
                { step: '02', icon: '📝', title: '填写信息', desc: '在线提交公司及商品信息，全程中文引导，约5分钟完成' },
                { step: '03', icon: '📄', title: '签订合同', desc: '系统生成授权代表合同，下载后签字盖章，上传即完成签署' },
                { step: '04', icon: '🤝', title: '授权代表接手', desc: '授权代表接管LUCID/EAR注册、双元系统对接、年度申报等全部合规工作' },
              ].map((s, i) => (
                <div key={i} className="relative text-center">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold mx-auto mb-4 relative z-10 shadow-md">
                    {s.step}
                  </div>
                  <div className="text-3xl mb-2">{s.icon}</div>
                  <h3 className="font-bold text-gray-800 mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

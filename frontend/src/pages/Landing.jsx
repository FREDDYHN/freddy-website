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

      {/* Progress Flow */}
      <section className="bg-white py-20 px-4 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-16">四步完成合规，授权全程代表护航</h2>
          <div className="relative">
            {/* Progress bar line */}
            <div className="hidden md:block absolute top-5 left-[8%] right-[8%] h-0.5 bg-gray-200" />
            <div className="hidden md:block absolute top-5 left-[8%] right-[8%] h-0.5 bg-gradient-to-r from-primary to-primary/40" />

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

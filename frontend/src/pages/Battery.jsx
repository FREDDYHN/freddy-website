export default function Battery() {
  return (
    <div>
      <section className="battery-gradient text-white py-16 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">德国电池法 BattG</h1>
        <p className="text-lg text-gray-300 mb-2">Batteriegesetz — 电池及含电池产品合规</p>
        <p className="text-xl font-bold text-amber-300">€129/年起</p>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 mb-8">
          <h2 className="text-xl font-bold mb-4">什么是电池法？</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            德国《电池法》(BattG) 规范了所有类型电池在德国市场上的投放、回收和处置。自2021年起，电池法适用范围扩展至所有类型的电池——包括设备电池、工业电池和汽车电池。生产商必须在德国联邦环境局 (UBA) 的EAR基金会完成注册。
          </p>
          <div className="grid md:grid-cols-3 gap-4 mt-6">
            {[
              { title: '电池制造商', desc: '在德国以自己的品牌销售电池' },
              { title: '含电池产品卖家', desc: '产品中包含电池（如玩具、电子设备）' },
              { title: '跨境电商', desc: '通过Amazon/Temu等平台向德国发货' },
            ].map((c, i) => (
              <div key={i} className="p-4 bg-amber-50 rounded-lg text-sm">
                <h3 className="font-bold text-amber-800 mb-1">{c.title}</h3>
                <p className="text-amber-700">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4">费用参考</h2>
          <div className="space-y-3 text-sm">
            {[
              ['WEEE Return 注册费', '€129.00'],
              ['回收系统参与费', '€129.00'],
              ['EAR 会员年费', '€48.00'],
              ['EAR 季度费', '€3.80'],
              ['额外品牌 (每品牌)', '€49.00'],
            ].map(([item, fee], i) => (
              <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">{item}</span>
                <span className="font-medium">{fee}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">* 首年另有一笔€50.76的EAR一次性授权费。以上为参考价格，具体以实际报价为准。</p>
        </div>
      </section>
    </div>
  )
}

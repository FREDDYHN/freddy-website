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
      <section className="weee-gradient text-white py-16 px-4 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">德国 WEEE 电子电气设备法</h1>
        <p className="text-lg text-gray-300 mb-2">Elektro- und Elektronikgerätegesetz (ElektroG)</p>
        <p className="text-xl font-bold text-green-300">€278/年起</p>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4">什么是 WEEE？</h2>
          <p className="text-gray-600 leading-relaxed">
            WEEE (Waste Electrical and Electronic Equipment) 即电子电气设备废弃物。德国《电子电气设备法》(ElektroG) 要求所有在德国市场上销售电子电气设备的生产商和进口商必须在德国基金会 EAR (Stiftung Elektro-Altgeräte Register) 完成注册，并承担产品废弃后的回收和处理义务。
          </p>
          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <strong>注意：</strong>非欧盟生产商必须在德国指定一名授权代表 (Authorised Representative) 才能完成EAR注册。福瑞笛通过 WEEE Return GmbH 为您提供本土授权代表服务。
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-xl font-bold mb-6">六大设备类别</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {categories.map(c => (
            <div key={c.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-bold">{c.id}</span>
                <div>
                  <h3 className="font-bold text-sm">{c.name}</h3>
                  <p className="text-xs text-gray-400">{c.de}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">例: {c.examples}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

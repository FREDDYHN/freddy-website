const files = [
  { name: 'LIVANTO 授权代表合同模板', desc: '§35(2) VerpackG 授权代表合同 — 德中双语', path: '/projects/LIVANTO/VerpackG_Bevollmächtigungsvertrag.docx' },
  { name: '包装法价格表 (中文)', desc: '双元系统费用 + AR 套餐价格', path: '/templates/vat-price-zh.docx' },
  { name: 'WEEE 价格表 (中文)', desc: 'EAR 注册 + 回收费用明细', path: '/templates/weee-price-zh.docx' },
  { name: '电池法价格表 (中文)', desc: 'EAR 注册 + 回收费用明细', path: '/templates/battery-price-zh.docx' },
]

export default function Downloads() {
  return (
    <div>
      <section className="text-white text-center py-14 px-4" style={{ background: 'linear-gradient(135deg, #1a3a2a, #2d5a3e, #1a3a2a)' }}>
        <h1 className="text-2xl font-extrabold">下载中心</h1>
        <p className="text-sm text-white/60 mt-1">合同模板 · 价格表 · 合规指南</p>
      </section>
      <section className="max-w-2xl mx-auto px-4 py-10">
        <div className="space-y-3">
          {files.map((f, i) => (
            <a key={i} href={f.path} className="block bg-white border border-gray-100 rounded-lg p-4 hover:shadow-sm transition-all">
              <div className="flex justify-between items-start">
                <div><p className="font-medium text-sm">{f.name}</p><p className="text-xs text-gray-400 mt-0.5">{f.desc}</p></div>
                <span className="text-primary text-sm font-semibold shrink-0 ml-4">下载 ↓</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}

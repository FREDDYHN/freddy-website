export default function Downloads() {
  const files = [
    { name: 'LIVANTO授权代表合同模板 (V2)', desc: '§35(2) VerpackG 授权代表合同 — 德中双语', path: '/projects/contracts/LIVANTO/Bevollmächtigungsvertrag_02.docx' },
    { name: 'LUCID中文注册指南', desc: '逐步截图指导在ZSVR完成LUCID注册', path: '#', soon: true },
    { name: '包装材料申报表', desc: '按材料类别填写年度包装量', path: '#', soon: true },
    { name: 'WEEE注册表模板', desc: '德国WEEE EAR注册所需信息', path: '/templates/weee-template.docx' },
    { name: '电池法注册表模板', desc: '德国电池法EAR注册所需信息', path: '/templates/battery-template.docx' },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center mb-4">下载中心</h1>
      <p className="text-center text-gray-500 mb-12">法律文件、注册模板、指南文档</p>
      <div className="space-y-4">
        {files.map((f, i) => (
          <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800">{f.name} {f.soon && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded ml-2">即将上线</span>}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
            {f.soon ? (
              <span className="text-sm text-gray-400">Coming Soon</span>
            ) : (
              <a href={f.path} download className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary-light transition-colors">下载</a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

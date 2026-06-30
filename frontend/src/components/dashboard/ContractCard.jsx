import { useState } from 'react'

export default function ContractCard({ contract, uploads, onUpload }) {
  const [collapsed, setCollapsed] = useState(true)
  const [busy, setBusy] = useState(false)

  const token = () => sessionStorage.getItem('token')
  const h = () => ({ Authorization: `Bearer ${token()}` })

  const ups = (uploads || []).filter(u => u.contract_id === contract?.id && (u.file_type === 'signed_contract' || u.file_type === 'admin_stamped'))
  const signedUpload = ups.find(u => u.file_type === 'signed_contract')
  const stampedUpload = ups.find(u => u.file_type === 'admin_stamped')

  const handleGenerate = async () => {
    if (!token()) { alert('请先登录'); return }
    setBusy(true)
    try {
      const r = await fetch(`/api/contracts/${contract.id}/generate`, {
        method: 'POST', headers: { ...h(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ar', client_location: 'cn' }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      const fr = await fetch(d.download_url, { headers: h() })
      const blob = await fr.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${contract.contract_number}.docx`; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { alert('生成失败: ' + e.message) }
    setBusy(false)
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    await onUpload(file, contract.id, 'signed_contract')
    e.target.value = ''
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg">
      <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50/50 transition-colors rounded-lg">
        <span className="text-sm font-semibold text-gray-700">📝 合同签署</span>
        <span className={`text-gray-300 text-xs transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}>▼</span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'max-h-0' : 'max-h-96'}`}>
        <div className="px-5 pb-5 flex items-center gap-3 text-xs flex-wrap">
          <button onClick={handleGenerate} disabled={busy}
            className="px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 font-medium">
            {busy ? '生成中...' : '生成合同'}
          </button>
          <span className="text-gray-300">→</span>
          <label className={`px-3 py-1.5 rounded-md font-medium cursor-pointer border ${signedUpload ? 'bg-green-50 border-green-200 text-green-700' : 'border-dashed border-gray-300 text-gray-500 hover:border-primary hover:text-primary'}`}>
            {signedUpload ? '✅ 已上传盖章合同' : '上传盖章合同'}
            <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleUpload} className="hidden" />
          </label>
          <span className="text-gray-300">→</span>
          <span className={`px-3 py-1.5 rounded-md font-medium border ${stampedUpload ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
            {stampedUpload ? '✅ 已回签' : '⏳ 管理回签'}
          </span>
          {stampedUpload && (
            <button onClick={async () => {
              try {
                const r = await fetch(`/api/uploads/${stampedUpload.id}/download`, { headers: h() })
                const blob = await r.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a'); a.href = url; a.download = stampedUpload.original_name; a.click()
                URL.revokeObjectURL(url)
              } catch (e) { alert('下载失败') }
            }} className="px-3 py-1.5 border border-green-300 text-green-700 rounded-md hover:bg-green-50 font-medium">
              📥 下载终版
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

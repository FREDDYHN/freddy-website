import { useState } from 'react'

function fileIcon(mime) {
  if (!mime) return '📄'
  if (mime.includes('pdf')) return '📕'
  if (mime.includes('word') || mime.includes('doc')) return '📘'
  if (mime.includes('image')) return '🖼️'
  return '📄'
}

function typeBadge(fileType) {
  if (fileType === 'admin_stamped') return { label: '官方文件', cls: 'bg-blue-100 text-blue-700' }
  if (fileType === 'signed_contract') return { label: '我的上传', cls: 'bg-gray-100 text-gray-600' }
  return { label: fileType || '其他', cls: 'bg-gray-100 text-gray-600' }
}

export default function ContractCard({ contract, uploads, onGenerate, onUpload }) {
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [genMsg, setGenMsg] = useState(null)

  const handleGen = async () => {
    if (!contract || generating) return
    setGenerating(true)
    setGenMsg(null)
    try {
      await onGenerate(contract.id, contract.contract_number)
      setGenMsg({ ok: true, text: '合同生成成功，正在下载...' })
    } catch (e) {
      setGenMsg({ ok: false, text: e.message || '生成失败' })
    } finally {
      setGenerating(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || uploading) return
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) {
      alert('仅支持 PDF、Word、JPG、PNG 文件')
      return
    }
    setUploading(true)
    try {
      await onUpload(file, contract?.id)
    } finally {
      setUploading(false)
    }
  }

  // Separate admin-stamped files from client uploads
  const adminFiles = (uploads || []).filter(u => u.file_type === 'admin_stamped')
  const myFiles = (uploads || []).filter(u => u.file_type !== 'admin_stamped')
  const hasFiles = (uploads || []).length > 0

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5 space-y-4">
      <h3 className="font-semibold text-sm text-gray-700">📄 合同管理</h3>

      {/* Generate / Download */}
      <button
        onClick={handleGen}
        disabled={generating}
        className="w-full py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors"
      >
        {generating ? '生成中...' : '📥 生成/下载合同'}
      </button>

      {genMsg && (
        <p className={`text-xs px-3 py-1.5 rounded ${genMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{genMsg.text}</p>
      )}

      {/* Upload */}
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-primary/30 transition-colors">
        <label className="cursor-pointer block">
          <span className="text-2xl">📤</span>
          <p className="text-xs text-gray-500 mt-1">{uploading ? '上传中...' : '上传签字盖章合同'}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">支持 PDF、Word、JPG、PNG</p>
          <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
      </div>

      {/* Admin stamped files */}
      {adminFiles.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1">
            <span>🏛️</span> 官方盖章合同
          </h4>
          <div className="space-y-1.5">
            {adminFiles.map((f) => {
              const badge = typeBadge(f.file_type)
              return (
                <div key={f.id} className="flex items-center justify-between bg-blue-50 rounded px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{fileIcon(f.mime_type)}</span>
                    <span className="truncate font-medium">{f.original_name}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <a href={`/api/uploads/${f.id}/download`} className="text-primary hover:underline flex-shrink-0 ml-2" download>下载</a>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* My uploads */}
      {myFiles.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <span>📎</span> 我的上传
          </h4>
          <div className="space-y-1.5">
            {myFiles.map((f) => {
              const badge = typeBadge(f.file_type)
              return (
                <div key={f.id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span>{fileIcon(f.mime_type)}</span>
                    <span className="truncate">{f.original_name}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${badge.cls}`}>{badge.label}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="text-gray-400">{f.uploaded_at?.slice(0, 10)}</span>
                    <a href={`/api/uploads/${f.id}/download`} className="text-primary hover:underline" download>下载</a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasFiles && (
        <div className="text-center py-3 text-gray-300 text-xs">
          <p>📭 暂无上传文件</p>
          <p className="mt-0.5">上传签字盖章后的合同以完成备案</p>
        </div>
      )}
    </div>
  )
}

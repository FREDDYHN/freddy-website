import { useState } from 'react'

function fileIcon(mime) {
  if (!mime) return '📄'
  if (mime.includes('pdf')) return '📕'
  if (mime.includes('word') || mime.includes('doc')) return '📘'
  if (mime.includes('image')) return '🖼️'
  return '📄'
}

export default function ContractCard({ contract, uploads, onGenerate, onUpload }) {
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [genMsg, setGenMsg] = useState(null)

  if (!contract) return null

  // ── Step detection ──
  const mySignedUpload = (uploads || []).find(u => u.file_type === 'signed_contract')
  const adminStampedFile = (uploads || []).find(u => u.file_type === 'admin_stamped')
  const generatedKey = `contract_generated_${contract.id}`
  const contractGenerated = !!(
    sessionStorage.getItem('pending_download') ||
    sessionStorage.getItem(generatedKey) ||
    genMsg?.ok ||
    contract.contract_pdf_path
  )
  if (!sessionStorage.getItem(generatedKey) && (sessionStorage.getItem('pending_download') || contract.contract_pdf_path)) {
    sessionStorage.setItem(generatedKey, '1')
  }

  const steps = [
    { key: 'generate', label: '生成合同', sub: contractGenerated ? contract.contract_number : '待生成', icon: '📄', done: !!contractGenerated },
    { key: 'upload', label: '上传盖章', sub: mySignedUpload ? mySignedUpload.uploaded_at?.slice(0, 10) : '待上传', icon: '📤', done: !!mySignedUpload },
    { key: 'stamped', label: '授权方盖章', sub: adminStampedFile ? '已就绪' : '待回传', icon: '🏛️', done: !!adminStampedFile },
    { key: 'done', label: '签订完成', sub: '合同生效', icon: '🎉', done: !!(contractGenerated && mySignedUpload && adminStampedFile) },
  ]

  const activeIdx = steps.findIndex(s => !s.done)
  const current = activeIdx === -1 ? steps.length - 1 : activeIdx

  // ── Handlers ──

  const handleGen = async () => {
    if (!contract || generating) return
    setGenerating(true)
    setGenMsg(null)
    try {
      await onGenerate(contract.id, contract.contract_number)
      setGenMsg({ ok: true, text: '合同生成成功，正在下载...' })
      sessionStorage.setItem(generatedKey, '1')
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
    if (!allowed.includes(file.type)) { alert('仅支持 PDF、Word、JPG、PNG 文件'); return }
    setUploading(true)
    try { await onUpload(file, contract?.id) } finally { setUploading(false); e.target.value = '' }
  }

  const allDone = current === steps.length - 1 && steps[steps.length - 1].done

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5 space-y-5">
      <h3 className="font-semibold text-sm text-gray-700">📄 合同管理</h3>

      {/* ══════ Horizontal Progress Bar ══════ */}
      <div className="flex items-start justify-between relative px-2">
        {/* Connecting line behind nodes */}
        <div className="absolute top-5 left-[calc(12.5%+8px)] right-[calc(12.5%+8px)] h-0.5 bg-gray-200" style={{ zIndex: 0 }}>
          {/* Colored progress fill */}
          <div
            className="h-full bg-green-400 transition-all duration-500"
            style={{ width: `${allDone ? 100 : Math.max(0, (current / (steps.length - 1)) * 100)}%` }}
          />
        </div>

        {steps.map((step, idx) => {
          const done = step.done
          const active = idx === current
          const pending = !done && !active

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10" style={{ width: `${100 / steps.length}%`, minWidth: 0 }}>
              {/* Node circle */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base transition-all duration-300 ${
                done
                  ? 'bg-green-500 text-white shadow-sm'
                  : active
                    ? 'bg-primary text-white ring-4 ring-primary/15 shadow-md'
                    : 'bg-gray-100 text-gray-300'
              }`}>
                {done ? '✓' : step.icon}
              </div>

              {/* Label */}
              <p className={`text-xs font-medium mt-2 text-center leading-tight transition-colors ${
                done ? 'text-green-600' : active ? 'text-primary' : 'text-gray-300'
              }`}>
                {step.label}
              </p>

              {/* Sub text */}
              <p className={`text-[10px] mt-0.5 text-center truncate w-full transition-colors ${
                done ? 'text-green-400' : active ? 'text-gray-400' : 'text-gray-300'
              }`}>
                {step.sub}
              </p>
            </div>
          )
        })}
      </div>

      {/* ══════ Current Step Action Area ══════ */}
      <div className="bg-gray-50 rounded-lg p-4 transition-all duration-300">
        {/* Step 0: Generate */}
        {current === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">下载系统自动生成的合同文件，委托方签字盖章后进入下一步。</p>
            <button
              onClick={handleGen}
              disabled={generating}
              className="w-full py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors"
            >
              {generating ? '生成中...' : '📥 生成并下载合同'}
            </button>
            {genMsg && (
              <p className={`text-xs px-3 py-1.5 rounded ${genMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {genMsg.text}
              </p>
            )}
          </div>
        )}

        {/* Step 1: Upload */}
        {current === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">请将委托方签字盖章后的合同扫描上传，支持 PDF、Word、JPG、PNG 格式。</p>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-5 text-center hover:border-primary/40 transition-colors cursor-pointer">
              <label className="cursor-pointer block">
                <span className="text-2xl">📤</span>
                <p className="text-xs text-gray-500 mt-1.5">{uploading ? '上传中...' : '点击上传签字盖章合同'}</p>
                <p className="text-[10px] text-gray-400 mt-1">PDF · Word · JPG · PNG（≤20MB）</p>
                <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleUpload} disabled={uploading} className="hidden" />
              </label>
            </div>
            {mySignedUpload && (
              <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5 border border-gray-100 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span>{fileIcon(mySignedUpload.mime_type)}</span>
                  <span className="truncate font-medium text-gray-700">{mySignedUpload.original_name}</span>
                  <span className="text-gray-400 flex-shrink-0">{mySignedUpload.uploaded_at?.slice(0, 10)}</span>
                </div>
                <a href={`/api/uploads/${mySignedUpload.id}/download`} className="text-primary hover:underline flex-shrink-0 ml-2" download>下载</a>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Download stamped */}
        {current === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              {adminStampedFile
                ? '授权代表（LIVANTO GmbH）已完成盖章回传，请下载存档。'
                : '已收到您的签字盖章合同，授权代表方盖章完成后将在此显示，届时请下载。'}
            </p>
            {adminStampedFile ? (
              <a
                href={`/api/uploads/${adminStampedFile.id}/download`}
                className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 hover:bg-blue-100 transition-colors w-full"
                download
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl">🏛️</span>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-blue-700 truncate">{adminStampedFile.original_name}</p>
                    <p className="text-[10px] text-blue-400">{adminStampedFile.uploaded_at?.slice(0, 10)} · 点击下载</p>
                  </div>
                </div>
                <span className="text-blue-500 text-lg flex-shrink-0">📥</span>
              </a>
            ) : (
              <div className="text-center py-6 bg-white rounded-lg border border-gray-100">
                <span className="text-3xl opacity-20">🔒</span>
                <p className="text-xs text-gray-300 mt-1.5">等待授权代表盖章回传</p>
                <p className="text-[10px] text-gray-300 mt-0.5">预计 1-3 个工作日</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: All done */}
        {current === 3 && allDone && (
          <div className="text-center py-4 space-y-2">
            <span className="text-4xl">🎉</span>
            <p className="text-base font-bold text-green-700">合同签订完成</p>
            <p className="text-xs text-green-500">双方盖章完毕，合同已正式生效</p>
            <div className="flex gap-2 justify-center pt-2 flex-wrap">
              {adminStampedFile && (
                <a href={`/api/uploads/${adminStampedFile.id}/download`} className="px-4 py-1.5 bg-white border border-green-200 rounded-md text-xs text-green-600 hover:bg-green-50 transition-colors" download>
                  🏛️ 下载盖章合同
                </a>
              )}
              {mySignedUpload && (
                <a href={`/api/uploads/${mySignedUpload.id}/download`} className="px-4 py-1.5 bg-white border border-gray-200 rounded-md text-xs text-gray-500 hover:bg-gray-50 transition-colors" download>
                  📤 下载上传件
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

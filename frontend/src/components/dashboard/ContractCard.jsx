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
  const [expanded, setExpanded] = useState(null) // which step accordion is open; null = auto

  if (!contract) return null

  // ── Step completion detection ──
  const mySignedUpload = (uploads || []).find(u => u.file_type === 'signed_contract')
  const adminStampedFile = (uploads || []).find(u => u.file_type === 'admin_stamped')
  const generatedKey = `contract_generated_${contract.id}`
  const contractGenerated = !!(
    sessionStorage.getItem('pending_download') ||
    sessionStorage.getItem(generatedKey) ||
    genMsg?.ok ||
    contract.contract_pdf_path
  )
  // Persist generation state for returning users
  if (!sessionStorage.getItem(generatedKey) && (sessionStorage.getItem('pending_download') || contract.contract_pdf_path)) {
    sessionStorage.setItem(generatedKey, '1')
  }

  const steps = [
    {
      key: 'generate',
      label: '下载/生成合同',
      icon: '📥',
      done: !!contractGenerated,
      summary: contractGenerated ? `合同已生成：${contract.contract_number}` : '生成并下载委托方合同文件',
    },
    {
      key: 'upload',
      label: '上传委托方签字盖章合同',
      icon: '📤',
      done: !!mySignedUpload,
      summary: mySignedUpload
        ? `已上传：${mySignedUpload.original_name}（${mySignedUpload.uploaded_at?.slice(0, 10)}）`
        : '将委托方签字盖章后的合同扫描上传',
    },
    {
      key: 'download_stamped',
      label: '下载授权代表盖章合同',
      icon: '🏛️',
      done: !!adminStampedFile,
      summary: adminStampedFile
        ? `官方盖章合同已就绪：${adminStampedFile.original_name}`
        : 'LIVANTO GmbH 盖章完成后可供下载',
    },
    {
      key: 'done',
      label: '合同签订完成',
      icon: '✅',
      done: !!(contractGenerated && mySignedUpload && adminStampedFile),
      summary: '双方盖章完毕，合同正式生效',
      noAction: true,
    },
  ]

  // Find first incomplete step for auto-expand
  const firstPending = steps.findIndex(s => !s.done)
  const activeIdx = expanded !== null ? expanded : (firstPending === -1 ? steps.length - 1 : firstPending)

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
    if (!allowed.includes(file.type)) {
      alert('仅支持 PDF、Word、JPG、PNG 文件')
      return
    }
    setUploading(true)
    try {
      await onUpload(file, contract?.id)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const toggleStep = (idx) => {
    setExpanded(expanded === idx ? null : idx)
  }

  // ── Render ──

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5 space-y-1">
      <h3 className="font-semibold text-sm text-gray-700 mb-3">📄 合同管理</h3>

      {steps.map((step, idx) => {
        const isActive = idx === activeIdx
        const isDone = step.done
        const isPending = !isDone
        const isLast = idx === steps.length - 1

        return (
          <div key={step.key} className="relative">
            {/* Vertical connector line */}
            {!isLast && (
              <div className={`absolute left-[19px] top-10 bottom-0 w-0.5 -ml-px ${
                isDone ? 'bg-green-300' : 'bg-gray-200'
              }`} style={{ zIndex: 0 }} />
            )}

            {/* Step header — clickable accordion trigger */}
            <button
              onClick={() => toggleStep(idx)}
              className={`w-full flex items-center gap-3 py-2.5 px-1 rounded-lg text-left transition-colors ${
                isActive ? 'bg-gray-50' : 'hover:bg-gray-50/50'
              }`}
            >
              {/* Status circle */}
              <span className={`relative z-10 w-[38px] h-[38px] rounded-full flex items-center justify-center text-base flex-shrink-0 transition-colors ${
                isDone
                  ? 'bg-green-100 text-green-600'
                  : isActive
                    ? 'bg-primary/10 text-primary ring-2 ring-primary/20'
                    : 'bg-gray-100 text-gray-300'
              }`}>
                {isDone ? '✓' : step.icon}
              </span>

              {/* Label + summary */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  isDone ? 'text-green-700' : isActive ? 'text-gray-800' : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
                <p className={`text-xs mt-0.5 truncate ${
                  isDone ? 'text-green-500' : isActive ? 'text-gray-500' : 'text-gray-300'
                }`}>
                  {step.summary}
                </p>
              </div>

              {/* Expand/collapse arrow */}
              <span className={`text-gray-300 text-xs flex-shrink-0 transition-transform duration-200 ${
                isActive ? 'rotate-180' : ''
              }`}>▼</span>
            </button>

            {/* Step body — collapsible content */}
            <div className={`overflow-hidden transition-all duration-300 ${
              isActive ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="ml-[50px] pb-3 pt-1 space-y-3">
                {/* Step 1: Generate contract */}
                {idx === 0 && (
                  <>
                    <p className="text-xs text-gray-400">下载系统自动生成的委托方合同文件，用于后续签字盖章。</p>
                    <button
                      onClick={handleGen}
                      disabled={generating}
                      className="w-full py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors"
                    >
                      {generating ? '生成中...' : isDone ? '📥 重新下载合同' : '📥 生成并下载合同'}
                    </button>
                    {genMsg && (
                      <p className={`text-xs px-3 py-1.5 rounded ${genMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {genMsg.text}
                      </p>
                    )}
                  </>
                )}

                {/* Step 2: Upload signed contract */}
                {idx === 1 && (
                  <>
                    <p className="text-xs text-gray-400">请将委托方签字盖章后的合同扫描上传（支持 PDF、Word、JPG、PNG）。</p>
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-primary/30 transition-colors">
                      <label className="cursor-pointer block">
                        <span className="text-2xl">📤</span>
                        <p className="text-xs text-gray-500 mt-1">{uploading ? '上传中...' : '点击上传文件'}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">PDF · Word · JPG · PNG</p>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={handleUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {mySignedUpload && (
                      <div className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span>{fileIcon(mySignedUpload.mime_type)}</span>
                          <span className="truncate font-medium">{mySignedUpload.original_name}</span>
                          <span className="text-gray-400">{mySignedUpload.uploaded_at?.slice(0, 10)}</span>
                        </div>
                        <a href={`/api/uploads/${mySignedUpload.id}/download`} className="text-primary hover:underline flex-shrink-0 ml-2 text-xs" download>
                          下载
                        </a>
                      </div>
                    )}
                  </>
                )}

                {/* Step 3: Download admin-stamped contract */}
                {idx === 2 && (
                  <>
                    <p className="text-xs text-gray-400">
                      {adminStampedFile
                        ? '授权代表（LIVANTO GmbH）已完成盖章，请下载存档。'
                        : '上传委托方签字盖章合同后，授权代表方将盖章并回传，届时可在此下载。'}
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
                      <div className="text-center py-4 bg-gray-50 rounded-lg">
                        <span className="text-2xl opacity-30">🔒</span>
                        <p className="text-xs text-gray-300 mt-1">待授权代表盖章回传</p>
                      </div>
                    )}
                  </>
                )}

                {/* Step 4: Done */}
                {idx === 3 && (
                  <div className={`rounded-lg p-4 text-center ${isDone ? 'bg-green-50 border border-green-100' : 'bg-gray-50'}`}>
                    {isDone ? (
                      <>
                        <span className="text-3xl">🎉</span>
                        <p className="text-sm font-semibold text-green-700 mt-1">合同签订完成</p>
                        <p className="text-xs text-green-500 mt-0.5">双方盖章完毕，合同已正式生效。请妥善保管所有文件。</p>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl opacity-30">🔒</span>
                        <p className="text-xs text-gray-300 mt-1">完成前述步骤后自动完成</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

import { useState, useRef } from 'react'

export default function ContractCard({ contract, uploads, onGenerate, onUpload }) {
  const [generating, setGenerating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const fileRef = useRef(null)

  if (!contract) return null

  // ── Step detection ──
  const mySignedUpload = (uploads || []).find(u => u.file_type === 'signed_contract')
  const adminStampedFile = (uploads || []).find(u => u.file_type === 'admin_stamped')
  const generatedKey = `contract_generated_${contract.id}`
  // Step 1 is done ONLY after user explicitly clicks "生成合同" in dashboard
  const contractGenerated = !!(sessionStorage.getItem(generatedKey) || contract.contract_pdf_path)

  const steps = [
    { key: 'generate', label: '生成合同', sub: contractGenerated ? contract.contract_number : '点击下载', icon: '📥', done: !!contractGenerated },
    { key: 'upload', label: '上传盖章', sub: mySignedUpload ? mySignedUpload.uploaded_at?.slice(0, 10) : '点击上传', icon: '📤', done: !!mySignedUpload },
    { key: 'stamped', label: '授权方盖章', sub: adminStampedFile ? '点击下载' : '等待回传', icon: '🏛️', done: !!adminStampedFile },
    { key: 'done', label: '签订完成', sub: '合同生效', icon: '🎉', done: !!(contractGenerated && mySignedUpload && adminStampedFile) },
  ]

  const activeIdx = steps.findIndex(s => !s.done)
  const current = activeIdx === -1 ? steps.length - 1 : activeIdx
  const allDone = current === steps.length - 1 && steps[steps.length - 1].done
  const doneCount = steps.filter(s => s.done).length

  // ── Step click handlers ──

  /** Download a protected URL with auth token */
  const authDownload = async (url, filename) => {
    const token = sessionStorage.getItem('token')
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!r.ok) { alert('下载失败，请重新登录'); return }
    const blob = await r.blob()
    const objUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objUrl
    a.download = filename || ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objUrl)
  }

  const handleGen = async () => {
    if (!contract || generating) return
    setGenerating(true)
    try {
      await onGenerate(contract.id, contract.contract_number)
      sessionStorage.setItem(generatedKey, '1')
    } catch (e) { /* error handled by parent */ }
    finally { setGenerating(false) }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || uploading) return
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']
    if (!allowed.includes(file.type)) { alert('仅支持 PDF、Word、JPG、PNG 文件'); return }
    setUploading(true)
    try { await onUpload(file, contract?.id) } finally { setUploading(false); e.target.value = '' }
  }

  const handleNodeClick = (idx) => {
    if (idx === 0) {
      handleGen()
    } else if (idx === 1) {
      fileRef.current?.click()
    } else if (idx === 2) {
      if (adminStampedFile) {
        authDownload(`/api/uploads/${adminStampedFile.id}/download`, adminStampedFile.original_name)
      }
    }
    // idx === 3: no action, just visual
  }

  // ── Node rendering helper ──
  const renderNode = (step, idx) => {
    const done = step.done
    const active = idx === current
    const pending = !done && !active
    // Can click: done (repeat) or active (execute). Can't click: pending future steps.
    const clickable = done || active
    // All done: last node shows celebration
    const isComplete = idx === 3 && allDone

    const circleCls = done
      ? 'bg-green-500 text-white shadow-sm'
      : active
        ? 'bg-primary text-white ring-4 ring-primary/15 shadow-md'
        : 'bg-gray-100 text-gray-300'
    const labelCls = done ? 'text-green-600' : active ? 'text-primary' : 'text-gray-300'
    const subCls = done ? 'text-green-400' : active ? 'text-gray-400 group-hover:text-primary' : 'text-gray-300'

    const cursorCls = clickable ? 'cursor-pointer group' : 'cursor-default'

    const Tag = clickable ? 'button' : 'div'

    return (
      <Tag
        key={step.key}
        type={Tag === 'button' ? 'button' : undefined}
        onClick={clickable ? (e) => { e.stopPropagation(); handleNodeClick(idx) } : undefined}
        className={`flex flex-col items-center relative z-10 ${cursorCls}`}
        style={{ width: `${100 / steps.length}%`, minWidth: 0 }}
        title={clickable ? (done ? `重新${step.label}` : step.label) : ''}
      >
        {/* Node circle */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base transition-all duration-300 ${circleCls}`}>
          {isComplete ? '🎉' : done ? '✓' : active && idx === 2 && !adminStampedFile ? '🔒' : step.icon}
        </div>
        {/* Label */}
        <p className={`text-xs font-medium mt-2 text-center leading-tight transition-colors ${labelCls}`}>
          {isComplete ? '全部完成' : step.label}
        </p>
        {/* Sub */}
        <p className={`text-[10px] mt-0.5 text-center truncate w-full transition-colors ${subCls}`}>
          {generating && idx === 0 ? '生成中...' :
           uploading && idx === 1 ? '上传中...' :
           isComplete ? '🎉' : step.sub}
        </p>
      </Tag>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg">
      {/* ══════ Collapsible Header ══════ */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50/50 transition-colors rounded-lg"
      >
        <span className="text-sm font-semibold text-gray-700 flex-shrink-0">📄 合同管理</span>

        {/* Mini progress line */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {steps.map((step, idx) => (
            <div key={step.key} className="flex items-center gap-1.5">
              {idx > 0 && <span className={`w-3 h-px ${idx <= doneCount ? 'bg-green-300' : 'bg-gray-200'}`} />}
              <span className={`text-[10px] font-medium flex-shrink-0 ${
                step.done ? 'text-green-500' : idx === current ? 'text-primary' : 'text-gray-300'
              }`}>
                {step.done ? '✓' : idx + 1}
              </span>
            </div>
          ))}
        </div>

        <span className={`text-[11px] font-medium flex-shrink-0 ${allDone ? 'text-green-500' : 'text-gray-400'}`}>
          {allDone ? '已完成' : `${doneCount}/${steps.length}`}
        </span>
        <span className={`text-gray-300 text-xs flex-shrink-0 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}>▼</span>
      </button>

      {/* ══════ Expandable Body — Interactive Progress Bar ══════ */}
      <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'max-h-0' : 'max-h-[300px]'}`}>
        <div className="px-5 pb-6 pt-1">
          <div className="flex items-start justify-between relative px-2">
            {/* Connecting line */}
            <div className="absolute top-5 left-[calc(12.5%+8px)] right-[calc(12.5%+8px)] h-0.5 bg-gray-200" style={{ zIndex: 0 }}>
              <div
                className="h-full bg-green-400 transition-all duration-500"
                style={{ width: `${allDone ? 100 : Math.max(0, (current / (steps.length - 1)) * 100)}%` }}
              />
            </div>
            {steps.map((step, idx) => renderNode(step, idx))}
          </div>
        </div>
      </div>

      {/* Hidden file input for step 1 upload */}
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={handleUpload}
        disabled={uploading}
        className="hidden"
      />
    </div>
  )
}

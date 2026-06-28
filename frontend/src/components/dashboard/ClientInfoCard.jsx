import { useNavigate } from 'react-router-dom'

function Row({ label, value, mono }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 flex-shrink-0 w-28">{label}</span>
      <span className={`text-xs text-right ${mono ? 'font-mono' : 'font-medium text-gray-700'}`}>{value}</span>
    </div>
  )
}

export default function ClientInfoCard({ client }) {
  const nav = useNavigate()
  if (!client) return null

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-1.5">
          <span>🔒</span> 委托方信息
        </h3>
        <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">只读</span>
      </div>

      <div className="bg-gray-50/50 rounded-lg p-3 space-y-0">
        <Row label="公司（中文）" value={client.company_name} />
        <Row label="公司（英文）" value={client.company_name_en} />
        <Row label="信用代码" value={client.uscc} mono />
        <Row label="注册地址" value={client.registered_address} />
        <Row label="法定代表人" value={client.legal_representative} />
        <Row label="联系人" value={client.contact_name} />
        <Row label="邮箱" value={client.contact_email} />
        <Row label="手机" value={client.contact_phone} />
        <Row label="微信" value={client.wechat_id} />
        <Row label="LUCID号" value={client.lucid_registration_number} mono />
      </div>

      <button
        onClick={() => nav('/profile')}
        className="w-full py-2 border border-gray-200 rounded-md text-xs text-gray-500 hover:bg-gray-50 transition-colors"
      >
        ✏️ 编辑资料
      </button>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CLIENT_COUNTRIES, CN_REGION_CODES } from '@shared/constants.js'

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
  const [collapsed, setCollapsed] = useState(true)
  const nav = useNavigate()
  if (!client) return null

  return (
    <div className="bg-white border border-gray-100 rounded-lg">
      <div className="flex items-center justify-between p-5">
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2 text-left hover:bg-gray-50/50 transition-colors rounded-lg -m-1 p-1">
          <span className="text-sm font-semibold text-gray-700">🔒 账户管理</span>
          <span className={`text-gray-300 text-xs transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}>▼</span>
        </button>
        <button onClick={() => nav('/profile')}
          className="shrink-0 px-3 py-1.5 border border-primary text-primary rounded-md text-xs font-semibold hover:bg-primary/5 transition-colors">
          ✏️ 修改资料
        </button>
      </div>
      <div className={`overflow-hidden transition-all duration-300 ${collapsed ? 'max-h-0' : 'max-h-96'}`}>
        <div className="px-5 pb-5">
          <div className="bg-gray-50/50 rounded-lg p-3 space-y-0">
            <Row label="公司（中文）" value={client.company_name} />
            <Row label="公司（英文）" value={client.company_name_en} />
            <Row label="国家/地区" value={CLIENT_COUNTRIES.find(c => c.code === client.country)?.label || client.country} />
            <Row label={client.entity_type === 'individual' ? '身份证号' : (CN_REGION_CODES.includes(client.country || 'CN') ? '信用代码' : '税号')} value={client.entity_type === 'individual' ? client.id_number : client.uscc} mono />
            <Row label="USt-IdNr" value={client.vat_id} mono />
            <Row label="注册地址" value={client.registered_address} />
            <Row label="法定代表人" value={client.legal_representative} />
            <Row label="联系人" value={client.contact_name} />
            <Row label="邮箱" value={client.contact_email} />
            <Row label="手机" value={client.contact_phone} />
            <Row label="微信" value={client.wechat_id} />
            <Row label="LUCID号" value={client.lucid_registration_number} mono />
          </div>
        </div>
      </div>
    </div>
  )
}

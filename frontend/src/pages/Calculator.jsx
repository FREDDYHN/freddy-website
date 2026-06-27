import { useState } from 'react'
import { WEEE_PRICES, BATTERY_PRICES, AR_TIERS } from '@shared/constants.js'

const selCls = 'border border-gray-200 rounded-md px-3 py-2 text-sm'

export default function Calculator() {
  const [wc, setWc] = useState(1); const [wb, setWb] = useState(1); const [wy, setWy] = useState('first')
  const [bb, setBb] = useState(1); const [by, setBy] = useState('first'); const [ar, setAr] = useState('basic')

  const Pw = WEEE_PRICES; const Pb = BATTERY_PRICES
  const we = Math.max(0, (wc - 1) * Pw.extraCategory) + Math.max(0, (wb - 1) * Pw.extraBrand) + wb * Pw.earBrandReg + (wy === 'first' ? Pw.authFirstYear : 0)
  const wt = Pw.baseFee + Pw.insolvencyFee + Pw.earQuarterly + we
  const be = Math.max(0, (bb - 1) * Pb.extraBrand) + bb * Pb.earBrandReg + (by === 'first' ? Pb.authFirstYear : 0)
  const bt = Pb.baseFee + Pb.takebackFee + Pb.earMembership + Pb.earQuarterly + be
  const af = AR_TIERS[ar]?.feeEur || 89

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold text-center mb-10">费用计算器</h1>

      <div className="bg-white border border-gray-100 rounded-lg p-5 mb-6">
        <h2 className="font-bold text-lg mb-4 text-primary">WEEE 电子电气法</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          <div><label className="block text-sm font-medium text-gray-500 mb-1">设备类别数量</label><select value={wc} onChange={e => setWc(+e.target.value)} className={selCls + ' w-full'}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-500 mb-1">品牌数量</label><select value={wb} onChange={e => setWb(+e.target.value)} className={selCls + ' w-full'}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-500 mb-1">年份类型</label><select value={wy} onChange={e => setWy(e.target.value)} className={selCls + ' w-full'}><option value="first">首年</option><option value="renewal">续年</option></select></div>
        </div>
        <div className="bg-gray-50 rounded-md p-4 text-sm space-y-1.5 text-gray-600">
          <R k="WEEE Return 基本费" v={`€${Pw.baseFee.toFixed(2)}`} /><R k="破产保障费" v={`€${Pw.insolvencyFee.toFixed(2)}`} /><R k="EAR 季度费" v={`€${Pw.earQuarterly.toFixed(2)}`} /><R k={`EAR 品牌注册费 (${wb}品牌)`} v={`€${(wb * Pw.earBrandReg).toFixed(2)}`} />
          {wc > 1 && <R k={`额外类别 ×${wc - 1}`} v={`€${(Math.max(0, (wc - 1) * Pw.extraCategory)).toFixed(2)}`} />}
          {wb > 1 && <R k={`额外品牌 ×${wb - 1}`} v={`€${(Math.max(0, (wb - 1) * Pw.extraBrand)).toFixed(2)}`} />}
          {wy === 'first' && <R k="EAR 一次性授权费 (首年)" v={`€${Pw.authFirstYear.toFixed(2)}`} />}
          <div className="flex justify-between font-bold text-primary border-t border-gray-200 pt-2 mt-1"><span>WEEE 年费合计</span><span>€{wt.toFixed(2)}</span></div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-5 mb-6">
        <h2 className="font-bold text-lg mb-4 text-primary">电池法 BattG</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div><label className="block text-sm font-medium text-gray-500 mb-1">品牌数量</label><select value={bb} onChange={e => setBb(+e.target.value)} className={selCls + ' w-full'}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select></div>
          <div><label className="block text-sm font-medium text-gray-500 mb-1">年份类型</label><select value={by} onChange={e => setBy(e.target.value)} className={selCls + ' w-full'}><option value="first">首年</option><option value="renewal">续年</option></select></div>
        </div>
        <div className="bg-gray-50 rounded-md p-4 text-sm space-y-1.5 text-gray-600">
          <R k="电池法基本费" v={`€${Pb.baseFee.toFixed(2)}`} /><R k="回收系统费" v={`€${Pb.takebackFee.toFixed(2)}`} /><R k="EAR 会员费" v={`€${Pb.earMembership.toFixed(2)}`} /><R k="EAR 季度费" v={`€${Pb.earQuarterly.toFixed(2)}`} /><R k={`EAR 品牌注册费 (${bb}品牌)`} v={`€${(bb * Pb.earBrandReg).toFixed(2)}`} />
          {bb > 1 && <R k={`额外品牌 ×${bb - 1}`} v={`€${(Math.max(0, (bb - 1) * Pb.extraBrand)).toFixed(2)}`} />}
          {by === 'first' && <R k="EAR 一次性授权费 (首年)" v={`€${Pb.authFirstYear.toFixed(2)}`} />}
          <div className="flex justify-between font-bold text-primary border-t border-gray-200 pt-2 mt-1"><span>电池法 年费合计</span><span>€{bt.toFixed(2)}</span></div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-5 mb-6">
        <h2 className="font-bold text-lg mb-4 text-primary">包装法 AR 授权代表</h2>
        <p className="text-sm text-gray-400 mb-3">LIVANTO GmbH — 三档服务套餐</p>
        <div className="grid grid-cols-3 gap-3 mb-3">
          {Object.values(AR_TIERS).map(t => (
            <label key={t.key} className={`flex items-center gap-2 p-3 border rounded-md cursor-pointer hover:bg-gray-50 text-sm ${ar === t.key ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
              <input type="radio" name="ar" value={t.key} checked={ar === t.key} onChange={e => setAr(e.target.value)} /><span><span className="font-medium">{t.name.split(' ')[0]}</span><br /><span className="text-gray-400">€{t.feeEur}/年</span></span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400">* 双元系统许可费另计</p>
      </div>

      <div className="bg-primary text-white rounded-lg p-6 text-center">
        <p className="text-sm text-white/60 mb-1">三项合计 (包装法 {AR_TIERS[ar]?.name?.split(' ')[0] || ''} + WEEE + 电池法)</p>
        <p className="text-3xl font-extrabold">约 €{(af + wt + bt).toFixed(2)}/年</p>
        <p className="text-xs text-white/40 mt-2">* 包装法双元系统费另计</p>
      </div>
    </div>
  )
}

function R({ k, v }) { return <div className="flex justify-between"><span>{k}</span><span>{v}</span></div> }

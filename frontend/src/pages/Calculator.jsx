import { useState } from 'react'

export default function Calculator() {
  const [weeeCats, setWeeeCats] = useState(1)
  const [weeeBrands, setWeeeBrands] = useState(1)
  const [weeeYear, setWeeeYear] = useState('first')
  const [batBrands, setBatBrands] = useState(1)
  const [batYear, setBatYear] = useState('first')

  const weeeBase = 129, weeeInsolvency = 149, weeeEarQuarterly = 3.80
  const extraCats = Math.max(0, (weeeCats - 1) * 99)
  const extraBrandsWeee = Math.max(0, (weeeBrands - 1) * 79.95)
  const earBrandWeee = weeeBrands * 9.50
  const authFirstWeee = weeeYear === 'first' ? 50.76 : 0
  const weeeTotal = weeeBase + weeeInsolvency + weeeEarQuarterly + extraCats + extraBrandsWeee + earBrandWeee + authFirstWeee

  const batBase = 129, batTakeback = 129, batEarMembership = 48, batQuarterly = 3.80
  const extraBrandsBat = Math.max(0, (batBrands - 1) * 49)
  const earBrandBat = batBrands * 16.40
  const authFirstBat = batYear === 'first' ? 50.76 : 0
  const batTotal = batBase + batTakeback + batEarMembership + batQuarterly + extraBrandsBat + earBrandBat + authFirstBat

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center mb-12">费用计算器</h1>

      {/* WEEE Calculator */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold mb-6 text-green-700">WEEE 电子电气法</h2>
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">设备类别数量</label>
            <select value={weeeCats} onChange={e => setWeeeCats(+e.target.value)} className="w-full border rounded-lg p-2 text-sm">
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">品牌数量</label>
            <select value={weeeBrands} onChange={e => setWeeeBrands(+e.target.value)} className="w-full border rounded-lg p-2 text-sm">
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">年份类型</label>
            <select value={weeeYear} onChange={e => setWeeeYear(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
              <option value="first">首年</option>
              <option value="renewal">续年</option>
            </select>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between"><span>WEEE Return 基本费</span><span>€{weeeBase.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>破产保障费</span><span>€{weeeInsolvency.toFixed(2)}</span></div>
            {extraCats > 0 && <div className="flex justify-between"><span>额外类别 ({weeeCats-1}×€99)</span><span>€{extraCats.toFixed(2)}</span></div>}
            {extraBrandsWeee > 0 && <div className="flex justify-between"><span>额外品牌 ({weeeBrands-1}×€79.95)</span><span>€{extraBrandsWeee.toFixed(2)}</span></div>}
            {authFirstWeee > 0 && <div className="flex justify-between"><span>EAR 一次性授权费 (首年)</span><span>€{authFirstWeee.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-green-800 border-t border-green-200 pt-1 mt-1"><span>WEEE 年费合计</span><span>€{weeeTotal.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      {/* Battery Calculator */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold mb-6 text-amber-700">电池法 BattG</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">品牌数量</label>
            <select value={batBrands} onChange={e => setBatBrands(+e.target.value)} className="w-full border rounded-lg p-2 text-sm">
              {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">年份类型</label>
            <select value={batYear} onChange={e => setBatYear(e.target.value)} className="w-full border rounded-lg p-2 text-sm">
              <option value="first">首年</option>
              <option value="renewal">续年</option>
            </select>
          </div>
        </div>
        <div className="bg-amber-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex justify-between"><span>德国电池法 BattG 基本费</span><span>€{batBase.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>回收系统费</span><span>€{batTakeback.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>EAR 会员费</span><span>€{batEarMembership.toFixed(2)}</span></div>
            {extraBrandsBat > 0 && <div className="flex justify-between"><span>额外品牌 ({batBrands-1}×€49)</span><span>€{extraBrandsBat.toFixed(2)}</span></div>}
            {authFirstBat > 0 && <div className="flex justify-between"><span>EAR 一次性授权费 (首年)</span><span>€{authFirstBat.toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-amber-800 border-t border-amber-200 pt-1 mt-1"><span>电池法 年费合计</span><span>€{batTotal.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      {/* Combined Total */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold mb-6 text-primary">包装法 AR 授权代表</h2>
        <p className="text-sm text-gray-500 mb-4">LIVANTO GmbH — 三档服务套餐</p>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: '基础 Basic', price: 89 },
            { label: '标准 Standard', price: 159 },
            { label: '高级 Premium', price: 249 },
          ].map(t => (
            <label key={t.label} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input type="radio" name="arTier" defaultChecked={t.price === 89} className="text-primary" />
              <span className="text-sm"><span className="font-medium">{t.label}</span><br /><span className="text-gray-500">€{t.price}/年</span></span>
            </label>
          ))}
        </div>
        <p className="text-xs text-gray-400">* 双元系统许可费另计，按实际用量过账</p>
      </div>

      {/* Combined Total */}
      <div className="bg-primary text-white rounded-xl p-6 shadow-sm text-center">
        <p className="text-sm text-gray-300 mb-1">三项合计 (包装法AR基础 + WEEE + 电池法)</p>
        <p className="text-3xl font-bold">约 €{(89 + weeeTotal + batTotal).toFixed(2)}/年</p>
        <p className="text-xs text-gray-400 mt-2">* 包装法AR以基础套餐€89/年计，双元系统费另计</p>
      </div>
    </div>
  )
}

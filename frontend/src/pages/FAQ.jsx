import { useState } from 'react'

const items = [
  { q: '德国包装法适用于哪些产品？', a: '所有在德国市场销售的带有包装的产品，包括运输包装、销售包装和外包装。自2022年7月起B2B包装也需注册。' },
  { q: '2026年8月 PPWR 生效后有什么变化？', a: '所有在德国无分支机构的厂商必须指定德国本土授权代表，无论来自欧盟成员国还是第三国。属强制要求。' },
  { q: 'WEEE 注册需要多长时间？', a: 'EAR 注册通常需要4-12周。通过授权代表可加快处理。完整材料提交后我们会持续跟进。' },
  { q: '电池法适用于哪些产品？', a: '所有类型电池和含电池产品：设备电池、工业电池、汽车电池及内置电池的电子产品。' },
  { q: '签约后多久合同生效？', a: '付款到账后次月首日合同生效。应客户要求可确认自付款到账之日起立即生效。' },
  { q: '可以不指定授权代表自己注册吗？', a: '非欧盟生产商必须指定德国本土授权代表。这是法律强制要求，不可选择。' },
]

export default function FAQ() {
  const [open, setOpen] = useState(null)
  return (
    <div>
      <section className="text-white text-center py-14 px-4" style={{ background: 'linear-gradient(135deg, #3d5a48, #527a60, #3d5a48)' }}>
        <h1 className="text-2xl font-extrabold">常见问题</h1>
      </section>
      <section className="max-w-2xl mx-auto px-4 py-10 space-y-3">
        {items.map((f, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-lg">
            <button onClick={() => setOpen(open === i ? null : i)} className="w-full text-left p-4 flex justify-between items-center">
              <span className="font-medium text-sm pr-4">{f.q}</span>
              <span className="text-gray-400 text-lg shrink-0">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <p className="px-4 pb-4 text-sm text-gray-500 leading-relaxed">{f.a}</p>}
          </div>
        ))}
      </section>
    </div>
  )
}

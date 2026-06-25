import { useState } from 'react'

const data = [
  { cat: '包装法', q: '谁需要注册德国包装法？', a: '任何在德国市场上首次投放包装产品的生产商、进口商和跨境电商卖家。2026年8月12日起，所有无德国分支机构的厂商必须通过授权代表完成合规。' },
  { cat: '包装法', q: 'LIVANTO授权代表和EASY-LIZE有什么区别？', a: 'EASY-LIZE是EKO-PUNKT旗下的双元系统平台，主要功能是购买包装许可。LIVANTO是德国本土授权代表(Authorsised Representative)，根据§35(2) VerpackG承担您作为生产商的全部法律义务——包括双元系统合同签订、LUCID数据申报、官方通信等。LIVANTO的服务范围远超EASY-LIZE。' },
  { cat: '包装法', q: '我已经有LUCID注册号了，还需要LIVANTO吗？', a: '需要。LUCID注册是生产商的个人义务（不能委托）。但除此之外的所有义务——系统参与、数据申报、完整性声明——都需要授权代表来完成。2026年8月起这是强制性的。' },
  { cat: '电池法', q: '什么产品需要注册电池法？', a: '任何含有电池或蓄电池的产品（包括不可拆卸电池），以及单独销售的电池和蓄电池。典型产品包括：带电池的玩具、电子温度计、无线耳机、LED灯带电池等。' },
  { cat: '电池法', q: 'WEEE和电池法需要同时注册吗？', a: '如果您的产品是电子电气设备且含有电池，则需要同时注册WEEE和电池法。这是两个独立的合规义务。' },
  { cat: 'WEEE', q: '哪些产品属于WEEE范围？', a: '几乎所有使用电力的产品都属于WEEE范围——从大型家电（冰箱、洗衣机）到小型电子产品（手机、耳机）。WEEE分为6大类别，具体可参考WEEE服务页面。' },
  { cat: '通用', q: '注册需要多长时间？', a: '包装法LUCID注册：约1-3个工作日。电池法EAR注册：约2-4周。WEEE EAR注册：约4-8周（含破产保障审核）。建议提前至少2个月开始准备。' },
  { cat: '通用', q: '不注册会有什么后果？', a: '罚款最高€200,000；销售禁令（产品被海关扣留/销毁）；亚马逊等平台下架商品、冻结账户、暂停付款；竞争对手发出律师函索赔。' },
]

const cats = ['全部', '包装法', '电池法', 'WEEE', '通用']

export default function FAQ() {
  const [filter, setFilter] = useState('全部')
  const filtered = filter === '全部' ? data : data.filter(d => d.cat === filter)

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-center mb-8">常见问题</h1>
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === c ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map((f, i) => (
          <details key={i} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 group">
            <summary className="font-medium text-gray-800 cursor-pointer">
              <span className="text-xs text-primary mr-2">[{f.cat}]</span> {f.q}
            </summary>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed pl-8">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}

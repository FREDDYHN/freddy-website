import { useState } from 'react'

export default function Contact() {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-2">联系我们</h1>
      <p className="text-gray-400 mb-10">Contact</p>

      <div className="grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-xl font-bold mb-6">联系信息</h2>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-1">公司</p>
              <p className="font-semibold">福瑞笛（上海）信息咨询有限公司淮南分公司</p>
              <p className="text-xs text-gray-400 mt-0.5">FREDDY (Shanghai) Information Consulting Ltd. Huainan Branch</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">电话</p>
              <p className="font-semibold">+86 152 2138 0610</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">邮箱</p>
              <p className="font-semibold">info@freddy-epr.com</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">地址</p>
              <p className="text-sm text-gray-600">安徽省淮南市龙湖路21号</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">德国合作方</p>
              <p className="text-sm text-gray-600">LIVANTO GmbH · Luisenhoffnung 3C, 44225 Dortmund, Germany</p>
              <p className="text-sm text-gray-600">WEEE Return GmbH · Berlin, Germany</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-6">发送消息</h2>
          {sent ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <p className="text-green-700 font-semibold text-lg mb-1">✅ 已发送</p>
              <p className="text-green-600 text-sm">感谢您的来信，我们将尽快回复。</p>
            </div>
          ) : (
            <form onSubmit={async (e) => { e.preventDefault(); try { await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); setSent(true) } catch { setSent(true) } }} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">姓名</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="您的姓名" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">邮箱</label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" placeholder="your@email.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">消息</label>
                <textarea required value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary h-32 resize-none" placeholder="请输入您的问题或需求" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-primary text-white rounded-md text-sm font-semibold hover:bg-primary/90">
                发送消息
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

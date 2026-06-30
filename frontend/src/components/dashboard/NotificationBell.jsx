import { useState, useEffect, useRef } from 'react'

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

const ICON_MAP = {
  upload_approved: '✅',
  upload_rejected: '❌',
  admin_message: '💬',
}

export default function NotificationBell({ initialCount = 0 }) {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const [unread, setUnread] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const ah = () => {
    const t = sessionStorage.getItem('token')
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  const fetchNotifs = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/notifications?limit=20', { headers: ah() })
      if (r.ok) {
        const d = await r.json()
        setNotifs(d.data || [])
        setUnread((d.data || []).filter(n => !n.is_read).length)
      }
    } catch {}
    setLoading(false)
  }

  const markRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: ah() })
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n))
      setUnread(prev => Math.max(0, prev - 1))
    } catch {}
  }

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH', headers: ah() })
      setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })))
      setUnread(0)
    } catch {}
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotifs() }}
        className="relative p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        title="通知"
      >
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none animate-pulse">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">
              {unread > 0 ? `${unread} 条未读` : '通知'}
            </span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">全部已读</button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-6 text-center text-gray-400 text-sm">加载中...</div>
            ) : notifs.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">暂无通知</div>
            ) : (
              notifs.map(n => (
                <button
                  key={n.id}
                  onClick={() => { if (!n.is_read) markRead(n.id) }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    !n.is_read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0 mt-0.5">{ICON_MAP[n.type] || '📌'}</span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs ${!n.is_read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

'use client';

import { useState } from 'react';
import { Search, Bell, Bot, Command, X, CheckCheck } from 'lucide-react';
import { useData } from '@/lib/data-context';

export default function Topbar() {
  const { notifications, markAllNotificationsRead, markNotificationRead } = useData();
  const [showNotifications, setShowNotifications] = useState(false);
  const unread = notifications.filter(n => !n.read).length;

  return (
    <header className="fixed top-0 left-[220px] right-0 h-14 bg-white border-b border-[#e4e4e4] flex items-center justify-between px-5 z-30">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
        <input
          type="text"
          placeholder="Search projects, people, risks..."
          className="search-input w-full text-[13px]"
          style={{ paddingLeft: '36px' }}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#f1f5f9] border border-[#e2e8f0]">
          <Command className="w-3 h-3 text-[#94a3b8]" />
          <span className="text-[10px] text-[#94a3b8] font-medium">K</span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-4">
        {/* AI Assistant Trigger */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#fff3ed] border border-[#f5c9a8] hover:bg-[#ffe4cf] transition-all group">
          <Bot className="w-3.5 h-3.5" style={{ color: '#e86c2d' }} />
          <span className="text-[12px] font-semibold" style={{ color: '#e86c2d' }}>Ask AI</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-[#f1f5f9] transition-all"
          >
            <Bell className="w-[16px] h-[16px] text-[#64748b]" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-11 w-[360px] bg-white border border-[#e2e8f0] rounded-xl shadow-xl z-50 animate-scale-in overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f5f9]">
                  <h3 className="text-[13px] font-semibold text-[#1e293b]">Notifications ({unread} new)</h3>
                  <div className="flex items-center gap-2">
                    {unread > 0 && (
                      <button onClick={() => markAllNotificationsRead()} className="text-[11px] hover:opacity-80 flex items-center gap-1 font-medium" style={{ color: '#e86c2d' }}>
                        <CheckCheck className="w-3 h-3" /> Read all
                      </button>
                    )}
                    <button onClick={() => setShowNotifications(false)} className="text-[#94a3b8] hover:text-[#64748b]">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} onClick={() => markNotificationRead(n.id)} className={`px-4 py-3 border-b border-[#f8fafc] hover:bg-[#f8fafc] transition-colors cursor-pointer ${!n.read ? 'bg-indigo-50/30' : ''}`}>
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          n.type === 'critical' ? 'bg-red-500' :
                          n.type === 'warning' ? 'bg-amber-500' :
                          n.type === 'success' ? 'bg-emerald-500' :
                          n.type === 'insight' ? 'bg-indigo-500' : 'bg-[#94a3b8]'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-[#1e293b]">{n.title}</p>
                          <p className="text-[11px] text-[#64748b] mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-[#94a3b8] mt-1">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

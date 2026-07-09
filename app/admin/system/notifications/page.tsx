'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Building2, CalendarDays, MessageSquare, Settings, UserSearch, Check, CheckCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBNotification } from '@/lib/supabase/types';

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  lead:         { label: 'Lead',        icon: UserSearch,   color: 'text-blue-600',   bg: 'bg-blue-100' },
  appointment:  { label: 'Lịch hẹn',   icon: CalendarDays, color: 'text-green-600',  bg: 'bg-green-100' },
  contract:     { label: 'Hợp đồng',   icon: Building2,    color: 'text-orange-600', bg: 'bg-orange-100' },
  consultation: { label: 'Tư vấn',     icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-100' },
  system:       { label: 'Hệ thống',   icon: Settings,     color: 'text-slate-600',  bg: 'bg-slate-100' },
  new_lead:         { label: 'Lead mới',    icon: UserSearch,   color: 'text-blue-600',   bg: 'bg-blue-100' },
  new_appointment:  { label: 'Lịch hẹn',   icon: CalendarDays, color: 'text-green-600',  bg: 'bg-green-100' },
  contract_expiring: { label: 'Hợp đồng',  icon: Building2,    color: 'text-orange-600', bg: 'bg-orange-100' },
  new_landlord:     { label: 'Chủ nhà',    icon: Building2,    color: 'text-teal-600',   bg: 'bg-teal-100' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function NotificationsPage() {
  const { user, company } = useAuth();
  const { notifications: list, loading, unreadCount, markRead, markAllRead } = useNotifications(user?.id, company?.id);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = list.filter((n) => typeFilter === 'all' || n.type === typeFilter);
  const uniqueTypes = Array.from(new Set(list.map((n) => n.type)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Thông báo</h1>
          <p className="text-slate-500">
            {loading ? 'Đang tải...' : unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Tất cả thông báo đã đọc'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />Đánh dấu tất cả đã đọc
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${typeFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Tất cả ({list.length})
        </button>
        {uniqueTypes.map((t) => {
          const tc = typeConfig[t] ?? { label: t, icon: Bell, color: 'text-slate-600', bg: 'bg-slate-100' };
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${typeFilter === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {tc.label} ({list.filter((n) => n.type === t).length})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-slate-400">
                <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Không có thông báo</p>
              </CardContent>
            </Card>
          )}
          {filtered.map((notif) => {
            const tc = typeConfig[notif.type] ?? { label: notif.type, icon: Bell, color: 'text-slate-600', bg: 'bg-slate-100' };
            const Icon = tc.icon;
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${notif.is_read ? 'bg-white' : 'bg-blue-50 border-blue-100'}`}
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${tc.bg}`}>
                  <Icon className={`h-5 w-5 ${tc.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-medium ${notif.is_read ? 'text-slate-700' : 'text-slate-900'}`}>{notif.title}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{notif.body}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(notif.created_at)}</span>
                      {!notif.is_read && (
                        <button onClick={() => markRead(notif.id)} className="text-blue-600 hover:text-blue-700" title="Đánh dấu đã đọc">
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${tc.bg} ${tc.color}`}>
                      <Icon className="h-3 w-3" />{tc.label}
                    </span>
                    {notif.link && (
                      <Link href={notif.link} className="text-xs text-blue-600 hover:underline">Xem chi tiết →</Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

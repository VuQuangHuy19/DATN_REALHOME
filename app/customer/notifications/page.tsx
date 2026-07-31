'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Receipt,
  FileText,
  Wrench,
  Info,
  Calendar,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';

interface CustomerNotificationItem {
  id: string;
  category: 'invoice' | 'contract' | 'maintenance' | 'system';
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  link?: string;
}

const INITIAL_MOCK_NOTIFS: CustomerNotificationItem[] = [
  {
    id: 'NOTIF-1',
    category: 'invoice',
    title: 'Hóa đơn tiền nhà tháng 07/2026 đã sẵn sàng',
    body: 'Tổng số tiền 5,650,000đ cho Phòng 201 (Tòa RealHome Cầu Giấy). Vui lòng thanh toán trước ngày 30/07/2026.',
    createdAt: '10 phút trước',
    isRead: false,
    link: '/customer/invoices',
  },
  {
    id: 'NOTIF-2',
    category: 'maintenance',
    title: 'Kỹ thuật viên đã tiếp nhận yêu cầu sửa chữa REQ-101',
    body: 'Chú Tuấn (Thợ điện lạnh) sẽ đến kiểm tra điều hòa phòng bạn vào khung giờ 14:00 - 17:00 hôm nay.',
    createdAt: '1 giờ trước',
    isRead: false,
    link: '/customer/maintenance',
  },
  {
    id: 'NOTIF-3',
    category: 'contract',
    title: 'Hợp đồng thuê phòng P.201 sắp hết hạn',
    body: 'Hợp đồng thuê phòng của bạn sẽ hết hạn vào ngày 31/08/2026. Bấm để gia hạn hợp đồng mới.',
    createdAt: '1 ngày trước',
    isRead: true,
    link: '/customer/contracts',
  },
  {
    id: 'NOTIF-4',
    category: 'system',
    title: 'Chào mừng bạn đến với hệ thống RealHome',
    body: 'Bạn có thể tra cứu hóa đơn, hợp đồng, gửi yêu cầu bảo trì và chat trực tiếp với AI bất cứ lúc nào.',
    createdAt: '3 ngày trước',
    isRead: true,
  },
];

const CATEGORY_CONFIG = {
  invoice: { label: 'Tài chính / Hóa đơn', icon: Receipt, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  contract: { label: 'Hợp đồng', icon: FileText, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  maintenance: { label: 'Bảo trì sự cố', icon: Wrench, color: 'text-cyan-500 bg-cyan-50 border-cyan-200' },
  system: { label: 'Hệ thống', icon: Info, color: 'text-slate-500 bg-slate-50 border-slate-200' },
};

export default function TenantNotificationsPage() {
  const { user, company } = useAuth();
  const { notifications: dbNotifs, markRead, markAllRead } = useNotifications(user?.id, company?.id);

  const [mockList, setMockList] = useState<CustomerNotificationItem[]>(INITIAL_MOCK_NOTIFS);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const list: CustomerNotificationItem[] = useMemo(() => {
    if (dbNotifs && dbNotifs.length > 0) {
      return dbNotifs.map((n: any) => ({
        id: n.id,
        category: n.type || 'system',
        title: n.title,
        body: n.content || n.message,
        createdAt: n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : 'Vừa xong',
        isRead: n.is_read || false,
        link: n.link || n.action_url,
      }));
    }
    return mockList;
  }, [dbNotifs, mockList]);

  const unreadCount = useMemo(() => list.filter((n) => !n.isRead).length, [list]);

  const filteredList = useMemo(() => {
    return list.filter((n) => activeCategory === 'all' || n.category === activeCategory);
  }, [list, activeCategory]);

  const handleMarkRead = (id: string) => {
    setMockList((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    markRead(id);
    toast.success('Đã đánh dấu là đã đọc');
  };

  const handleMarkAllRead = () => {
    setMockList((prev) => prev.map((n) => ({ ...n, isRead: true })));
    markAllRead();
    toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  const handleDelete = (id: string) => {
    setMockList((prev) => prev.filter((n) => n.id !== id));
    toast.success('Đã xóa thông báo');
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="h-7 w-7 text-amber-500" />
            Thông Báo Hệ Thống
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cập nhật nhắc nhở thanh toán hóa đơn, tiến độ hợp đồng &amp; yêu cầu sửa chữa.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllRead}
            variant="outline"
            className="rounded-xl border-amber-400 text-amber-700 hover:bg-amber-50 font-bold text-xs shrink-0"
          >
            <CheckCheck className="h-4 w-4 mr-1.5 text-amber-600" />
            Đánh dấu tất cả đã đọc ({unreadCount})
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeCategory === 'all'
              ? 'bg-slate-950 text-amber-400 shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Tất cả ({list.length})
        </button>
        {(Object.keys(CATEGORY_CONFIG) as Array<keyof typeof CATEGORY_CONFIG>).map((catKey) => {
          const cfg = CATEGORY_CONFIG[catKey];
          const count = list.filter((n) => n.category === catKey).length;
          const isSelected = activeCategory === catKey;

          return (
            <button
              key={catKey}
              onClick={() => setActiveCategory(catKey)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isSelected
                  ? 'bg-slate-950 text-amber-400 shadow-md'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <Card className="border-border-subtle rounded-2xl p-12 text-center text-slate-400">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-sm">Không có thông báo nào trong mục này.</p>
          </Card>
        ) : (
          filteredList.map((item) => {
            const cfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.system;
            const Icon = cfg.icon;

            return (
              <Card
                key={item.id}
                className={`border rounded-2xl transition-all ${
                  !item.isRead
                    ? 'border-amber-400/60 bg-amber-50/20 shadow-sm'
                    : 'border-border-subtle bg-white hover:border-slate-300'
                }`}
              >
                <CardContent className="p-4 md:p-5 flex items-start gap-4">
                  {/* Icon */}
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center border shrink-0 ${cfg.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm md:text-base ${!item.isRead ? 'font-bold text-slate-950' : 'font-semibold text-slate-800'}`}>
                          {item.title}
                        </h3>
                        {!item.isRead && (
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">{item.createdAt}</span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>

                    <div className="pt-2 flex items-center justify-between">
                      {item.link ? (
                        <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs text-amber-700 font-bold hover:underline">
                          <Link href={item.link} className="flex items-center gap-1">
                            <span>Xem chi tiết</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      ) : <span />}

                      <div className="flex items-center gap-1">
                        {!item.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkRead(item.id)}
                            className="h-7 text-xs text-slate-500 hover:text-slate-900 rounded-lg"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Đã đọc
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

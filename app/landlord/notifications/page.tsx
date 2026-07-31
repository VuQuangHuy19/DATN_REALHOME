'use client';

import { useState, useMemo, useEffect } from 'react';
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
  ChevronRight,
  Building2,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from '@/src/lib/hooks/useNotifications';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';

interface LandlordNotificationItem {
  id: string;
  category: 'contract' | 'invoice' | 'maintenance' | 'system';
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  link?: string;
}

const INITIAL_LANDLORD_NOTIFS: LandlordNotificationItem[] = [
  {
    id: 'L-NOTIF-1',
    category: 'maintenance',
    title: 'Khách thuê phòng P.405 gửi yêu cầu sửa điện',
    body: 'Trần Thị Thu (Tòa RealHome Studio Đống Đa) báo sự cố Aptomat bị nhảy liên tục.',
    createdAt: '15 phút trước',
    isRead: false,
    link: '/landlord/maintenance',
  },
  {
    id: 'L-NOTIF-2',
    category: 'invoice',
    title: 'Khách thuê phòng P.102 đã thanh toán hóa đơn tháng 07',
    body: 'Lê Hoàng Nam vừa thanh toán 4,850,000đ qua MoMo Banking.',
    createdAt: '1 giờ trước',
    isRead: false,
    link: '/landlord/invoices',
  },
  {
    id: 'L-NOTIF-3',
    category: 'contract',
    title: 'Hợp đồng phòng P.301 sắp hết hạn trong 15 ngày',
    body: 'Hợp đồng với anh Phạm Quốc Bảo sẽ kết thúc vào 10/08/2026. Bấm để gia hạn.',
    createdAt: '5 giờ trước',
    isRead: false,
    link: '/landlord/contracts',
  },
  {
    id: 'L-NOTIF-4',
    category: 'system',
    title: 'Báo cáo doanh thu tháng 07 đã được khởi tạo',
    body: 'Hệ thống RealHome đã tự động tính toán doanh thu và tỷ lệ lấp đầy phòng.',
    createdAt: '1 ngày trước',
    isRead: true,
    link: '/landlord',
  },
];

const CATEGORY_CONFIG = {
  maintenance: { label: 'Yêu cầu bảo trì', icon: Wrench, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  invoice: { label: 'Khách thanh toán', icon: Receipt, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
  contract: { label: 'Hợp đồng mới/Hạn', icon: FileText, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  system: { label: 'Hệ thống & SaaS', icon: Info, color: 'text-slate-500 bg-slate-50 border-slate-200' },
};

export default function LandlordNotificationsPage() {
  const { user, company } = useAuth();
  const { notifications: dbNotifs, markRead, markAllRead } = useNotifications(user?.id, company?.id);

  const [list, setList] = useState<LandlordNotificationItem[]>(INITIAL_LANDLORD_NOTIFS);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    if (dbNotifs && dbNotifs.length > 0) {
      const mapped: LandlordNotificationItem[] = dbNotifs.map((n: any) => ({
        id: n.id,
        category: (['contract', 'invoice', 'maintenance', 'system'].includes(n.type) ? n.type : 'system') as any,
        title: n.title,
        body: n.body || n.content || n.message || '',
        createdAt: n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : 'Vừa xong',
        isRead: Boolean(n.is_read),
        link: n.link || n.action_url || undefined,
      }));
      setList(mapped);
    }
  }, [dbNotifs]);

  const unreadCount = useMemo(() => list.filter((n) => !n.isRead).length, [list]);

  const filteredList = useMemo(() => {
    return list.filter((n) => activeCategory === 'all' || n.category === activeCategory);
  }, [list, activeCategory]);

  const handleMarkRead = (id: string) => {
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    markRead(id);
    toast.success('Đã đánh dấu là đã đọc');
  };

  const handleMarkAllRead = () => {
    setList((prev) => prev.map((n) => ({ ...n, isRead: true })));
    markAllRead();
    toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  const handleDelete = (id: string) => {
    setList((prev) => prev.filter((n) => n.id !== id));
    toast.success('Đã xóa thông báo');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="h-7 w-7 text-amber-500" />
            Thông Báo Quản Lý (Chủ Nhà)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Thông báo thời gian thực về thanh toán, bảo trì &amp; biến động hợp đồng phòng.
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
            <p className="font-medium text-sm">Không có thông báo nào.</p>
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
                            <span>Đi tới quản lý</span>
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

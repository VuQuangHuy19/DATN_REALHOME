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
  ChevronRight,
  Loader2
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

const CATEGORY_CONFIG = {
  invoice: { label: 'Tài chính / Hóa đơn', icon: Receipt, color: 'text-amber-500 bg-amber-50 border-amber-200' },
  contract: { label: 'Hợp đồng', icon: FileText, color: 'text-blue-500 bg-blue-50 border-blue-200' },
  maintenance: { label: 'Bảo trì sự cố', icon: Wrench, color: 'text-cyan-500 bg-cyan-50 border-cyan-200' },
  system: { label: 'Hệ thống', icon: Info, color: 'text-slate-500 bg-slate-50 border-slate-200' },
};

export default function TenantNotificationsPage() {
  const { user, company, role } = useAuth();
  const { notifications: dbNotifs, loading, markRead, markAllRead, refetch } = useNotifications(user?.id, company?.id, (role as string) || 'tenant');

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isTenant = (role as string) === 'tenant' || (role as string) === 'customer' || !role;

  const list: CustomerNotificationItem[] = useMemo(() => {
    if (!dbNotifs || dbNotifs.length === 0) return [];

    const salesTypes = [
      'appointment_new', 'appointment_created', 'appointment_claim', 'appointment_confirmed',
      'new_lead', 'lead_new', 'lead', 'checkin', 'check_in', 'checkout', 'audit', 'sales',
      'consultation', 'kyc_review', 'kyc_submitted'
    ];

    const salesKeywords = [
      'dẫn khách', 'check-in', 'checkin', 'xuất phát', 'lịch hẹn xem',
      'vừa đặt lịch', 'xem phòng mới', 'bấm xuất phát', 'timemark',
      'phê duyệt kyc', 'chú ý sale', 'sale '
    ];

    return dbNotifs
      .filter((n: any) => {
        if (!isTenant) return true;
        const type = (n.type || '').toLowerCase();
        const title = (n.title || '').toLowerCase();
        const body = (n.body || n.content || '').toLowerCase();

        if (salesTypes.some((st) => type === st || type.includes(st))) {
          return false;
        }
        if (salesKeywords.some((kw) => title.includes(kw) || body.includes(kw))) {
          return false;
        }
        return true;
      })
      .map((n: any) => {
        let cat: 'invoice' | 'contract' | 'maintenance' | 'system' = 'system';
        const typeStr = (n.type || '').toLowerCase();
        if (typeStr.includes('invoice') || typeStr.includes('finance') || typeStr.includes('payment')) {
          cat = 'invoice';
        } else if (typeStr.includes('contract') || typeStr.includes('deposit')) {
          cat = 'contract';
        } else if (typeStr.includes('maintenance') || typeStr.includes('repair')) {
          cat = 'maintenance';
        }

        return {
          id: n.id,
          category: cat,
          title: n.title,
          body: n.body || n.content || n.message || '',
          createdAt: n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : 'Vừa xong',
          isRead: n.is_read || false,
          link: n.link || n.action_url,
        };
      });
  }, [dbNotifs, isTenant]);

  const unreadCount = useMemo(() => list.filter((n) => !n.isRead).length, [list]);

  const filteredList = useMemo(() => {
    return list.filter((n) => activeCategory === 'all' || n.category === activeCategory);
  }, [list, activeCategory]);

  const handleMarkRead = async (id: string) => {
    try {
      setProcessingId(id);
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      markRead(id);
      await refetch();
      toast.success('Đã đánh dấu thông báo là đã đọc');
    } catch (err) {
      toast.error('Lỗi khi đánh dấu thông báo');
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      markAllRead();
      await refetch();
      toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
    } catch (err) {
      toast.error('Lỗi thao tác đánh dấu tất cả đã đọc');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setProcessingId(id);
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        toast.success('Đã xóa thông báo khỏi hệ thống');
        await refetch();
      } else {
        toast.error(json.message || 'Không thể xóa thông báo');
      }
    } catch (err) {
      toast.error('Lỗi kết nối khi xóa thông báo');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Bell className="h-7 w-7 text-amber-500" />
            Thông Báo Hệ Thống
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeCategory === 'all'
              ? 'bg-slate-950 text-amber-400 shadow-md'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
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
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
            <p className="text-xs text-slate-500">Đang tải thông báo từ hệ thống...</p>
          </Card>
        ) : filteredList.length === 0 ? (
          <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 bg-white dark:bg-slate-900">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30 text-amber-500" />
            <p className="font-bold text-sm text-slate-700 dark:text-slate-300">Chưa có thông báo nào từ Ban Quản Lý</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Các cập nhật mới nhất về hợp đồng, hóa đơn và yêu cầu sửa chữa sẽ được tự động hiển thị trực tiếp tại đây.
            </p>
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
                    ? 'border-amber-400/60 bg-amber-50/30 dark:bg-amber-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
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
                        <h3 className={`text-sm md:text-base ${!item.isRead ? 'font-extrabold text-slate-900 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
                          {item.title}
                        </h3>
                        {!item.isRead && (
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">{item.createdAt}</span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{item.body}</p>

                    <div className="pt-2 flex items-center justify-between">
                      {item.link ? (
                        <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs text-amber-700 dark:text-amber-400 font-bold hover:underline">
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
                            disabled={processingId === item.id}
                            onClick={() => handleMarkRead(item.id)}
                            className="h-7 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 rounded-lg font-bold"
                          >
                            {processingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1" /> Đã đọc
                              </>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={processingId === item.id}
                          onClick={() => handleDelete(item.id)}
                          className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          {processingId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
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

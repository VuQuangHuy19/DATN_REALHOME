'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Building2,
  CalendarDays,
  MessageSquare,
  Settings,
  UserSearch,
  Check,
  CheckCheck,
  Loader2,
  Receipt,
  Search,
  Plus,
  Send,
  ExternalLink,
  MailCheck,
  Clock,
  Sparkles,
  Inbox,
  Filter,
} from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from '@/src/lib/hooks/useNotifications';
import { getNotificationTypeConfig, FormattedNotificationBody } from '@/components/ui/NotificationFormatter';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';

const typeConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  lead: { label: 'Khách hàng CRM', icon: UserSearch, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  new_lead: { label: 'Lead mới', icon: UserSearch, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  appointment: { label: 'Lịch hẹn xem phòng', icon: CalendarDays, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  new_appointment: { label: 'Lịch hẹn mới', icon: CalendarDays, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  contract: { label: 'Hợp đồng thuê', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  contract_expiring: { label: 'Hợp đồng hết hạn', icon: Building2, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  consultation: { label: 'Nhật ký tư vấn', icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  invoice: { label: 'Hóa đơn & Thanh toán', icon: Receipt, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  system: { label: 'Hệ thống', icon: Settings, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  new_landlord: { label: 'Chủ bất động sản', icon: Building2, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function NotificationsPage() {
  const { user, company, hasPermission } = useAuth();
  const {
    notifications: list,
    loading,
    unreadCount,
    markRead,
    markAllRead,
    refetch,
  } = useNotifications(user?.id, company?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const mappedList = useMemo(() => {
    return list.map((n: any) => {
      let type: any = n.type;
      if (n.type === 'system') {
        if (
          n.title?.includes('Hóa đơn') ||
          n.body?.includes('Hóa đơn') ||
          n.body?.includes('hóa đơn')
        ) {
          type = 'invoice';
        } else if (
          n.title?.includes('Hợp đồng') ||
          n.body?.includes('Hợp đồng') ||
          n.body?.includes('hợp đồng')
        ) {
          type = 'contract';
        }
      }
      return { ...n, type };
    });
  }, [list]);

  const filtered = useMemo(() => {
    return mappedList.filter((n: any) => {
      const title = (n.title || '').toLowerCase();
      const body = (n.body || '').toLowerCase();
      const term = searchQuery.toLowerCase();

      const matchSearch = title.includes(term) || body.includes(term);
      const matchType = typeFilter === 'all' || n.type === typeFilter;
      const matchRead =
        readFilter === 'all' ||
        (readFilter === 'unread' && !n.is_read) ||
        (readFilter === 'read' && n.is_read);

      return matchSearch && matchType && matchRead;
    });
  }, [mappedList, searchQuery, typeFilter, readFilter]);

  const uniqueTypes = useMemo(
    () => Array.from(new Set(mappedList.map((n: any) => n.type as string))),
    [mappedList]
  );

  const readCount = useMemo(() => list.length - unreadCount, [list, unreadCount]);

  const handleSendNotification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const title = ((fd.get('title') as string) || '').trim();
    const bodyText = ((fd.get('body') as string) || '').trim();
    const type = (fd.get('type') as string) || 'system';
    const link = ((fd.get('link') as string) || '').trim();

    if (!title) {
      toast.error('Vui lòng nhập tiêu đề thông báo');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: company?.id,
          recipient_id: user?.id,
          recipient_role: 'user',
          type,
          title,
          body: bodyText,
          link: link || null,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.message || 'Lỗi phát thông báo');
      }

      toast.success('Đã phát thông báo mới thành công!');
      setIsCreateOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo thông báo');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink flex items-center gap-2.5">
            <Bell className="h-7 w-7 text-accent" /> Trung tâm Thông báo Hệ thống
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Theo dõi tất cả sự kiện, thông báo tự động từ leads, hợp đồng, hóa đơn và lịch hẹn thời gian thực.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={markAllRead}
              className="rounded-xl h-11 px-4 border-border font-bold text-xs gap-2 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
            >
              <CheckCheck className="h-4 w-4 text-emerald-600" /> Đánh dấu tất cả đã đọc
            </Button>
          )}

          {hasPermission('notifications.write') && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-white font-bold rounded-xl h-11 px-5 shadow-sm">
                  <Plus className="h-4 w-4 mr-2" /> Phát thông báo mới
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white p-6 rounded-2xl border border-border shadow-2xl">
                <DialogHeader className="pb-3 border-b border-border">
                  <DialogTitle className="font-heading font-extrabold text-lg text-ink flex items-center gap-2">
                    <Send className="h-5 w-5 text-accent" /> Soạn thông báo phát tới hệ thống
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSendNotification} className="space-y-4 pt-3">
                  <div>
                    <Label htmlFor="title" className="text-xs font-bold text-ink uppercase">
                      Tiêu đề thông báo <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      required
                      placeholder="VD: Cập nhật chính sách dịch vụ mới..."
                      className="rounded-xl h-10"
                    />
                  </div>

                  <div>
                    <Label htmlFor="body" className="text-xs font-bold text-ink uppercase">
                      Nội dung chi tiết
                    </Label>
                    <textarea
                      id="body"
                      name="body"
                      rows={3}
                      placeholder="Nhập chi tiết nội dung thông báo muốn truyền tải..."
                      className="w-full rounded-xl border border-border bg-white p-3 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="type" className="text-xs font-bold text-ink uppercase">
                        Loại thông báo
                      </Label>
                      <select
                        id="type"
                        name="type"
                        className="w-full h-10 rounded-xl border border-border bg-white px-3 text-xs font-medium text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="system">⚙️ Hệ thống</option>
                        <option value="lead">👥 Khách hàng CRM</option>
                        <option value="appointment">📅 Lịch hẹn</option>
                        <option value="contract">📜 Hợp đồng</option>
                        <option value="invoice">💰 Hóa đơn</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="link" className="text-xs font-bold text-ink uppercase">
                        Đường dẫn chi tiết
                      </Label>
                      <Input
                        id="link"
                        name="link"
                        placeholder="VD: /admin/contracts"
                        className="rounded-xl h-10 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                      className="rounded-xl h-10 px-4"
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      disabled={sending}
                      className="bg-accent hover:bg-accent/90 text-white font-bold rounded-xl h-10 px-6 gap-2"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Phát
                      thông báo
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-ink-muted">TỔNG THÔNG BÁO</p>
              <p className="text-2xl font-extrabold text-ink mt-1">{list.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <Bell className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-amber-600">CHƯA ĐỌC</p>
              <p className="text-2xl font-extrabold text-amber-700 mt-1">{unreadCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-600">ĐÃ ĐỌC</p>
              <p className="text-2xl font-extrabold text-emerald-700 mt-1">{readCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <MailCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border bg-white shadow-xs p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-indigo-600">PHÂN LOẠI SỰ KIỆN</p>
              <p className="text-2xl font-extrabold text-indigo-700 mt-1">{uniqueTypes.length}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Notification Card Container */}
      <Card className="rounded-2xl border border-border bg-white shadow-xs p-6 space-y-4">
        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
            <Input
              placeholder="Tìm theo tiêu đề hoặc nội dung thông báo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl h-10 border-border bg-bg-base/30 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Status Read Filter */}
            <div className="flex items-center bg-bg-base p-1 rounded-xl border border-border shrink-0">
              <button
                type="button"
                onClick={() => setReadFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  readFilter === 'all'
                    ? 'bg-white shadow-xs text-accent'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setReadFilter('unread')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  readFilter === 'unread'
                    ? 'bg-white shadow-xs text-amber-600'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Chưa đọc
              </button>
              <button
                type="button"
                onClick={() => setReadFilter('read')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  readFilter === 'read'
                    ? 'bg-white shadow-xs text-emerald-600'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Đã đọc
              </button>
            </div>

            {/* Type Category Dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-white px-3 text-xs font-medium text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent shrink-0"
            >
              <option value="all">Tất cả phân loại</option>
              {uniqueTypes.map((t: any) => {
                const tc = getNotificationTypeConfig(t);
                return (
                  <option key={t} value={t}>
                    {tc.label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-ink-muted font-medium">Đang tải thông báo realtime...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 border border-dashed border-border rounded-xl bg-bg-base/30">
            <Inbox className="h-10 w-10 mx-auto mb-2 text-ink-muted opacity-40" />
            <p className="text-sm font-bold text-ink">Chưa có thông báo nào</p>
            <p className="text-xs text-ink-muted mt-1">Các thông báo mới từ hệ thống sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((notif: any) => {
              const tc = getNotificationTypeConfig(notif.type, notif.title);
              const Icon = tc.icon;

              return (
                <div
                  key={notif.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all hover:shadow-xs group ${
                    notif.is_read
                      ? 'bg-white border-border'
                      : 'bg-amber-50/40 border-amber-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${tc.bg} ${tc.border} border`}
                    >
                      <Icon className={`h-5 w-5 ${tc.color}`} />
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={`text-sm text-ink ${
                            notif.is_read ? 'font-semibold' : 'font-extrabold text-accent'
                          }`}
                        >
                          {notif.title}
                        </h4>
                        {!notif.is_read && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        )}
                      </div>

                      <FormattedNotificationBody body={notif.body} />

                      <div className="flex items-center gap-3 pt-1.5 flex-wrap">
                        <Badge variant="outline" className={`font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-md ${tc.badgeClass}`}>
                          {tc.label}
                        </Badge>
                        <span className="text-[11px] text-ink-muted font-mono flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDate(notif.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {notif.link && (
                      <Link href={notif.link}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-xl text-xs font-bold border-accent/30 text-accent hover:bg-accent/10 gap-1.5"
                        >
                          Xem chi tiết <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    )}

                    {!notif.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markRead(notif.id)}
                        className="h-8 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 gap-1"
                        title="Đánh dấu đã đọc"
                      >
                        <Check className="h-3.5 w-3.5" /> Đã đọc
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

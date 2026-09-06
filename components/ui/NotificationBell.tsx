'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Bell,
  CheckCheck,
  Calendar,
  User,
  MapPin,
  Check,
  ChevronRight,
  Sparkles,
  Info,
  Clock,
  Phone,
  Shield,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { subscribeToUserNotifications } from '@/lib/notifications/realtimeSubscriber';
import { confirmAppointmentService } from '@/features/notifications/services/appointmentNotificationService';
import { getNotificationTypeConfig, FormattedNotificationBody } from '@/components/ui/NotificationFormatter';

export function NotificationBell() {
  const { user, profile, role } = useAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'appointments' | 'system'>('appointments');
  const [newArrivalId, setNewArrivalId] = useState<string | null>(null);

  const isLandlord = role === 'landlord';

  // 1. Initial Fetch Notifications
  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('userId', user.id);
        if (profile?.company_id) params.set('companyId', profile.company_id);

        const res = await fetch(`/api/notifications?${params.toString()}`);
        const json = await res.json();

        if (json.success && Array.isArray(json.data)) {
          setNotifications(json.data);
        }
      } catch (err) {
        console.error('Fetch notifications error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Realtime Listener
    const unsubscribe = subscribeToUserNotifications(user.id, (newNotif) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setNewArrivalId(newNotif.id);
      toast.info(`🔔 ${newNotif.title || 'Thông báo mới'}`);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  // 2. Unread Count
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  // Filter Tab List
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      const isAppointmentType =
        n.type === 'appointment_new' ||
        n.type === 'appointment_created' ||
        n.type === 'appointment_confirmed' ||
        (n.title && (n.title.toLowerCase().includes('lịch hẹn') || n.title.toLowerCase().includes('đặt lịch')));

      if (activeTab === 'appointments') return isAppointmentType;
      return !isAppointmentType;
    });
  }, [notifications, activeTab]);

  // 3. Mark Single as Read
  const handleItemClick = async (item: any) => {
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      await fetch(`/api/notifications/${item.id}/read`, { method: 'POST' }).catch(() => {});
    }

    if (item.link) {
      setIsOpen(false);
      router.push(item.link);
    }
  };

  // 4. Mark All Read
  const handleMarkAllRead = async () => {
    if (!user?.id || unreadCount === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    toast.success('Đã đánh dấu tất cả là đã đọc');

    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    }).catch(() => {});
  };

  // 5. Inline Action: Confirm Appointment
  const handleConfirmAppointmentInline = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    const appointmentId = item.appointment_id || item.data?.appointmentId || item.id;

    if (!appointmentId) {
      toast.error('Không tìm thấy thông tin lịch hẹn');
      return;
    }

    try {
      toast.loading('Đang xử lý tiếp nhận lịch hẹn...', { id: 'confirm-apt' });

      await confirmAppointmentService({
        appointment_id: appointmentId,
        sale_id: user?.id || '',
        sale_name: profile?.full_name || 'Sale',
        sale_phone: profile?.phone || '',
      });

      toast.success('⚡ Tiếp nhận lịch hẹn thành công!', { id: 'confirm-apt' });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === item.id ? { ...n, is_read: true, title: '✅ Lịch hẹn đã được bạn xác nhận' } : n
        )
      );
    } catch (err: any) {
      toast.error(err.message || 'Không thể tiếp nhận lịch hẹn', { id: 'confirm-apt' });
    }
  };

  // Helper Avatar Icon
  const getNotificationAvatarConfig = (type: string, title: string) => {
    const titleLower = (title || '').toLowerCase();
    if (type === 'appointment_new' || titleLower.includes('mới')) {
      return {
        bg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
        icon: <Calendar className="h-5 w-5" />,
        endIcon: <Sparkles className="h-4 w-4 text-emerald-500" />,
      };
    }
    if (type === 'appointment_confirmed' || titleLower.includes('xác nhận')) {
      return {
        bg: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
        icon: <Check className="h-5 w-5" />,
        endIcon: <Shield className="h-4 w-4 text-blue-500" />,
      };
    }
    return {
      bg: 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-300',
      icon: <Info className="h-5 w-5" />,
      endIcon: <ChevronRight className="h-4 w-4 text-slate-400" />,
    };
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' · ' + date.toLocaleDateString('vi-VN');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors rounded-xl h-9 w-9"
        >
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-red-600 rounded-full text-white text-[10px] font-extrabold flex items-center justify-center border-2 border-white dark:border-zinc-900 animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="p-3.5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/70 dark:bg-zinc-900/90">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Thông báo</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full">
                {unreadCount} chưa đọc
              </span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Đã đọc tất cả
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/40 p-1 gap-1">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'appointments'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            📋 Lịch hẹn
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'system'
                ? 'bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            ⚙️ Hệ thống
          </button>
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> Đang tải thông báo...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Không có thông báo nào trong mục này
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const isNew = item.id === newArrivalId;
              const avatarConfig = getNotificationAvatarConfig(item.type, item.title);
              const dataObj = typeof item.data === 'object' ? item.data : {};

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 transition-all cursor-pointer relative group flex gap-3 items-start ${
                    !item.is_read
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-100/40 dark:hover:bg-indigo-900/30'
                      : 'hover:bg-slate-50 dark:hover:bg-zinc-800/50 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${avatarConfig.bg}`}>
                    {avatarConfig.icon}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        className={`text-xs sm:text-sm leading-tight tracking-tight ${
                          !item.is_read
                            ? 'font-extrabold text-slate-900 dark:text-slate-100'
                            : 'font-semibold text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {item.title}
                      </h4>
                    </div>

                    <FormattedNotificationBody body={item.body} />

                    {/* Meta Payload Details */}
                    {(dataObj.customerName || dataObj.roomCode) && (
                      <div className="mt-2 p-2 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200/80 dark:border-slate-700/60 text-[11px] space-y-1 shadow-2xs">
                        {dataObj.customerName && (
                          <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                            <span className="flex items-center gap-1 font-semibold">
                              <User className="h-3 w-3 text-blue-500" /> Khách: {dataObj.customerName}
                            </span>
                            {dataObj.customerPhoneMasked && (
                              <span className="font-mono text-slate-500 bg-slate-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-[10px]">
                                {dataObj.customerPhoneMasked}
                              </span>
                            )}
                          </div>
                        )}

                        {dataObj.roomCode && (
                          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-emerald-500" /> Phòng: <strong>{dataObj.roomCode}</strong>
                            </span>
                            {dataObj.appointmentTime && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                🕒 {dataObj.appointmentTime}
                              </span>
                            )}
                          </div>
                        )}

                        {isLandlord && dataObj.saleName && (
                          <div className="pt-1 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-blue-600 dark:text-blue-400 font-bold">
                            <span>👤 Sale: {dataObj.saleName}</span>
                            <span className="flex items-center gap-1 font-mono text-[11px] bg-blue-50 dark:bg-blue-950 px-1.5 py-0.5 rounded">
                              <Phone className="h-3 w-3" /> {dataObj.salePhoneFull}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inline Action Button for Sale / Admin */}
                    {item.type === 'appointment_new' && !item.is_read && (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          onClick={(e) => handleConfirmAppointmentInline(e, item)}
                          className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                        >
                          <Check className="h-4 w-4" /> ⚡ Xác nhận lịch hẹn ngay
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatRelativeTime(item.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between self-stretch shrink-0 pt-0.5 pb-1">
                    {!item.is_read ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200 dark:ring-blue-900 animate-pulse" />
                    ) : (
                      <span className="w-2.5 h-2.5" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-zinc-900/90 text-center">
          <Link
            href={isLandlord ? '/landlord' : '/admin/system/notifications'}
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline gap-1 py-1 transition-colors"
          >
            Xem tất cả thông báo <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

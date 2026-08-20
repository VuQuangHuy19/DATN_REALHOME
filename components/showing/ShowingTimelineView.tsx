'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Clock, MapPin, Calendar, CheckCircle2, Navigation,
  ChevronRight, Phone, ShieldCheck, UserCheck, Flame, User, Filter
} from 'lucide-react';
import { getAreaColorClass } from '@/lib/utils/colors';
import type { DBAppointment } from '@/lib/supabase/types';

interface ShowingTimelineViewProps {
  appointments: DBAppointment[];
  onOpenDetail: (appointment: DBAppointment) => void;
  onClaim?: (appointment: DBAppointment) => void;
}

export function ShowingTimelineView({ appointments, onOpenDetail, onClaim }: ShowingTimelineViewProps) {
  // Helper to format Date object to YYYY-MM-DD local string
  const formatYMD = (d: Date) => {
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
  };

  const todayStr = useMemo(() => formatYMD(new Date()), []);
  
  const default7DaysStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatYMD(d);
  }, []);

  const default30DaysStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatYMD(d);
  }, []);

  // Default to 1 week (Today -> Today + 7 days)
  const [fromDate, setFromDate] = useState<string>(todayStr);
  const [toDate, setToDate] = useState<string>(default7DaysStr);

  const setPreset7Days = () => { setFromDate(todayStr); setToDate(default7DaysStr); };
  const setPresetToday = () => { setFromDate(todayStr); setToDate(todayStr); };
  const setPreset30Days = () => { setFromDate(todayStr); setToDate(default30DaysStr); };
  const setPresetAll = () => { setFromDate(''); setToDate(''); };

  // Filter & sort appointments by date ascending, then time ascending
  const timelineItems = useMemo(() => {
    let list = [...appointments];
    if (fromDate) {
      list = list.filter((a) => a.date >= fromDate);
    }
    if (toDate) {
      list = list.filter((a) => a.date <= toDate);
    }
    // Sort by date ascending, then time ascending
    return list.sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.time.localeCompare(b.time);
    });
  }, [appointments, fromDate, toDate]);

  // Statistics summary for current view
  const stats = useMemo(() => {
    const total = timelineItems.length;
    const checkedIn = timelineItems.filter(
      (a) => (a as any).checkin_status === 'checked_in_gps' || (a as any).checkin_status === 'checked_in_photo' || a.status === 'completed'
    ).length;
    const onTheWay = timelineItems.filter((a) => a.status === 'on_the_way' || (a as any).on_the_way_at).length;
    const dealed = timelineItems.filter((a) => a.status === 'Dealed' || (a as any).result_status === 'deposit_pending').length;
    const pending = total - checkedIn - onTheWay;

    return { total, checkedIn, onTheWay, dealed, pending: pending > 0 ? pending : 0 };
  }, [timelineItems]);

  const formatDateLabel = (dateStr: string) => {
    if (!dateStr) return 'Tất cả các ngày';
    if (dateStr === todayStr) return `Hôm nay (${new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })})`;
    return new Date(dateStr).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* QUICK DATE SELECTOR BAR (2 Ô LỊCH: TỪ NGÀY — ĐẾN NGÀY) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <span>Lịch trình dẫn khách của Sale</span>
            </div>

            {/* Quick Date Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant={fromDate === todayStr && toDate === default7DaysStr ? 'default' : 'outline'}
                size="sm"
                onClick={setPreset7Days}
                className={`h-8 text-xs font-semibold rounded-xl ${
                  fromDate === todayStr && toDate === default7DaysStr ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold' : 'border-slate-200 text-slate-700'
                }`}
              >
                1 Tuần
              </Button>
              <Button
                variant={fromDate === todayStr && toDate === todayStr ? 'default' : 'outline'}
                size="sm"
                onClick={setPresetToday}
                className={`h-8 text-xs font-semibold rounded-xl ${
                  fromDate === todayStr && toDate === todayStr ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold' : 'border-slate-200 text-slate-700'
                }`}
              >
                Hôm nay
              </Button>
              <Button
                variant={fromDate === todayStr && toDate === default30DaysStr ? 'default' : 'outline'}
                size="sm"
                onClick={setPreset30Days}
                className={`h-8 text-xs font-semibold rounded-xl ${
                  fromDate === todayStr && toDate === default30DaysStr ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold' : 'border-slate-200 text-slate-700'
                }`}
              >
                30 ngày
              </Button>
              <Button
                variant={!fromDate && !toDate ? 'default' : 'outline'}
                size="sm"
                onClick={setPresetAll}
                className={`h-8 text-xs font-semibold rounded-xl ${
                  !fromDate && !toDate ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold' : 'border-slate-200 text-slate-700'
                }`}
              >
                Tất cả
              </Button>
            </div>
          </div>

          {/* 2 Ô CHỌN LỊCH: [ô lịch] đến [ô lịch] */}
          <div className="flex items-center gap-2 flex-wrap bg-slate-50 border border-slate-200/80 p-2 rounded-xl text-xs font-semibold text-slate-700">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 flex-1 min-w-[130px] border border-slate-200 rounded-lg px-2.5 bg-white text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
            />
            <span className="text-slate-500 font-bold px-1">đến</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 flex-1 min-w-[130px] border border-slate-200 rounded-lg px-2.5 bg-white text-xs font-mono font-bold text-slate-800 outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
            />
          </div>
        </div>

        {/* SUMMARY STATS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-slate-500 font-semibold block uppercase">Tổng ca dẫn</span>
            <span className="text-lg font-black text-slate-900">{stats.total} ca</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-blue-700 font-semibold block uppercase">Đang di chuyển</span>
            <span className="text-lg font-black text-blue-800">{stats.onTheWay} ca</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-emerald-700 font-semibold block uppercase">Đã Check-in</span>
            <span className="text-lg font-black text-emerald-800">{stats.checkedIn} ca</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-amber-700 font-semibold block uppercase">🎉 Chốt cọc</span>
            <span className="text-lg font-black text-amber-900">{stats.dealed} ca</span>
          </div>
        </div>
      </div>

      {/* TIMELINE LIST VIEW */}
      {timelineItems.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 p-8 text-center bg-white">
          <Clock className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 text-sm">Không có lịch hẹn nào trong thời gian này</p>
          <p className="text-slate-400 text-xs mt-1">Hãy thử chọn mốc ngày khác hoặc thêm yêu cầu đặt lịch hẹn mới.</p>
        </Card>
      ) : (
        <div className="relative pl-4 sm:pl-6 space-y-4 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {timelineItems.map((item, idx) => {
            const isCheckedIn = (item as any).checkin_status === 'checked_in_gps' || (item as any).checkin_status === 'checked_in_photo' || item.status === 'completed';
            const isOnTheWay = item.status === 'on_the_way' || !!(item as any).on_the_way_at;
            const isDealed = item.status === 'Dealed' || (item as any).result_status === 'deposit_pending';

            return (
              <div key={item.id} className="relative group">
                {/* Timeline node dot */}
                <div
                  className={`absolute -left-[23px] sm:-left-[31px] top-4 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm z-10 ${
                    isDealed
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                      : isCheckedIn
                      ? 'bg-green-600 text-white ring-4 ring-green-100'
                      : isOnTheWay
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                      : 'bg-amber-500 text-white ring-4 ring-amber-100'
                  }`}
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>

                {/* Timeline Card */}
                <div
                  onClick={() => onOpenDetail(item)}
                  className={`p-4 border rounded-2xl bg-white shadow-xs space-y-3 cursor-pointer transition-all hover:shadow-md hover:border-indigo-200 active:scale-[0.99] ${
                    isDealed
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : isCheckedIn
                      ? 'border-green-200 bg-green-50/10'
                      : isOnTheWay
                      ? 'border-blue-200 bg-blue-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Top Bar: Time Slot & Badges */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-base text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg shadow-xs">
                        ⏰ {item.time}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {formatDateLabel(item.date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!item.assigned_to ? (
                        <Badge className="bg-amber-500 text-white border-0 text-[10px] font-extrabold animate-pulse">
                          ⚠️ Chưa phân công
                        </Badge>
                      ) : isDealed ? (
                        <Badge className="bg-emerald-600 text-white border-0 text-[10px]">
                          🎉 Chốt cọc
                        </Badge>
                      ) : isCheckedIn ? (
                        <Badge className="bg-green-600 text-white border-0 text-[10px]">
                          ✅ Đã Check-in
                        </Badge>
                      ) : isOnTheWay ? (
                        <Badge className="bg-blue-600 text-white border-0 text-[10px] animate-pulse">
                          🚘 Đang di chuyển
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px]">
                          ⏳ Chờ xuất phát
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Main Content: Room Title & Address */}
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span className="text-indigo-950">{item.room_title || 'Căn hộ xem phòng'}</span>
                      </div>
                      {item.area && (
                        <Badge variant="outline" className={`shrink-0 text-[10px] ${getAreaColorClass(item.area)}`}>
                          {item.area}
                        </Badge>
                      )}
                    </div>

                    {(item.building_address || item.notes) && (
                      <p className="text-xs text-slate-600 pl-5 leading-relaxed font-medium">
                        📍 {item.building_address || item.notes}
                      </p>
                    )}
                  </div>

                  {/* Bottom Bar: Customer Info & Sale Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0 text-xs">
                        {item.customer_name?.[0] || 'K'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{item.customer_name}</div>
                        <div className="font-mono text-[11px] text-slate-500">{item.customer_phone}</div>
                      </div>
                    </div>

                    {!item.assigned_to ? (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onClaim) onClaim(item);
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold h-8 text-[11px] px-3 rounded-xl gap-1 shadow-sm animate-pulse"
                      >
                        <Flame className="h-3.5 w-3.5 text-yellow-300" />
                        <span>✋ Nhận dẫn ngay</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetail(item);
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-8 text-[11px] px-3 rounded-xl gap-1"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                        <span>Quy trình Dẫn</span>
                        <ChevronRight className="h-3 w-3 opacity-70" />
                      </Button>
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

'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Clock, MapPin, Calendar, CheckCircle2, Phone, ShieldCheck,
  Flame, User, Sparkles, PhoneCall, MessageSquare, Link as LinkIcon,
  CheckCheck, ArrowRight, ChevronRight, Search
} from 'lucide-react';
import { usePublicListings } from '@/lib/hooks/usePublicListings';
import { useAppointments } from '@/lib/hooks/useAppointments';
import type { CustomerListing } from '@/lib/customer/types';
import type { DBLead } from '@/lib/supabase/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { maskHouseNumberInBuildingName } from '@/lib/utils';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; border: string }> = {
  new:         { label: 'Mới',          color: 'bg-rose-50 text-rose-700', border: 'border-rose-200' },
  consulting:  { label: 'Đang tư vấn',  color: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
  appointment: { label: 'Hẹn xem',      color: 'bg-purple-50 text-purple-700', border: 'border-purple-200' },
  viewed:      { label: 'Đã xem phòng', color: 'bg-teal-50 text-teal-700', border: 'border-teal-200' },
  deposited:   { label: 'Đã cọc',       color: 'bg-orange-50 text-orange-700', border: 'border-orange-200' },
  rented:      { label: 'Đã thuê',      color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
  cancelled:   { label: 'Đã hủy',       color: 'bg-slate-50 text-slate-700', border: 'border-slate-200' },
  contacted:   { label: 'Đã liên hệ',   color: 'bg-cyan-50 text-cyan-700', border: 'border-cyan-200' },
  won:         { label: 'Thành công',   color: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
  lost:        { label: 'Thất bại',     color: 'bg-rose-50 text-rose-700', border: 'border-rose-200' },
};

function SmartRoomMatcher({
  lead,
  listings,
  onBookAppointment,
}: {
  lead: DBLead;
  listings: CustomerListing[];
  onBookAppointment?: (room: CustomerListing) => void;
}) {
  const { user, profile } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const matchedRooms = useMemo(() => {
    if (!listings || listings.length === 0) return [];

    const leadArea = (lead.preferred_area || '').toLowerCase().trim();
    const leadRoomType = (lead.preferred_room_type || '').toLowerCase().trim();
    const maxPrice = lead.budget > 0 ? lead.budget * 1.15 : 999000000;

    return listings
      .filter((room) => {
        if (lead.budget > 0 && room.price > maxPrice) return false;

        if (leadArea) {
          const roomArea = (room.area || '').toLowerCase();
          const roomAddress = (room.address || '').toLowerCase();
          const roomBuilding = (room.buildingName || '').toLowerCase();
          const matchesLocation =
            roomArea.includes(leadArea) ||
            roomAddress.includes(leadArea) ||
            roomBuilding.includes(leadArea);
          if (!matchesLocation) return false;
        }

        if (leadRoomType) {
          const rType = (room.roomType || '').toLowerCase();
          if (!rType.includes(leadRoomType) && !leadRoomType.includes(rType)) {
            // Soft match
          }
        }

        return true;
      })
      .slice(0, 3);
  }, [listings, lead]);

  const handleCopyLink = (e: React.MouseEvent, room: CustomerListing) => {
    e.preventDefault();
    e.stopPropagation();
    const baseUrl = `${window.location.origin}/customer/properties/rooms/${room.id}`;
    const saleId = user?.id || profile?.id;
    const finalUrl = saleId ? `${baseUrl}?ref=${saleId}` : baseUrl;

    navigator.clipboard.writeText(finalUrl).then(() => {
      setCopiedId(room.id);
      toast.success(`Đã copy link phòng ${(room as any).code || room.title}!`, {
        description: 'Đã đính kèm mã Sale ref của bạn. Gửi ngay Zalo cho khách.',
      });
      setTimeout(() => setCopiedId(null), 2500);
    });
  };

  if (matchedRooms.length === 0) {
    return (
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium text-slate-500">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Chưa có phòng trùng khớp chính xác ngân sách/khu vực
        </span>
        <a
          href="/broker/rooms"
          className="text-amber-600 font-bold hover:underline flex items-center gap-0.5"
        >
          Xem kho phòng <ArrowRight className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-slate-900 border border-amber-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          Hệ thống Gợi ý {matchedRooms.length} Phòng Trùng Khớp Yêu Cầu:
        </span>
        <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Tự động matching</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {matchedRooms.map((room) => (
          <div
            key={room.id}
            className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-amber-200/80 dark:border-slate-700 flex flex-col justify-between gap-2.5 shadow-2xs hover:border-amber-400 transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-1">
                <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                  Phòng {(room as any).code || room.title}
                </h4>
                <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400 text-xs shrink-0">
                  {room.price.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                📍 {maskHouseNumberInBuildingName(room.buildingName || room.address)}
              </p>
            </div>

            <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700">
              <Button
                variant="outline"
                size="sm"
                className={`h-7 px-2.5 text-xs font-bold flex-1 rounded-lg transition-all ${
                  copiedId === room.id
                    ? 'border-emerald-400 text-emerald-700 bg-emerald-50'
                    : 'border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100'
                }`}
                onClick={(e) => handleCopyLink(e, room)}
              >
                {copiedId === room.id ? (
                  <>
                    <CheckCheck className="h-3 w-3 mr-1 text-emerald-600" /> Đã copy link
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-3 w-3 mr-1 text-amber-600" /> Copy Link Gửi Khách
                  </>
                )}
              </Button>

              {onBookAppointment && (
                <Button
                  size="sm"
                  className="h-7 px-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shrink-0 shadow-2xs"
                  onClick={() => onBookAppointment(room)}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1" /> Hẹn xem
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LeadTimelineViewProps {
  leads: DBLead[];
  onOpenDetail: (id: string) => void;
  onCreateAppointment?: (lead: DBLead, room?: CustomerListing) => void;
}

export function LeadTimelineView({
  leads,
  onOpenDetail,
  onCreateAppointment,
}: LeadTimelineViewProps) {
  const { company } = useAuth();
  const { listings } = usePublicListings(company?.id || null, false);
  const { items: aptList } = useAppointments(company?.id || undefined);

  const formatYMD = (d: Date) => {
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
  };

  const todayStr = useMemo(() => formatYMD(new Date()), []);
  const past7DaysStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return formatYMD(d);
  }, []);
  const future7DaysStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatYMD(d);
  }, []);
  const past30DaysStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return formatYMD(d);
  }, []);

  const [fromDate, setFromDate] = useState<string>(past7DaysStr);
  const [toDate, setToDate] = useState<string>(future7DaysStr);
  const [searchQuery, setSearchQuery] = useState('');

  const setPreset7Days = () => { setFromDate(past7DaysStr); setToDate(future7DaysStr); };
  const setPresetToday = () => { setFromDate(todayStr); setToDate(todayStr); };
  const setPreset30Days = () => { setFromDate(past30DaysStr); setToDate(future7DaysStr); };
  const setPresetAll = () => { setFromDate(''); setToDate(''); };

  // Calculate task priority & date filtering
  const filteredLeads = useMemo(() => {
    let list = [...leads];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.full_name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          (l.preferred_area || '').toLowerCase().includes(q)
      );
    }

    if (fromDate) {
      list = list.filter((l) => l.created_at.split('T')[0] >= fromDate);
    }
    if (toDate) {
      list = list.filter((l) => l.created_at.split('T')[0] <= toDate);
    }

    return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [leads, searchQuery, fromDate, toDate]);

  // Statistics Summary (Soft pastel style matching AppointmentsPage)
  const stats = useMemo(() => {
    const total = filteredLeads.length;
    const urgent = filteredLeads.filter((l) => l.status === 'new').length;
    const consulting = filteredLeads.filter((l) => l.status === 'consulting' || l.status === 'contacted').length;
    const appointment = filteredLeads.filter((l) => l.status === 'appointment' || l.status === 'viewed' || l.status === 'deposited').length;

    return { total, urgent, consulting, appointment };
  }, [filteredLeads]);

  const cleanPhone = (p?: string | null) => (p || '').replace(/\D/g, '');

  return (
    <div className="space-y-4">
      {/* QUICK DATE & PRESET FILTER BAR (Matching AppointmentsPage) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-sm">
              <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Lịch trình chăm sóc Khách hàng của Sale</span>
            </div>

            {/* Quick Date Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant={fromDate === past7DaysStr && toDate === future7DaysStr ? 'default' : 'outline'}
                size="sm"
                onClick={setPreset7Days}
                className={`h-8 text-xs font-semibold rounded-xl ${
                  fromDate === past7DaysStr && toDate === future7DaysStr
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                1 Tuần
              </Button>
              <Button
                variant={fromDate === todayStr && toDate === todayStr ? 'default' : 'outline'}
                size="sm"
                onClick={setPresetToday}
                className={`h-8 text-xs font-semibold rounded-xl ${
                  fromDate === todayStr && toDate === todayStr
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Hôm nay
              </Button>
              <Button
                variant={fromDate === past30DaysStr && toDate === future7DaysStr ? 'default' : 'outline'}
                size="sm"
                onClick={setPreset30Days}
                className={`h-8 text-xs font-semibold rounded-xl ${
                  fromDate === past30DaysStr && toDate === future7DaysStr
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                30 ngày
              </Button>
              <Button
                variant={!fromDate && !toDate ? 'default' : 'outline'}
                size="sm"
                onClick={setPresetAll}
                className={`h-8 text-xs font-semibold rounded-xl ${
                  !fromDate && !toDate
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Tất cả
              </Button>
            </div>
          </div>

          {/* Search Input & 2 Date Pickers */}
          <div className="flex items-center gap-2 flex-wrap bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder="Tìm theo tên, SĐT hoặc khu vực..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 rounded-lg placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
              />
            </div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 min-w-[130px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
            />
            <span className="text-slate-500 dark:text-slate-400 font-bold px-0.5">đến</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 min-w-[130px] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
            />
          </div>
        </div>

        {/* SUMMARY STATS BAR (Soft Pastel Style 100% matching AppointmentsPage) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold block uppercase">TỔNG KHÁCH HÀNG</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{stats.total} khách</span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold block uppercase">CẦN LIÊN HỆ NGAY</span>
            <span className="text-lg font-black text-blue-800 dark:text-blue-200">{stats.urgent} khách</span>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold block uppercase">ĐANG TƯ VẤN PHÒNG</span>
            <span className="text-lg font-black text-emerald-800 dark:text-emerald-200">{stats.consulting} khách</span>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl p-2.5 text-center">
            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold block uppercase">HẸN XEM / CHỐT CỌC</span>
            <span className="text-lg font-black text-amber-900 dark:text-amber-200">{stats.appointment} khách</span>
          </div>
        </div>
      </div>

      {/* TIMELINE LIST VIEW */}
      {filteredLeads.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-900">
          <Clock className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">Không có lead nào trong thời gian này</p>
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Hãy thử chọn mốc ngày khác hoặc thêm lead mới.</p>
        </Card>
      ) : (
        <div className="relative pl-4 sm:pl-6 space-y-4 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {filteredLeads.map((lead) => {
            const sc = statusConfig[lead.status] || statusConfig.new;
            const phoneClean = cleanPhone(lead.phone);

            // Find matching appointment to get exact Date, Time, and Room Address
            const matchedApt = aptList.find(
              (a) => a.lead_id === lead.id || (a.customer_phone && cleanPhone(a.customer_phone) === phoneClean)
            );

            // 1. Date
            let displayDate = new Date(lead.created_at).toLocaleDateString('vi-VN');
            if (matchedApt?.date) {
              const parts = matchedApt.date.split('-');
              if (parts.length === 3) {
                displayDate = `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
              } else {
                displayDate = matchedApt.date;
              }
            }

            // 2. Time
            let displayTime = matchedApt?.time || null;
            if (!displayTime) {
              const createdDate = new Date(lead.created_at);
              displayTime = createdDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            }

            // 3. Room & Building Address
            let displayRoomAddress = matchedApt?.room_title || matchedApt?.building_address || lead.interest || null;
            if (!displayRoomAddress && lead.preferred_area) {
              displayRoomAddress = `Khu vực: ${lead.preferred_area}`;
            }

            // 4. Smart lookup for room type, budget & area from public listings if missing or mismatch on lead row
            let matchedRoomInListings: CustomerListing | null = null;
            if (listings && listings.length > 0) {
              if (matchedApt?.room_id) {
                matchedRoomInListings = listings.find((l) => l.id === matchedApt.room_id) || null;
              }
              if (!matchedRoomInListings) {
                const rawQuery = (displayRoomAddress || lead.interest || lead.preferred_area || '').toLowerCase();
                const normalizeStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9a-ăâáắấàằầảẳẩãẵẫạặậđèêéếềẻểẽễẹệìỉíịòôơóốớồờỏổởõỗỡọộợùưúứừủửũữụựỳỷỹỵ]/g, '');
                const queryNorm = normalizeStr(rawQuery);

                if (queryNorm) {
                  matchedRoomInListings = listings.find((l) => {
                    const bNameNorm = normalizeStr(l.buildingName || '');
                    const addrNorm = normalizeStr(l.address || '');
                    const titleNorm = normalizeStr(l.title || '');
                    return (
                      (bNameNorm && (queryNorm.includes(bNameNorm) || bNameNorm.includes(queryNorm))) ||
                      (addrNorm && (queryNorm.includes(addrNorm) || addrNorm.includes(queryNorm))) ||
                      (titleNorm && (queryNorm.includes(titleNorm) || titleNorm.includes(queryNorm)))
                    );
                  }) || null;
                }
              }
            }

            const rawQueryLow = (displayRoomAddress || lead.interest || '').toLowerCase();
            const resolvedArea = matchedRoomInListings?.area || (
              rawQueryLow.includes('trần duy hưng') || rawQueryLow.includes('tran duy hung') ? 'Cầu Giấy' : lead.preferred_area || null
            );

            const resolvedRoomType = lead.preferred_room_type || matchedRoomInListings?.roomType || null;
            const resolvedBudget = lead.budget > 0 ? lead.budget : (matchedRoomInListings?.price || 0);

            return (
              <div key={lead.id} className="relative group">
                {/* Timeline node dot */}
                <div className="absolute -left-[23px] sm:-left-[31px] top-4 h-5 w-5 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950 shadow-sm z-10">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>

                {/* Timeline Card */}
                <div
                  onClick={() => onOpenDetail(lead.id)}
                  className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-xs space-y-3 cursor-pointer transition-all hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-600 active:scale-[0.99]"
                >
                  {/* Top Bar: Tên khách | Ngày | Giờ | Phòng - Địa chỉ | Trạng thái */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                      {/* 1. Tên khách */}
                      <span className="font-heading font-black text-sm sm:text-base text-indigo-950 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-xl shadow-2xs shrink-0 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>{lead.full_name}</span>
                      </span>

                      {/* 2. Ngày xem */}
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl flex items-center gap-1 font-mono shrink-0 shadow-2xs">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>{displayDate}</span>
                      </span>

                      {/* 3. Giờ xem */}
                      {displayTime && (
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 px-2.5 py-1 rounded-xl flex items-center gap-1 font-mono shrink-0 shadow-2xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>{displayTime}</span>
                        </span>
                      )}

                      {/* 4. Phòng - Địa chỉ tòa nhà */}
                      {displayRoomAddress && (
                        <span className="text-xs font-extrabold text-teal-900 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 px-3 py-1 rounded-xl flex items-center gap-1.5 min-w-0 max-w-full sm:max-w-md truncate shadow-2xs" title={displayRoomAddress}>
                          <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                          <span className="truncate">🏠 {displayRoomAddress}</span>
                        </span>
                      )}
                    </div>

                    {/* 5. Badge Trạng Thái */}
                    <Badge className={`text-xs font-bold px-2.5 py-1 rounded-xl shadow-2xs shrink-0 ${sc.color} ${sc.border}`}>
                      {sc.label}
                    </Badge>
                  </div>

                  {/* Requirements grid - High Contrast & High Readability */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-2xs">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block">
                        📱 SĐT Khách
                      </span>
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                        {lead.phone}
                      </span>
                    </div>

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetail(lead.id);
                      }}
                      title="Bấm vào đây để nhập/chỉnh sửa Ngân sách & Nhu cầu"
                      className="space-y-0.5 cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-all group"
                    >
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                        <span>💰 Ngân Sách</span>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold opacity-0 group-hover:opacity-100 transition-opacity">✏️ Sửa</span>
                      </span>
                      <div>
                        {resolvedBudget > 0 ? (
                          <span className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                            <span>{resolvedBudget.toLocaleString('vi-VN')}đ/tháng</span>
                            {!lead.budget && matchedRoomInListings?.price && (
                              <span className="text-[9px] text-teal-700 dark:text-teal-300 font-extrabold bg-teal-100 dark:bg-teal-950 px-1.5 py-0.5 rounded border border-teal-300 dark:border-teal-700">
                                Theo phòng xem
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-800 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-700">
                            ✏️ Nhập ngay
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetail(lead.id);
                      }}
                      title="Bấm vào đây để nhập/chỉnh sửa Ngân sách & Nhu cầu"
                      className="space-y-0.5 cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-all group"
                    >
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
                        <span>📍 Khu Vực & Loại Phòng</span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold opacity-0 group-hover:opacity-100 transition-opacity">✏️ Sửa</span>
                      </span>
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate block">
                        📍 {resolvedArea || 'Chưa chọn KV'} • <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{resolvedRoomType || 'Loại phòng linh hoạt'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Embedded Smart Room Matcher */}
                  <SmartRoomMatcher
                    lead={lead}
                    listings={listings}
                    onBookAppointment={(room) => onCreateAppointment && onCreateAppointment(lead, room)}
                  />

                  {/* Bottom Bar: Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${phoneClean}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition-all"
                      >
                        <PhoneCall className="h-3.5 w-3.5" /> Gọi điện
                      </a>

                      <a
                        href={`https://zalo.me/${phoneClean}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-2xs transition-all"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Nhắn Zalo
                      </a>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onCreateAppointment && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCreateAppointment(lead);
                          }}
                          className="bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white font-bold h-8 text-xs px-3 rounded-xl gap-1"
                        >
                          <Calendar className="h-3.5 w-3.5 text-amber-400" />
                          <span>Xếp Lịch Hẹn</span>
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDetail(lead.id);
                        }}
                        className="h-8 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl"
                      >
                        Nhật ký tư vấn <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </Button>
                    </div>
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

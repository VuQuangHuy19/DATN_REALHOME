'use client';

import { useState, useEffect, useMemo } from 'react';

import { useRoomTypesCatalog } from '@/features/categories/hooks/useCategories';
import { useProfiles } from '@/features/staff/hooks/useStaff';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Plus, Search, UserSearch, Phone, Mail, MapPin,
  Clock, Edit, Trash2, Calendar,
  MessageCircle, PhoneCall, ArrowRightLeft, Video, MessageSquare,
  Loader2, AlertCircle,
} from 'lucide-react';
import { useLeads, useLeadDetail } from '@/hooks/useLeads';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBLead, DBLeadActivity } from '@/lib/supabase/types';
import { toast } from 'sonner';

import { LeadTimelineView } from './LeadTimelineView';
import { ViewingRequestDialog } from '@/components/customer/ViewingRequestDialog';
import { usePublicListings } from '@/lib/hooks/usePublicListings';
import type { CustomerListing } from '@/lib/customer/types';
import Pagination from '@/components/Pagination';

const statusConfig: Record<string, { label: string; color: string }> = {
  new:         { label: 'Mới',          color: 'bg-slate-100 text-slate-700' },
  consulting:  { label: 'Đang tư vấn',  color: 'bg-blue-100 text-blue-700' },
  appointment: { label: 'Hẹn xem',      color: 'bg-purple-100 text-purple-700' },
  viewed:      { label: 'Đã xem',       color: 'bg-teal-100 text-teal-700' },
  deposited:   { label: 'Đã cọc',       color: 'bg-orange-100 text-orange-700' },
  rented:      { label: 'Đã thuê',      color: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Đã hủy',       color: 'bg-red-100 text-red-700' },
  contacted:   { label: 'Đã liên hệ',   color: 'bg-cyan-100 text-cyan-700' },
  won:         { label: 'Thành công',   color: 'bg-emerald-100 text-emerald-700' },
  lost:        { label: 'Thất bại',     color: 'bg-rose-100 text-rose-700' },
};

const sourceConfig: Record<string, string> = {
  website: 'Website', facebook: 'Facebook', tiktok: 'TikTok', zalo: 'Zalo',
  chotot: 'Chợ Tốt', referral: 'Giới thiệu', cold_call: 'Gọi lạnh', walk_in: 'Trực tiếp', other: 'Khác',
};

const activityTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  call:          { label: 'Cuộc gọi',       icon: PhoneCall,     color: 'bg-blue-100 text-blue-600' },
  meeting:       { label: 'Gặp mặt',        icon: Calendar,      color: 'bg-green-100 text-green-600' },
  zalo:          { label: 'Zalo',           icon: MessageSquare, color: 'bg-teal-100 text-teal-600' },
  email:         { label: 'Email',          icon: Mail,          color: 'bg-purple-100 text-purple-600' },
  note:          { label: 'Ghi chú',        icon: MessageCircle, color: 'bg-slate-100 text-slate-600' },
  status_change: { label: 'Đổi trạng thái', icon: ArrowRightLeft, color: 'bg-amber-100 text-amber-600' },
};

const statusOrder = ['new', 'consulting', 'appointment', 'viewed', 'deposited', 'rented', 'cancelled', 'contacted', 'won', 'lost'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const DISTRICT_OPTIONS = [
  'Cầu Giấy', 'Đống Đa', 'Tây Hồ', 'Thanh Xuân', 'Hai Bà Trưng',
  'Ba Đình', 'Hoàn Kiếm', 'Nam Từ Liêm', 'Bắc Từ Liêm', 'Hà Đông',
  'Long Biên', 'Thanh Trì', 'Hoài Đức', 'Gia Lâm', 'Đông Anh'
];

function LeadDetail({ leadId, onClose, currentUserId, currentUserName }: {
  leadId: string;
  onClose: () => void;
  currentUserId: string;
  currentUserName: string;
}) {
  const { lead, activities, addActivity, changeStatus, changeAssignee, updateLeadInfo } = useLeadDetail(leadId);
  const [newActivityContent, setNewActivityContent] = useState('');
  const [newActivityType, setNewActivityType] = useState<'call' | 'meeting' | 'zalo' | 'email' | 'note'>('call');
  const [newStatus, setNewStatus] = useState('');
  const { company, role } = useAuth();
  const { items: profiles } = useProfiles(company?.id || undefined);
  const { items: roomTypes } = useRoomTypesCatalog(company?.id || undefined);
  const { listings } = usePublicListings(company?.id || null, false);
  const [newAssignee, setNewAssignee] = useState('');

  // Smart lookup for matched room in listings if preferred_room_type, area, or budget is missing
  const matchedRoomInListings = useMemo(() => {
    if (!lead || !listings || listings.length === 0) return null;
    const rawQuery = (lead.interest || lead.preferred_area || '').toLowerCase();
    const normalizeStr = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9a-ăâáắấàằầảẳẩãẵẫạặậđèêéếềẻểẽễẹệìỉíịòôơóốớồờỏổởõỗỡọộợùưúứừủửũữụựỳỷỹỵ]/g, '');
    const queryNorm = normalizeStr(rawQuery);
    if (!queryNorm) return null;
    return listings.find((l) => {
      const bNameNorm = normalizeStr(l.buildingName || '');
      const addrNorm = normalizeStr(l.address || '');
      const titleNorm = normalizeStr(l.title || '');
      return (
        (bNameNorm && (queryNorm.includes(bNameNorm) || bNameNorm.includes(queryNorm))) ||
        (addrNorm && (queryNorm.includes(addrNorm) || addrNorm.includes(queryNorm))) ||
        (titleNorm && (queryNorm.includes(titleNorm) || titleNorm.includes(queryNorm)))
      );
    }) || null;
  }, [lead, listings]);

  const rawInterestLow = (lead?.interest || '').toLowerCase();
  const resolvedArea = matchedRoomInListings?.area || (
    rawInterestLow.includes('trần duy hưng') || rawInterestLow.includes('tran duy hung') ? 'Cầu Giấy' : lead?.preferred_area || null
  );

  const resolvedRoomType = lead?.preferred_room_type || matchedRoomInListings?.roomType || null;
  const resolvedBudget = (lead?.budget && lead.budget > 0) ? lead.budget : (matchedRoomInListings?.price || 0);

  // Inline Demand & Budget edit state
  const [isEditingDemand, setIsEditingDemand] = useState(false);
  const [editBudget, setEditBudget] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editRoomType, setEditRoomType] = useState('');
  const [editInterest, setEditInterest] = useState('');
  const [savingDemand, setSavingDemand] = useState(false);

  useEffect(() => {
    if (lead) {
      const b = lead.budget > 0 ? lead.budget : (matchedRoomInListings?.price || 0);
      const defaultArea = lead.preferred_area || matchedRoomInListings?.area || (
        (lead.interest || '').toLowerCase().includes('trần duy hưng') ? 'Cầu Giấy' : ''
      );
      setEditBudget(b > 0 ? Number(b).toLocaleString('vi-VN') : '');
      setEditArea(defaultArea);
      setEditRoomType(lead.preferred_room_type || matchedRoomInListings?.roomType || '');
      setEditInterest(lead.interest || '');
    }
  }, [lead, matchedRoomInListings]);

  const handleSaveDemand = async () => {
    if (!lead) return;
    setSavingDemand(true);
    const toastId = toast.loading('Đang cập nhật ngân sách & nhu cầu...');
    try {
      const budgetNum = Number(editBudget.replace(/\D/g, ''));
      await updateLeadInfo({
        budget: budgetNum,
        preferred_area: editArea.trim() || null,
        preferred_room_type: editRoomType.trim() || null,
        interest: editInterest.trim() || null,
      });
      setIsEditingDemand(false);
      toast.success('✨ Đã cập nhật ngân sách & nhu cầu khách thành công!', { id: toastId });
    } catch (e: any) {
      toast.error(`Lỗi: ${e.message}`, { id: toastId });
    } finally {
      setSavingDemand(false);
    }
  };

  const assignableProfiles = useMemo(() => {
    return profiles.filter((p) => p.role !== 'landlord');
  }, [profiles]);

  if (!lead) {
    return (
      <div className="py-12 text-center text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
        <p className="text-xs font-medium">Đang tải thông tin khách hàng...</p>
      </div>
    );
  }

  const sc = statusConfig[lead.status] ?? statusConfig.new;
  const cleanPhone = (lead.phone || '').replace(/\D/g, '');
  const initialLetter = (lead.full_name || 'K').charAt(0).toUpperCase();

  const handleAddActivity = async () => {
    if (!newActivityContent.trim()) return;
    const toastId = toast.loading('Đang lưu nhật ký...');
    try {
      await addActivity({
        lead_id: leadId,
        company_id: lead.company_id,
        type: newActivityType,
        content: newActivityContent,
        old_status: null,
        new_status: null,
        created_by: currentUserId,
        created_by_name: currentUserName,
      });
      setNewActivityContent('');
      toast.success('Đã thêm nhật ký tư vấn!', { id: toastId });
    } catch (e: any) {
      toast.error(`Lỗi: ${e.message}`, { id: toastId });
    }
  };

  const handleChangeStatus = async () => {
    if (!newStatus || newStatus === lead.status) return;
    const toastId = toast.loading('Đang cập nhật trạng thái...');
    try {
      await changeStatus(newStatus as DBLead['status'], currentUserId, currentUserName);
      setNewStatus('');
      toast.success('Cập nhật trạng thái thành công!', { id: toastId });
    } catch (e: any) {
      toast.error(`Lỗi: ${e.message}`, { id: toastId });
    }
  };

  return (
    <div className="space-y-5 pt-1 text-slate-800 dark:text-slate-100">
      {/* Top Banner Header: Customer Avatar & Fast Actions */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xl flex items-center justify-center shrink-0 shadow-sm border border-amber-300/40">
            {initialLetter}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white truncate">{lead.full_name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs ${sc.color}`}>
                {sc.label}
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-0.5 flex items-center gap-2">
              <span>Nguồn: <strong className="text-amber-300 font-bold">{sourceConfig[lead.source] || lead.source}</strong></span>
              <span>•</span>
              <span>Tạo lúc: {formatDate(lead.created_at)}</span>
            </p>
          </div>
        </div>

        {/* Quick Contact Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-indigo-800/60">
          <a
            href={`tel:${cleanPhone}`}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
          >
            <PhoneCall className="h-3.5 w-3.5" /> Gọi điện
          </a>
          <a
            href={`https://zalo.me/${cleanPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Nhắn Zalo
          </a>
        </div>
      </div>

      {/* Grid Thông Tin Chi Tiết + Nút Sửa Ngân Sách */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            📋 Nhu Cầu & Ngân Sách Khách Hàng
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditingDemand(!isEditingDemand)}
            className="h-7 text-xs font-bold border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 hover:bg-amber-100 rounded-xl gap-1 shadow-2xs"
          >
            <Edit className="h-3 w-3 text-amber-600" />
            <span>{isEditingDemand ? 'Hủy sửa' : '✏️ Nhập / Sửa Ngân Sách'}</span>
          </Button>
        </div>

        {/* Inline Demand & Budget Edit Form */}
        {isEditingDemand ? (
          <div className="p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <h4 className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Edit className="h-3.5 w-3.5 text-amber-600" />
              Cập Nhật Ngân Sách & Nhu Cầu Chi Tiết
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ngân Sách Tối Đa (VNĐ / Tháng)</Label>
                <Input
                  placeholder="Ví dụ: 5.000.000"
                  value={editBudget}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '');
                    setEditBudget(clean ? Number(clean).toLocaleString('vi-VN') : '');
                  }}
                  className="h-9 text-xs font-mono font-bold border-amber-300 focus:border-amber-500 rounded-xl bg-white dark:bg-slate-900"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Khu Vực Ưu Tiên</Label>
                <select
                  value={editArea}
                  onChange={(e) => setEditArea(e.target.value)}
                  className="w-full h-9 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="">-- Chọn khu vực --</option>
                  {DISTRICT_OPTIONS.map((areaName) => (
                    <option key={areaName} value={areaName}>{areaName}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Loại Phòng Ưu Tiên</Label>
                <select
                  value={editRoomType}
                  onChange={(e) => setEditRoomType(e.target.value)}
                  className="w-full h-9 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="">-- Chọn loại phòng --</option>
                  {roomTypes.map((rt: any) => (
                    <option key={rt.id} value={rt.name}>{rt.name}</option>
                  ))}
                  <option value="Studio">Studio</option>
                  <option value="1PN">1 Phòng Ngủ (1PN)</option>
                  <option value="2PN">2 Phòng Ngủ (2PN)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Căn / Nhu Cầu Quan Tâm</Label>
                <Input
                  placeholder="Ví dụ: Phòng 201, Căn 2PN view đẹp..."
                  value={editInterest}
                  onChange={(e) => setEditInterest(e.target.value)}
                  className="h-9 text-xs font-semibold border-amber-300 focus:border-amber-500 rounded-xl bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingDemand(false)}
                className="h-8 text-xs font-bold rounded-xl"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleSaveDemand}
                disabled={savingDemand}
                className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs"
              >
                {savingDemand ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                💾 Lưu Ngân Sách & Nhu Cầu
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">SĐT & Email</span>
              <div className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>{lead.phone}</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                <Mail className="h-3 w-3 text-slate-400 shrink-0" /> {lead.email || 'Chưa có email'}
              </p>
            </div>

            <div
              onClick={() => setIsEditingDemand(true)}
              className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 space-y-1 cursor-pointer hover:border-emerald-400 transition-all group relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">Ngân sách & Loại phòng</span>
                <span className="text-[10px] text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">✏️ Sửa</span>
              </div>
              <div className="font-mono font-black text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <span>{resolvedBudget > 0 ? `${resolvedBudget.toLocaleString('vi-VN')}đ/tháng` : '⚠️ Chưa nhập (Bấm để sửa)'}</span>
                {!lead.budget && matchedRoomInListings?.price && (
                  <span className="text-[9px] text-teal-700 dark:text-teal-300 font-extrabold bg-teal-100 dark:bg-teal-950 px-1.5 py-0.5 rounded border border-teal-300 dark:border-teal-700">
                    Tự động
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate">
                🏠 <strong className="text-indigo-700 dark:text-indigo-300">{resolvedRoomType || 'Loại phòng linh hoạt'}</strong>
              </p>
            </div>

            <div
              onClick={() => setIsEditingDemand(true)}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1 cursor-pointer hover:border-indigo-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Khu vực & Quan tâm</span>
                <span className="text-[10px] text-indigo-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">✏️ Sửa</span>
              </div>
              <div className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate">
                📍 {resolvedArea || 'Chưa chọn khu vực'}
              </div>
              <p className="text-[11px] text-slate-500 truncate" title={lead.interest || ''}>
                Căn quan tâm: <span className="font-semibold text-slate-700 dark:text-slate-300">{lead.interest || 'Chưa ghi nhận'}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Control Panels: Chuyển Trạng Thái & Phân Công Sale */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50">
        {/* Panel 1: Chuyển trạng thái */}
        <div className="space-y-1.5">
          <Label className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
            <ArrowRightLeft className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Chuyển Trạng Thái Lead</span>
          </Label>
          <div className="flex gap-2">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="flex-1 h-9 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            >
              <option value="">-- Chọn trạng thái mới --</option>
              {statusOrder.map((s) => (
                <option key={s} value={s}>
                  {statusConfig[s]?.label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleChangeStatus}
              disabled={!newStatus || newStatus === lead.status}
              className="h-9 px-3.5 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs shrink-0"
            >
              Cập nhật
            </Button>
          </div>
        </div>

        {/* Panel 2: Phân công nhân viên */}
        {role !== 'sales_agent' && changeAssignee && (
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <UserSearch className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Phân Công Sale Phụ Trách</span>
            </Label>
            <div className="flex gap-2">
              <select
                value={newAssignee || lead.assigned_to || ''}
                onChange={(e) => setNewAssignee(e.target.value)}
                className="flex-1 h-9 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                <option value="">-- Chưa phân công --</option>
                {assignableProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const toastId = toast.loading('Đang phân công...');
                  try {
                    await changeAssignee(newAssignee || null);
                    toast.success('Phân công thành công!', { id: toastId });
                  } catch (e: any) {
                    toast.error(`Lỗi: ${e.message}`, { id: toastId });
                  }
                }}
                disabled={(newAssignee || (lead.assigned_to ?? '')) === (lead.assigned_to ?? '')}
                className="h-9 px-3.5 font-bold text-xs border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 rounded-xl shadow-2xs shrink-0"
              >
                Phân công
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Form Ghi Nhận Hoạt Động Tư Vấn (Add CSKH Activity Form) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4 text-amber-500" />
          <span>Ghi Nhận Hoạt Động Tư Vấn Mới</span>
        </h3>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={newActivityType}
            onChange={(e) => setNewActivityType(e.target.value as any)}
            className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-amber-400 shrink-0 cursor-pointer"
          >
            {(['call', 'zalo', 'meeting', 'email', 'note'] as const).map((t) => (
              <option key={t} value={t}>
                {activityTypeConfig[t].label}
              </option>
            ))}
          </select>

          <div className="flex gap-2 flex-1">
            <Input
              placeholder="Nhập nội dung tư vấn, trao đổi với khách..."
              value={newActivityContent}
              onChange={(e) => setNewActivityContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newActivityContent.trim()) {
                  e.preventDefault();
                  handleAddActivity();
                }
              }}
              className="flex-1 h-10 text-xs sm:text-sm rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50"
            />
            <Button
              size="sm"
              onClick={handleAddActivity}
              disabled={!newActivityContent.trim()}
              className="h-10 px-4 font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs shrink-0"
            >
              <Plus className="h-4 w-4 mr-1 text-amber-400" /> Thêm
            </Button>
          </div>
        </div>
      </div>

      {/* Nhật Ký Lịch Sử Hoạt Động (Activity Timeline History) */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Lịch Sử Tư Vấn ({activities.length})</span>
          </h3>
        </div>

        {activities.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <MessageSquare className="h-8 w-8 mx-auto mb-1.5 opacity-30 text-slate-500" />
            <p className="font-medium">Chưa có nhật ký tư vấn nào cho khách hàng này</p>
          </div>
        ) : (
          <div className="relative pl-5 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {activities.map((entry) => {
              const tc = activityTypeConfig[entry.type] ?? activityTypeConfig.note;
              const EntryIcon = tc.icon;
              return (
                <div key={entry.id} className="relative group">
                  {/* Icon node */}
                  <div className={`absolute -left-[29px] top-1.5 h-6 w-6 rounded-full flex items-center justify-center ${tc.color} ring-4 ring-white dark:ring-slate-900 shadow-2xs z-10`}>
                    <EntryIcon className="h-3 w-3" />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-1 transition-all hover:bg-white hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">{tc.label}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{entry.created_by_name || 'Hệ thống'}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" /> {formatDate(entry.created_at)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                      {entry.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function LeadsPage() {
  const { company, user, role, profile } = useAuth();
  const { leads: leadList, loading, error, add, update, remove } = useLeads(company?.id);
  const [viewTab, setViewTab] = useState<'timeline' | 'table'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<DBLead | null>(null);
  const [saving, setSaving] = useState(false);
  const [appointmentTarget, setAppointmentTarget] = useState<{ lead: DBLead; room?: CustomerListing } | null>(null);
  const { items: profiles } = useProfiles(company?.id);

  const isSale = role === 'sales_agent';

  const { items: roomTypes } = useRoomTypesCatalog(company?.id);

  const visibleLeads = useMemo(() => {
    if (isSale) {
      const myId = user?.id || profile?.id;
      if (!myId) return [];
      return leadList.filter((l) => l.assigned_to === myId);
    }
    return leadList;
  }, [leadList, isSale, user?.id, profile?.id]);

  const assignableProfiles = useMemo(() => {
    return profiles.filter((p) => p.role !== 'landlord');
  }, [profiles]);

  const getAssigneeName = (assignedToId: string | null) => {
    if (!assignedToId) return 'Chưa phân công';
    const prof = profiles.find((p) => p.id === assignedToId);
    return prof?.full_name || prof?.email || 'Chưa phân công';
  };

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const filtered = visibleLeads.filter((l) => {
    const matchSearch =
      l.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery) ||
      (l.email ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const safePage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));
  const paginatedList = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const [leadErrors, setLeadErrors] = useState<Record<string, string>>({});

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const fullName = (fd.get('fullName') as string || '').trim();
    const phone = (fd.get('phone') as string || '').trim();

    const errs: Record<string, string> = {};
    if (!fullName) errs.fullName = 'Không được để trống';
    if (!phone) errs.phone = 'Không được để trống';

    if (Object.keys(errs).length > 0) {
      setLeadErrors(errs);
      return;
    }
    setLeadErrors({});
    setSaving(true);

    const payload = {
      company_id: company?.id ?? '',
      full_name: fullName,
      phone: phone,
      email: fd.get('email') as string || null,
      source: fd.get('source') as DBLead['source'],
      status: fd.get('status') as DBLead['status'],
      interest: fd.get('interest') as string || null,
      budget: Number(String(fd.get('budget') || '0').replace(/\./g, '')),
      preferred_area: fd.get('preferredArea') as string || null,
      preferred_room_type: fd.get('preferredRoomType') as string || null,
      interested_area: null,
      assigned_to: isSale ? (user?.id ?? null) : (fd.get('assignedTo') as string || null),
      notes: fd.get('notes') as string || null,
      last_contacted_at: null,
    };
    if (editItem) {
      await update(editItem.id, payload);
    } else {
      await add(payload);
    }
    setSaving(false);
    setIsFormOpen(false);
    setEditItem(null);
  };

  const counts = Object.keys(statusConfig).reduce((acc, s) => {
    acc[s] = visibleLeads.filter((l) => l.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Chăm sóc Khách hàng (CRM)</h1>
          <p className="text-slate-500 text-xs sm:text-sm font-medium">Quản lý, chăm sóc và theo dõi lộ trình chốt phòng cho khách hàng</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <button
              onClick={() => setViewTab('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewTab === 'timeline'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span>Lịch trình Chăm khách</span>
            </button>
            <button
              onClick={() => setViewTab('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewTab === 'table'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Danh sách Chi tiết</span>
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => { setEditItem(null); setIsFormOpen(true); }}
            className="h-9 px-3.5 font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1" />Thêm lead
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
        </div>
      )}

      {viewTab === 'timeline' ? (
        <LeadTimelineView
          leads={visibleLeads}
          onOpenDetail={(id) => {
            setSelectedLeadId(id);
            setIsDetailOpen(true);
          }}
          onCreateAppointment={(lead, room) => setAppointmentTarget({ lead, room })}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border ${
                statusFilter === 'all'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 border-amber-400 shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-amber-400'
              }`}
            >
              Tất cả ({visibleLeads.length})
            </button>
            {statusOrder.filter((s) => counts[s] > 0 || s === 'new').map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border ${
                  statusFilter === s
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 border-amber-400 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-amber-400'
                }`}
              >
                {statusConfig[s]?.label} ({counts[s] || 0})
              </button>
            ))}
          </div>

          <Card>
            <CardHeader className="p-4 border-b border-border/60">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Tìm theo tên, SĐT hoặc email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                  </div>
                  <div className="text-xs text-slate-500 font-medium hidden sm:block whitespace-nowrap">
                    Hiển thị <strong>{filtered.length > 0 ? (safePage - 1) * pageSize + 1 : 0} - {Math.min(safePage * pageSize, filtered.length)}</strong> / <strong>{filtered.length}</strong> khách hàng
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="shrink-0 self-end md:self-auto">
                    <Pagination
                      currentPage={safePage}
                      totalPages={totalPages}
                      onPageChange={(p) => setCurrentPage(p)}
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-230px)] border border-border-subtle rounded-lg relative">
                  <table className="w-full text-sm hidden md:table min-w-[780px] border-collapse">
                    <thead className="bg-slate-100 dark:bg-zinc-800 border-b border-border-subtle sticky top-0 z-20 shadow-xs">
                      <tr>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-ink-muted uppercase tracking-wider sticky top-0 z-20 bg-slate-100 dark:bg-zinc-800 min-w-[140px]">Khách hàng</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-ink-muted uppercase tracking-wider sticky top-0 z-20 bg-slate-100 dark:bg-zinc-800 min-w-[110px]">Trạng thái</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-ink-muted uppercase tracking-wider sticky top-0 z-20 bg-slate-100 dark:bg-zinc-800 min-w-[130px]">Thời gian tạo</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-ink-muted uppercase tracking-wider sticky top-0 z-20 bg-slate-100 dark:bg-zinc-800 min-w-[150px]">Quan tâm</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-ink-muted uppercase tracking-wider sticky top-0 z-20 bg-slate-100 dark:bg-zinc-800 min-w-[140px]">Sale phụ trách</th>
                        <th className="px-4 py-3.5 text-left text-xs font-bold text-ink-muted uppercase tracking-wider sticky top-0 z-20 bg-slate-100 dark:bg-zinc-800 min-w-[90px]">Nguồn</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-ink-muted uppercase tracking-wider sticky top-0 z-20 bg-slate-100 dark:bg-zinc-800 min-w-[110px]">Ngân sách</th>
                        <th className="px-4 py-3.5 text-right text-xs font-bold text-ink-muted uppercase tracking-wider sticky top-0 z-20 bg-slate-100 dark:bg-zinc-800 min-w-[100px]">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle text-ink">
                      {paginatedList.map((item) => {
                        const sc = statusConfig[item.status] || statusConfig.new;
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('select')) return;
                              setSelectedLeadId(item.id);
                              setIsDetailOpen(true);
                            }}
                          >
                            <td className="px-4 py-3">
                              <div className="font-semibold text-ink">{item.full_name}</div>
                              <div className="flex items-center gap-1 text-xs text-ink-muted mt-0.5 font-mono">
                                <Phone className="h-3 w-3 text-ink-muted" />{item.phone}
                              </div>
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${sc.color}`}>{sc.label}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-xs text-ink-muted font-mono whitespace-nowrap">
                                {formatDate(item.created_at)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-ink-muted">
                              <div className="text-sm font-medium text-ink">{item.preferred_room_type || '—'}</div>
                              <div className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 text-ink-muted" />{item.preferred_area || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              {isSale ? (
                                <span className="text-xs font-semibold text-ink-muted bg-bg-subtle px-2.5 py-1 rounded-full border border-border-subtle">
                                  {getAssigneeName(item.assigned_to)}
                                </span>
                              ) : (
                                <select
                                  value={item.assigned_to ?? ''}
                                  onChange={async (e) => {
                                    const newAssignVal = e.target.value || null;
                                    const toastId = toast.loading('Đang phân công...');
                                    const res = await update(item.id, { assigned_to: newAssignVal });
                                    if (res) {
                                      toast.success('Phân công thành công!', { id: toastId });
                                    } else {
                                      toast.error('Lỗi phân công!', { id: toastId });
                                    }
                                  }}
                                  className="text-xs font-semibold text-ink bg-white border border-border-subtle rounded-md px-2 py-1 max-w-[150px] outline-none focus:border-accent"
                                >
                                  <option value="">-- Chưa phân công --</option>
                                  {assignableProfiles.map((p: any) => (
                                    <option key={p.id} value={p.id}>
                                      {p.full_name || p.email}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-ink-muted">{sourceConfig[item.source] || item.source}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-ink font-mono font-bold">
                              {item.budget.toLocaleString('vi-VN')}đ
                            </td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle"
                                  onClick={() => { setSelectedLeadId(item.id); setIsDetailOpen(true); }}
                                  title="Xem chi tiết"
                                >
                                  <Search className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle"
                                  onClick={() => { setEditItem(item); setIsFormOpen(true); }}
                                  title="Chỉnh sửa"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {role !== 'sales_agent' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10"
                                    onClick={() => remove(item.id)}
                                    title="Xóa"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-ink-muted bg-white">
                            <UserSearch className="h-10 w-10 mx-auto mb-2 opacity-35" />
                            <p>Không tìm thấy lead nào</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Mobile Card View (Hiển thị mượt mà trên Điện thoại) */}
                  <div className="block md:hidden divide-y divide-border-subtle bg-white dark:bg-zinc-900">
                    {paginatedList.map((item) => {
                  const sc = statusConfig[item.status] || statusConfig.new;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedLeadId(item.id);
                        setIsDetailOpen(true);
                      }}
                      className="p-4 space-y-2.5 hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink text-sm">{item.full_name}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${sc.color}`}>
                          {sc.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-ink-muted font-mono">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-accent" /> {item.phone}
                        </span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border-subtle/60">
                        <span className="text-ink-muted flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-blue-500" /> {item.preferred_area || item.interest || 'Chưa chọn KV'}
                        </span>
                        <span className="font-bold font-mono text-emerald-600 text-sm">
                          {item.budget ? `${item.budget.toLocaleString('vi-VN')}đ` : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="p-8 text-center text-ink-muted text-xs">
                    <UserSearch className="h-8 w-8 mx-auto mb-2 opacity-35" />
                    <p>Không tìm thấy lead nào</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}

      {appointmentTarget && (
        <ViewingRequestDialog
          open={Boolean(appointmentTarget)}
          onOpenChange={(open) => !open && setAppointmentTarget(null)}
          companyId={company?.id || ''}
          property={
            appointmentTarget.room
              ? {
                  id: appointmentTarget.room.id,
                  title: appointmentTarget.room.title,
                  address: appointmentTarget.room.address || '',
                  area: appointmentTarget.room.area || '',
                }
              : null
          }
          referralSaleId={user?.id || profile?.id}
        />
      )}

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 bg-white dark:bg-slate-900">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 truncate">
              <UserSearch className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="truncate">Hồ Sơ & Lịch Sử CSKH: {leadList.find((l) => l.id === selectedLeadId)?.full_name}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedLeadId && isDetailOpen && (
            <LeadDetail
              leadId={selectedLeadId}
              onClose={() => setIsDetailOpen(false)}
              currentUserId={user?.id ?? ''}
              currentUserName={profile?.full_name ?? 'Admin'}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Chỉnh sửa' : 'Thêm'} lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} noValidate className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="fullName">Họ và tên <span className="text-red-500">*</span></Label>
                <Input
                  id="fullName"
                  name="fullName"
                  defaultValue={editItem?.full_name}
                  onChange={() => leadErrors.fullName && setLeadErrors(prev => ({ ...prev, fullName: '' }))}
                  className={leadErrors.fullName ? 'border-red-500 ring-1 ring-red-500' : ''}
                />
                {leadErrors.fullName && <p className="text-xs font-semibold text-red-500 mt-1">⚠️ {leadErrors.fullName}</p>}
              </div>
              <div>
                <Label htmlFor="phone">Số điện thoại <span className="text-red-500">*</span></Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={editItem?.phone}
                  onChange={() => leadErrors.phone && setLeadErrors(prev => ({ ...prev, phone: '' }))}
                  className={leadErrors.phone ? 'border-red-500 ring-1 ring-red-500' : ''}
                />
                {leadErrors.phone && <p className="text-xs font-semibold text-red-500 mt-1">⚠️ {leadErrors.phone}</p>}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editItem?.email ?? ''} />
              </div>
              <div>
                <Label htmlFor="source">Nguồn lead</Label>
                <select id="source" name="source" defaultValue={editItem?.source ?? 'website'} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {Object.entries(sourceConfig).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <Label htmlFor="status">Trạng thái</Label>
                <select id="status" name="status" defaultValue={editItem?.status ?? 'new'} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {statusOrder.map((s) => <option key={s} value={s}>{statusConfig[s]?.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="interest">Quan tâm</Label>
                <Input id="interest" name="interest" defaultValue={editItem?.interest ?? ''} placeholder="Căn hộ 2PN view sông..." />
              </div>
              <div>
                <Label htmlFor="budget">Ngân sách (đ/tháng)</Label>
                <Input 
                  id="budget" 
                  name="budget" 
                  type="text" 
                  defaultValue={editItem?.budget ? Number(editItem.budget).toLocaleString('vi-VN') : ''} 
                  onChange={(e) => {
                    const val = e.target.value;
                    const clean = val.replace(/\D/g, '');
                    e.target.value = clean ? Number(clean).toLocaleString('vi-VN') : '';
                  }} 
                />
              </div>
              <div>
                <Label htmlFor="preferredArea">Khu vực</Label>
                <Input id="preferredArea" name="preferredArea" defaultValue={editItem?.preferred_area ?? ''} />
              </div>
              <div>
                <Label htmlFor="preferredRoomType">Loại phòng</Label>
                <select
                  id="preferredRoomType"
                  name="preferredRoomType"
                  defaultValue={editItem?.preferred_room_type ?? ''}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">-- Chọn loại phòng --</option>
                  {roomTypes.map((rt: any) => (
                    <option key={rt.id} value={rt.name}>{rt.name}</option>
                  ))}
                </select>
              </div>
              {!isSale && (
                <div>
                  <Label htmlFor="assignedTo">Phân công</Label>
                  <select id="assignedTo" name="assignedTo" defaultValue={editItem?.assigned_to ?? ''} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">-- Chọn nhân viên --</option>
                    {assignableProfiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Ghi chú</Label>
                <Input id="notes" name="notes" defaultValue={editItem?.notes ?? ''} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

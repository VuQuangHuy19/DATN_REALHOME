import React from 'react';
import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageSquare,
  Phone,
  Receipt,
  Settings,
  ShieldCheck,
  UserSearch,
} from 'lucide-react';

export interface NotificationTypeMeta {
  key: string;
  label: string; // Standardized Vietnamese Tag Name
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  badgeClass: string;
}

/**
 * Standardized Notification Tag Dictionary & Style Resolver
 */
export function getNotificationTypeConfig(rawType?: string, title?: string): NotificationTypeMeta {
  const typeKey = (rawType || '').toLowerCase().trim();
  const titleText = (title || '').toLowerCase().trim();

  // 1. Appointment Notifications
  if (
    typeKey === 'new_appointment' ||
    typeKey === 'appointment_new' ||
    typeKey === 'appointment' ||
    typeKey === 'appointment_created' ||
    typeKey === 'lịch hẹn mới' ||
    typeKey === 'lich_hen_moi' ||
    titleText.includes('lịch hẹn') ||
    titleText.includes('đặt lịch')
  ) {
    if (typeKey.includes('confirm') || titleText.includes('xác nhận')) {
      return {
        key: 'appointment_confirmed',
        label: 'ĐÃ XÁC NHẬN LỊCH',
        icon: CheckCircle2,
        color: 'text-blue-700 dark:text-blue-300',
        bg: 'bg-blue-50 dark:bg-blue-950/50',
        border: 'border-blue-200 dark:border-blue-800/60',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60',
      };
    }
    return {
      key: 'new_appointment',
      label: 'LỊCH HẸN MỚI',
      icon: CalendarDays,
      color: 'text-emerald-700 dark:text-emerald-300',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
    };
  }

  // 2. Lead / CRM Notifications
  if (
    typeKey === 'lead_new' ||
    typeKey === 'new_lead' ||
    typeKey === 'lead' ||
    typeKey === 'khách mới' ||
    typeKey === 'lead_created'
  ) {
    return {
      key: 'lead_new',
      label: 'KHÁCH HÀNG MỚI',
      icon: UserSearch,
      color: 'text-sky-700 dark:text-sky-300',
      bg: 'bg-sky-50 dark:bg-sky-950/50',
      border: 'border-sky-200 dark:border-sky-800/60',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60',
    };
  }

  // 3. Deposit / Booking Notifications
  if (
    typeKey === 'deposit_created' ||
    typeKey === 'deposit' ||
    typeKey === 'new_deposit' ||
    typeKey === 'tạo hđ cọc' ||
    typeKey === 'deposit_new' ||
    titleText.includes('đặt cọc') ||
    titleText.includes('chốt cọc')
  ) {
    return {
      key: 'deposit_created',
      label: 'TẠO HĐ CỌC',
      icon: ShieldCheck,
      color: 'text-purple-700 dark:text-purple-300',
      bg: 'bg-purple-50 dark:bg-purple-950/50',
      border: 'border-purple-200 dark:border-purple-800/60',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60',
    };
  }

  // 4. Contract Notifications
  if (
    typeKey === 'contract' ||
    typeKey === 'contract_created' ||
    typeKey === 'contract_expiring' ||
    typeKey === 'new_contract' ||
    titleText.includes('hợp đồng')
  ) {
    const isExpiring = typeKey.includes('expiring') || titleText.includes('hết hạn');
    return {
      key: isExpiring ? 'contract_expiring' : 'contract',
      label: isExpiring ? 'HĐ SẮP HẾT HẠN' : 'HỢP ĐỒNG THUÊ',
      icon: Building2,
      color: isExpiring ? 'text-rose-700 dark:text-rose-300' : 'text-amber-700 dark:text-amber-300',
      bg: isExpiring ? 'bg-rose-50 dark:bg-rose-950/50' : 'bg-amber-50 dark:bg-amber-950/50',
      border: isExpiring ? 'border-rose-200 dark:border-rose-800/60' : 'border-amber-200 dark:border-amber-800/60',
      badgeClass: isExpiring
        ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60'
        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
    };
  }

  // 5. Consultation Logs
  if (typeKey === 'consultation' || titleText.includes('tư vấn')) {
    return {
      key: 'consultation',
      label: 'NHẬT KÝ TƯ VẤN',
      icon: MessageSquare,
      color: 'text-indigo-700 dark:text-indigo-300',
      bg: 'bg-indigo-50 dark:bg-indigo-950/50',
      border: 'border-indigo-200 dark:border-indigo-800/60',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60',
    };
  }

  // 6. Invoice / Billing Notifications
  if (typeKey === 'invoice' || typeKey === 'invoice_paid' || titleText.includes('hóa đơn') || titleText.includes('thanh toán')) {
    return {
      key: 'invoice',
      label: 'HÓA ĐƠN & THANH TOÁN',
      icon: Receipt,
      color: 'text-pink-700 dark:text-pink-300',
      bg: 'bg-pink-50 dark:bg-pink-950/50',
      border: 'border-pink-200 dark:border-pink-800/60',
      badgeClass: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800/60',
    };
  }

  // 7. Landlord Notifications
  if (typeKey === 'new_landlord' || typeKey === 'landlord' || titleText.includes('chủ nhà')) {
    return {
      key: 'new_landlord',
      label: 'CHỦ BẤT ĐỘNG SẢN',
      icon: Building2,
      color: 'text-teal-700 dark:text-teal-300',
      bg: 'bg-teal-50 dark:bg-teal-950/50',
      border: 'border-teal-200 dark:border-teal-800/60',
      badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/60',
    };
  }

  // Default / System Notifications
  return {
    key: 'system',
    label: (rawType || 'HỆ THỐNG').toUpperCase().replace(/_/g, ' '),
    icon: Settings,
    color: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-zinc-800',
    border: 'border-slate-200 dark:border-zinc-700',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-slate-300 dark:border-zinc-700',
  };
}

/**
 * Reusable Component to Render Beautifully Formatted Notification Body Text
 */
export function FormattedNotificationBody({
  body,
  className = '',
}: {
  body?: string;
  className?: string;
}) {
  if (!body) return null;

  // Helper to format ISO date string inside text if present
  const formatIsoDate = (dStr: string) => {
    const parts = dStr.split(/[-/]/);
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dStr;
  };

  // Pattern detection for rich highlights
  // 1. Customer name & phone: e.g. "Khách hàng Linh Chi (0333678999)" or "Lead mới: pususu (0987123456)"
  const customerPattern = /(?:Khách hàng|Lead mới:?)\s+([^(]+?)\s*\((0[0-9\s.-]{8,12})\)/i;
  const customerMatch = body.match(customerPattern);

  // 2. Sale Name: e.g. "Sale Vũ Quang Huy"
  const salePattern = /Sale\s+([^.\n,]+?)(?=\s+đã|\s+chốt|\.|$)/i;
  const saleMatch = body.match(salePattern);

  // 3. Room / Property: e.g. "xem phòng 196TRẦN DUY HƯNG", "phòng 71 ngách 100 ngõ 318 đê la thành", "cọc phòng 703 (231 KHÂM THIÊN)"
  const roomPattern = /(?:xem\s+phòng|cọc\s+phòng|phòng)\s+([^.\n,]+?)(?=\s+lúc|\s+ngày|\s+trị giá|\s+sắp|\s+đã|\.|$)/i;
  const roomMatch = body.match(roomPattern);

  // 4. Time & Date: e.g. "lúc 12:45 ngày 2026-09-04" or "ngày 15/09/2026"
  const timeDatePattern = /(?:lúc\s+([0-9]{1,2}:[0-9]{2}))?\s*(?:ngày\s+([0-9]{2,4}[-/][0-9]{1,2}[-/][0-9]{2,4}))/i;
  const timeDateMatch = body.match(timeDatePattern);

  // 5. Amount parsing (chỉ bắt khi có dấu chấm phân cách ngàn như 1.250.000đ, hoặc từ khóa giá/cọc, hoặc dùng VNĐ/VND)
  const amountPattern = /(?:trị giá|tổng|tiền|cọc|giá)\s*\d+(?:\.\d{3})*\s*(?:đ|VNĐ|vnd)\b|(?:\d{1,3}(?:\.\d{3})+)\s*(?:đ|VNĐ|vnd)\b|\d+\s*(?:VNĐ|VND|vnd)\b/i;
  const amountMatch = body.match(amountPattern);

  // If no patterns matched, render regular clean text
  if (!customerMatch && !saleMatch && !roomMatch && !timeDateMatch && !amountMatch) {
    return <p className={`text-xs text-ink-muted leading-relaxed ${className}`}>{body}</p>;
  }

  return (
    <div className={`text-xs text-slate-700 dark:text-slate-300 leading-relaxed ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5 leading-normal">
        {/* Customer Highlight */}
        {customerMatch && (
          <span className="inline-flex items-center gap-1 text-slate-900 dark:text-white font-extrabold">
            Khách hàng <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{customerMatch[1].trim()}</span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-extrabold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md border border-blue-200/80 dark:border-blue-800/60">
              <Phone className="h-3 w-3 text-blue-500 shrink-0" />
              {customerMatch[2].trim()}
            </span>
          </span>
        )}

        {/* Sale Highlight */}
        {saleMatch && (
          <span className="inline-flex items-center gap-1 text-slate-900 dark:text-white font-extrabold">
            Sale <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{saleMatch[1].trim()}</span>
          </span>
        )}

        {/* Action text */}
        {customerMatch ? ' vừa đặt lịch xem ' : saleMatch ? ' đã chốt cọc ' : ''}

        {/* Room / Property Chip */}
        {roomMatch && (
          <span className="inline-flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-200/70 dark:border-indigo-800/60 shadow-2xs">
            <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            phòng <strong className="font-extrabold text-indigo-950 dark:text-indigo-100">{roomMatch[1].trim()}</strong>
          </span>
        )}

        {/* Time & Date Chip */}
        {timeDateMatch && (
          <span className="inline-flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-200/70 dark:border-amber-800/60 shadow-2xs">
            <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            {timeDateMatch[1] ? `${timeDateMatch[1]} — ` : ''}
            {formatIsoDate(timeDateMatch[2])}
          </span>
        )}

        {/* Amount Chip */}
        {amountMatch && (
          <span className="inline-flex items-center gap-1 font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-lg border border-emerald-200/70 dark:border-emerald-800/60 shadow-2xs">
            💰 {amountMatch[0]}
          </span>
        )}
      </div>
    </div>
  );
}

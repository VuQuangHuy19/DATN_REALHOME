'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CalendarDays, Phone, Clock, MapPin, ArrowLeft, Building2, AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';

export interface AppointmentResult {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  room_title: string | null;
  date: string;
  time: string;
  area: string | null;
  status: string;
  notes: string | null;
  building_address: string | null;
  profiles?: { full_name: string | null; phone: string | null; } | null;
}

const statusLabels: Record<string, string> = {
  Pending: 'Đang chờ xác nhận',
  Confirm: 'Đã xác nhận',
  Viewed: 'Đã xem phòng',
  Dealed: 'Đã chốt thành công',
  Cancel: 'Đã hủy',
  pending: 'Đang chờ xác nhận',
  confirmed: 'Đã xác nhận',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

const statusColors: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Confirm: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Viewed: 'bg-blue-50 text-blue-700 border-blue-200',
  Dealed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Cancel: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-blue-50 text-blue-700 border-blue-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
  }
  return dateStr;
}

function StatusBadge({ status }: { status: string }) {
  const label = statusLabels[status] || status;
  const color = statusColors[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  const isCancelled = status === 'Cancel' || status === 'cancelled';
  const isSuccess = status === 'Dealed' || status === 'completed';
  const isConfirmed = status === 'Confirm' || status === 'confirmed';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
      {isCancelled ? <XCircle className="h-3 w-3" /> : isSuccess || isConfirmed ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
      {label}
    </span>
  );
}

export default function TrackAppointmentPage() {
  const [phone, setPhone] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [results, setResults] = useState<AppointmentResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{phone?: string}>({});
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setFieldErrors({ phone: 'Bạn cần nhập Số điện thoại' });
      return;
    }
    
    setFieldErrors({});
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const params = new URLSearchParams({ phone: phone.trim() });
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);

      const res = await fetch(`/api/appointments/public/track?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra khi tìm kiếm lịch hẹn.');
      }
      
      setResults(data.appointments as AppointmentResult[]);
    } catch (err: any) {
      setError(err.message || 'Không thể tìm kiếm lịch hẹn. Vui lòng thử lại sau.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setPhone('');
    setDateFrom('');
    setDateTo('');
    setResults(null);
    setError(null);
    setSearched(false);
  };

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Header */}
      <div className="bg-card border-b border-border-subtle shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/customer/properties"
            className="flex items-center gap-1.5 text-ink-muted hover:text-ink transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </Link>
          <div className="w-px h-5 bg-border-subtle" />
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-accent" />
            <h1 className="font-bold text-ink font-heading text-lg">Tra cứu lịch hẹn</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Intro card */}
        <div className="bg-card border border-border-subtle rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Phone className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h2 className="font-bold text-ink text-base font-heading">Kiểm tra lịch hẹn của bạn</h2>
              <p className="text-sm text-ink-muted mt-0.5 leading-relaxed">
                Nhập số điện thoại đã dùng khi đặt lịch hẹn để xem trạng thái và chi tiết lịch xem phòng.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-4" noValidate>
            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ví dụ: 0901234567"
                  className={`w-full h-11 pl-10 pr-4 rounded-xl border bg-bg-base text-ink text-sm placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition ${fieldErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-border-subtle'}`}
                />
              </div>
              {fieldErrors.phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>}
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Từ ngày</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-border-subtle bg-bg-base text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Đến ngày</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-border-subtle bg-bg-base text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className="flex-1 h-11 bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? 'Đang tìm kiếm...' : 'Tra cứu lịch hẹn'}
              </button>
              {searched && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-11 px-4 rounded-xl border border-border-subtle text-ink-muted hover:text-ink hover:bg-bg-subtle transition text-sm font-medium"
                >
                  Xóa
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Results */}
        {results !== null && !loading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-ink-muted font-medium">
                {results.length === 0
                  ? 'Không tìm thấy lịch hẹn nào'
                  : `Tìm thấy ${results.length} lịch hẹn`}
              </p>
              {results.length > 0 && (
                <span className="text-xs text-ink-muted">
                  SĐT: <span className="font-mono font-semibold text-ink">{phone}</span>
                </span>
              )}
            </div>

            {results.length === 0 ? (
              <div className="bg-card border border-border-subtle rounded-2xl p-10 text-center">
                <CalendarDays className="h-12 w-12 text-ink-muted/30 mx-auto mb-3" />
                <p className="font-semibold text-ink">Không có lịch hẹn nào</p>
                <p className="text-sm text-ink-muted mt-1 max-w-xs mx-auto leading-relaxed">
                  Không tìm thấy lịch hẹn nào với số điện thoại và thời gian bạn nhập. Vui lòng kiểm tra lại thông tin.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.map((apt) => {
                  const cleanNotes = apt.notes?.includes(' — ') ? apt.notes.split(' — ')[0] : apt.notes;
                  const addressPart = apt.building_address || (apt.notes?.includes(' — ') ? apt.notes.split(' — ')[1] : null);
                  const fullAddress = addressPart
                    ? `${addressPart}${apt.area ? ', ' + apt.area : ''}`
                    : apt.area || null;

                  return (
                    <div
                      key={apt.id}
                      className="bg-card border border-border-subtle rounded-2xl p-5 shadow-sm space-y-4 hover:border-accent/40 transition-colors"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="h-5 w-5 text-accent" />
                          </div>
                          <div>
                            <p className="font-bold text-ink text-sm">
                              {apt.room_title || 'Bất động sản'}
                            </p>
                            <p className="text-xs text-ink-muted mt-0.5">{apt.customer_name}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusBadge status={apt.status} />
                          {apt.profiles && apt.profiles.full_name && (
                            <span className="text-xs text-ink-muted flex items-center gap-1">
                              <Phone className="h-3 w-3" /> Sale: {apt.profiles.full_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-3 bg-bg-subtle/50 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 text-ink-muted flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-ink-muted uppercase font-semibold tracking-wide">Ngày xem</p>
                            <p className="text-sm font-bold text-ink font-mono">{formatDate(apt.date)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-ink-muted flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-ink-muted uppercase font-semibold tracking-wide">Giờ xem</p>
                            <p className="text-sm font-bold text-ink font-mono">{apt.time}</p>
                          </div>
                        </div>
                        {fullAddress && (
                          <div className="col-span-2 flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 text-ink-muted flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[10px] text-ink-muted uppercase font-semibold tracking-wide">Địa chỉ</p>
                              <p className="text-sm text-ink leading-snug">{fullAddress}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {cleanNotes && cleanNotes !== 'Không có ghi chú thêm.' && (
                        <div className="text-xs text-ink-muted bg-bg-subtle/30 rounded-lg p-2.5 border border-border-subtle">
                          <span className="font-semibold">Ghi chú:</span> {cleanNotes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="text-center pt-4 border-t border-border-subtle">
          <p className="text-sm text-ink-muted">
            Chưa có lịch hẹn?{' '}
            <Link href="/customer/properties" className="text-accent font-semibold hover:underline">
              Xem bất động sản và đặt lịch ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

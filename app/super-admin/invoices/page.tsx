'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileText, Search, RefreshCw, CheckCircle2, XCircle, Clock,
  Building2, Calendar, CreditCard, DollarSign, Loader2, AlertCircle,
  Eye, Check, X, ExternalLink, Filter, TrendingUp, ShieldCheck,
  CheckSquare, Square, MinusSquare, Trash2
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  code: string;
  owner_name?: string;
  phone?: string;
}

interface SaasInvoice {
  id: string;
  company_id: string;
  invoice_code: string;
  amount: number;
  plan: string;
  seats: number;
  status: 'pending' | 'unpaid' | 'paid' | 'cancelled';
  payment_method?: string;
  payos_order_code?: number;
  payment_url?: string;
  billing_period_start?: string;
  billing_period_end?: string;
  created_at: string;
  updated_at?: string;
  companies?: Company;
}

const planBadgeStyle: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-zinc-800 dark:text-zinc-200',
  professional: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
  enterprise: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300',
  starter_addon: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  professional_addon: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  enterprise_addon: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const planLabelMap: Record<string, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
  starter_addon: 'Seats mua thêm',
  professional_addon: 'Seats mua thêm',
  enterprise_addon: 'Seats mua thêm',
};

function formatVND(n: number) {
  return (n || 0).toLocaleString('vi-VN') + 'đ';
}

function formatDate(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
}

function formatDateTime(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? '—' : `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function SaasInvoicesPage() {
  const [invoices, setInvoices] = useState<SaasInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Checkbox Batch Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Single & Batch Modals
  const [selectedInvoice, setSelectedInvoice] = useState<SaasInvoice | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Batch Modals
  const [isBatchApproveOpen, setIsBatchApproveOpen] = useState(false);
  const [isBatchCancelOpen, setIsBatchCancelOpen] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [approveNote, setApproveNote] = useState('');

  const fetchInvoices = async (showRefreshSpin = false) => {
    if (showRefreshSpin) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/super-admin/invoices?status=all`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Lỗi tải danh sách hóa đơn SaaS');
      }
      const data = await res.json();
      setInvoices(data || []);
    } catch (e: any) {
      console.error('Lỗi fetch invoices:', e);
      setError(e.message || 'Không thể tải dữ liệu hóa đơn SaaS');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Filtered list
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Status filter
      if (statusFilter === 'pending') {
        if (inv.status !== 'pending' && inv.status !== 'unpaid') return false;
      } else if (statusFilter === 'paid') {
        if (inv.status !== 'paid') return false;
      } else if (statusFilter === 'cancelled') {
        if (inv.status !== 'cancelled') return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const codeMatch = inv.invoice_code?.toLowerCase().includes(term);
        const compMatch = inv.companies?.name?.toLowerCase().includes(term);
        const ownerMatch = inv.companies?.owner_name?.toLowerCase().includes(term);
        if (!codeMatch && !compMatch && !ownerMatch) return false;
      }

      return true;
    });
  }, [invoices, statusFilter, searchTerm]);

  // Selected Invoices Object Array
  const selectedInvoices = useMemo(() => {
    return invoices.filter((inv) => selectedIds.includes(inv.id));
  }, [invoices, selectedIds]);

  const selectedPendingInvoices = useMemo(() => {
    return selectedInvoices.filter((inv) => inv.status === 'pending' || inv.status === 'unpaid');
  }, [selectedInvoices]);

  const selectedPendingAmount = useMemo(() => {
    return selectedPendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [selectedPendingInvoices]);

  // Checkbox handlers
  const isAllSelected = useMemo(() => {
    if (filteredInvoices.length === 0) return false;
    return filteredInvoices.every((inv) => selectedIds.includes(inv.id));
  }, [filteredInvoices, selectedIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Deselect visible
      const visibleIds = new Set(filteredInvoices.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      // Select visible
      const visibleIds = filteredInvoices.map((i) => i.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const toggleSelectRow = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // KPIs
  const totalRevenue = useMemo(() => {
    return invoices.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [invoices]);

  const pendingInvoices = useMemo(() => {
    return invoices.filter((inv) => inv.status === 'pending' || inv.status === 'unpaid');
  }, [invoices]);

  const pendingAmount = useMemo(() => {
    return pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  }, [pendingInvoices]);

  const paidCount = useMemo(() => {
    return invoices.filter((inv) => inv.status === 'paid').length;
  }, [invoices]);

  // Click on Table Row
  const handleRowClick = (inv: SaasInvoice) => {
    setSelectedInvoice(inv);
    if (inv.status === 'pending' || inv.status === 'unpaid') {
      setIsApproveOpen(true);
    } else {
      setIsDetailOpen(true);
    }
  };

  // Single Approve
  const handleApproveInvoice = async () => {
    if (!selectedInvoice) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/super-admin/invoices/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
          note: approveNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Phê duyệt thất bại');

      setActionSuccess(`Đã phê duyệt thanh toán hóa đơn ${selectedInvoice.invoice_code} thành công!`);
      setIsApproveOpen(false);
      setSelectedInvoice(null);
      setApproveNote('');
      await fetchInvoices();
    } catch (e: any) {
      setError(e.message || 'Có lỗi xảy ra khi phê duyệt hóa đơn');
    } finally {
      setProcessing(false);
    }
  };

  // Batch Approve
  const handleBatchApprove = async () => {
    if (selectedPendingInvoices.length === 0) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/super-admin/invoices/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceIds: selectedPendingInvoices.map((inv) => inv.id),
          note: approveNote || 'Phê duyệt hàng loạt từ Super Admin',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Phê duyệt hàng loạt thất bại');

      setActionSuccess(`Đã phê duyệt hàng loạt ${selectedPendingInvoices.length} hóa đơn SaaS thành công!`);
      setIsBatchApproveOpen(false);
      setSelectedIds([]);
      setApproveNote('');
      await fetchInvoices();
    } catch (e: any) {
      setError(e.message || 'Có lỗi xảy ra khi phê duyệt hàng loạt');
    } finally {
      setProcessing(false);
    }
  };

  // Single Cancel
  const handleCancelInvoice = async () => {
    if (!selectedInvoice) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/super-admin/invoices/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoice.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hủy hóa đơn thất bại');

      setActionSuccess(`Đã hủy hóa đơn ${selectedInvoice.invoice_code} thành công.`);
      setIsCancelOpen(false);
      setSelectedInvoice(null);
      await fetchInvoices();
    } catch (e: any) {
      setError(e.message || 'Có lỗi xảy ra khi hủy hóa đơn');
    } finally {
      setProcessing(false);
    }
  };

  // Batch Cancel
  const handleBatchCancel = async () => {
    const cancellableIds = selectedInvoices.filter((inv) => inv.status !== 'paid').map((i) => i.id);
    if (cancellableIds.length === 0) return;
    setProcessing(true);
    setError(null);
    try {
      const res = await fetch('/api/super-admin/invoices/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceIds: cancellableIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hủy hàng loạt thất bại');

      setActionSuccess(`Đã hủy hàng loạt ${cancellableIds.length} hóa đơn SaaS thành công.`);
      setIsBatchCancelOpen(false);
      setSelectedIds([]);
      await fetchInvoices();
    } catch (e: any) {
      setError(e.message || 'Có lỗi xảy ra khi hủy hàng loạt');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold font-heading text-slate-900 dark:text-white tracking-tight">
              Hóa đơn dịch vụ SaaS
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Quản lý lịch sử và phê duyệt thanh toán các hóa đơn gia hạn SaaS của các công ty BĐS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchInvoices(true)}
            disabled={refreshing || loading}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActionSuccess(null)} className="h-6 w-6 p-0 text-emerald-700">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-slate-200 dark:border-zinc-800 shadow-xs rounded-xl bg-white dark:bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng doanh thu đã thu</p>
                <p className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-2xl mt-1.5 tracking-tight tabular-nums">
                  {loading ? '—' : formatVND(totalRevenue)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex-shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-zinc-800 shadow-xs rounded-xl bg-white dark:bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hóa đơn chờ duyệt</p>
                <p className="font-mono font-bold text-amber-600 dark:text-amber-400 text-2xl mt-1.5 tracking-tight tabular-nums">
                  {loading ? '—' : `${pendingInvoices.length} (${formatVND(pendingAmount)})`}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex-shrink-0">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-zinc-800 shadow-xs rounded-xl bg-white dark:bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đã hoàn tất thanh toán</p>
                <p className="text-2xl font-bold font-heading text-slate-900 dark:text-white mt-1.5 tracking-tight tabular-nums">
                  {loading ? '—' : `${paidCount} hóa đơn`}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex-shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 dark:border-zinc-800 shadow-xs rounded-xl bg-white dark:bg-zinc-900">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng hóa đơn</p>
                <p className="text-2xl font-bold font-heading text-slate-900 dark:text-white mt-1.5 tracking-tight tabular-nums">
                  {loading ? '—' : `${invoices.length} hóa đơn`}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 flex-shrink-0">
                <FileText className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Batch Action Toolbar when 1 or more rows selected */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-900 text-white p-4 rounded-xl shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-700 flex items-center justify-center font-bold text-xs">
              {selectedIds.length}
            </div>
            <div>
              <p className="font-semibold text-sm">
                Đã chọn {selectedIds.length} hóa đơn
                {selectedPendingInvoices.length > 0 && (
                  <span className="text-indigo-200 font-mono text-xs ml-2">
                    ({selectedPendingInvoices.length} chờ duyệt — {formatVND(selectedPendingAmount)})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedPendingInvoices.length > 0 && (
              <Button
                size="sm"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs gap-1.5"
                onClick={() => setIsBatchApproveOpen(true)}
              >
                <Check className="h-4 w-4" />
                Phê duyệt tất cả ({selectedPendingInvoices.length})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="bg-indigo-800 hover:bg-indigo-700 text-white border-indigo-600 text-xs gap-1.5"
              onClick={() => setIsBatchCancelOpen(true)}
            >
              <X className="h-4 w-4" />
              Hủy tất cả
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-indigo-200 hover:text-white hover:bg-indigo-800 text-xs"
              onClick={() => setSelectedIds([])}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar & Filters */}
      <Card className="border border-slate-200 dark:border-zinc-800 shadow-xs rounded-xl bg-white dark:bg-zinc-900">
        <CardContent className="p-4 space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800/80 p-1 rounded-lg overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tất cả ({invoices.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-white dark:bg-zinc-900 text-amber-600 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              Chờ duyệt ({pendingInvoices.length})
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'paid'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              Đã thanh toán ({paidCount})
            </button>
            <button
              onClick={() => setStatusFilter('cancelled')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'cancelled'
                  ? 'bg-white dark:bg-zinc-900 text-rose-600 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-slate-400"></span>
              Đã hủy ({invoices.filter((i) => i.status === 'cancelled').length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px] max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Tìm mã hóa đơn, tên công ty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs border-slate-200 rounded-lg focus-visible:ring-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Invoices Table */}
      <Card className="border border-slate-200 dark:border-zinc-800 shadow-xs rounded-xl bg-white dark:bg-zinc-900 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-xs text-slate-500">Đang tải danh sách hóa đơn SaaS...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-16 px-4">
              <FileText className="h-12 w-12 mx-auto text-slate-300 dark:text-zinc-700 mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-zinc-200">Không tìm thấy hóa đơn nào</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all'
                  ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc.'
                  : 'Hiện tại chưa có hóa đơn gia hạn SaaS nào được khởi tạo trên hệ thống.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[1050px]">
                <thead className="bg-slate-50 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                  <tr>
                    <th className="w-10 px-4 py-3.5 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        title="Chọn tất cả"
                      />
                    </th>
                    <th className="px-5 py-3.5">Mã hóa đơn</th>
                    <th className="px-5 py-3.5">Công ty BĐS</th>
                    <th className="px-5 py-3.5">Gói & Seats</th>
                    <th className="px-5 py-3.5 text-right">Số tiền</th>
                    <th className="px-5 py-3.5">Hình thức TT</th>
                    <th className="px-5 py-3.5">Kỳ hạn</th>
                    <th className="px-5 py-3.5 text-center">Trạng thái</th>
                    <th className="px-5 py-3.5">Ngày tạo</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {filteredInvoices.map((inv) => {
                    const isPending = inv.status === 'pending' || inv.status === 'unpaid';
                    const isPaid = inv.status === 'paid';
                    const isCancelled = inv.status === 'cancelled';
                    const isSelected = selectedIds.includes(inv.id);

                    const paymentMethodText =
                      inv.payment_method === 'manual_approval' || inv.payment_method === 'manual'
                        ? 'Chuyển khoản thủ công'
                        : inv.payment_method === 'payos' || inv.payment_method === 'mock_payos' || !inv.payment_method
                        ? 'VietQR PayOS'
                        : inv.payment_method;

                    return (
                      <tr
                        key={inv.id}
                        onClick={() => handleRowClick(inv)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100/60'
                            : 'hover:bg-slate-50/90 dark:hover:bg-zinc-800/40'
                        }`}
                        title="Click vào dòng để xem chi tiết / phê duyệt"
                      >
                        {/* Checkbox Cell */}
                        <td
                          className="w-10 px-4 py-4 text-center"
                          onClick={(e) => toggleSelectRow(inv.id, e)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* Invoice Code */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                              {inv.invoice_code}
                            </span>
                            {inv.payos_order_code && (
                              <span className="text-[10px] font-mono text-slate-400">
                                Order #{inv.payos_order_code}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Company */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 flex-shrink-0">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-slate-900 dark:text-white truncate">
                                {inv.companies?.name || 'Không xác định'}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate">
                                {inv.companies?.owner_name ? `Chủ sở hữu: ${inv.companies.owner_name}` : inv.companies?.code || ''}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Plan & Seats */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                planBadgeStyle[inv.plan] || 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {planLabelMap[inv.plan] || inv.plan}
                            </Badge>
                            <span className="text-xs font-mono text-slate-600 dark:text-slate-300">
                              {inv.seats} seats
                            </span>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4 text-right">
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-sm tabular-nums">
                            {formatVND(inv.amount)}
                          </span>
                        </td>

                        {/* Payment Method */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700 whitespace-nowrap">
                            <CreditCard className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                            {paymentMethodText}
                          </span>
                        </td>

                        {/* Billing Period */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col text-xs font-mono text-slate-500">
                            <span>{formatDate(inv.billing_period_start)}</span>
                            <span className="text-[10px] text-slate-400">đến {formatDate(inv.billing_period_end)}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 text-center">
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900">
                              <Clock className="h-3 w-3 animate-pulse" />
                              Chờ duyệt
                            </span>
                          )}
                          {isPaid && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900">
                              <CheckCircle2 className="h-3 w-3" />
                              Đã thanh toán
                            </span>
                          )}
                          {isCancelled && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-zinc-800 dark:text-slate-400 dark:border-zinc-700">
                              <XCircle className="h-3 w-3" />
                              Đã hủy
                            </span>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="px-5 py-4">
                          <span className="text-xs text-slate-500 font-mono">
                            {formatDate(inv.created_at)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1 shadow-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedInvoice(inv);
                                    setIsApproveOpen(true);
                                  }}
                                  title="Phê duyệt thanh toán"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Phê duyệt
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedInvoice(inv);
                                    setIsCancelOpen(true);
                                  }}
                                  title="Hủy hóa đơn"
                                >
                                  Hủy
                                </Button>
                              </>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInvoice(inv);
                                setIsDetailOpen(true);
                              }}
                              title="Xem chi tiết hóa đơn"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal 1: Phê duyệt Hóa đơn (Đơn lẻ) */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="max-w-md border border-slate-200 dark:border-zinc-800 shadow-xl rounded-2xl bg-white dark:bg-zinc-900">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <DialogTitle className="font-heading font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Xác nhận Phê duyệt Thanh toán
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-xl space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã hóa đơn:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedInvoice.invoice_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Công ty BĐS:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedInvoice.companies?.name || 'Không rõ'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gói dịch vụ:</span>
                  <span className="font-semibold text-indigo-600">{planLabelMap[selectedInvoice.plan] || selectedInvoice.plan} ({selectedInvoice.seats} seats)</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-zinc-700 pt-2 text-sm font-bold">
                  <span className="text-slate-700 dark:text-slate-200">Số tiền xác nhận:</span>
                  <span className="font-mono text-emerald-600">{formatVND(selectedInvoice.amount)}</span>
                </div>
              </div>

              

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ghi chú phê duyệt (tùy chọn):</label>
                <Input
                  placeholder="Ví dụ: Đã nhận chuyển khoản qua VietQR thành công"
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <Button
              variant="outline"
              onClick={() => setIsApproveOpen(false)}
              disabled={processing}
              className="text-xs"
            >
              Hủy bỏ
            </Button>
            <Button
              onClick={handleApproveInvoice}
              disabled={processing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Xác nhận Phê duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Phê duyệt Hàng loạt (Batch Approve) */}
      <Dialog open={isBatchApproveOpen} onOpenChange={setIsBatchApproveOpen}>
        <DialogContent className="max-w-md border border-slate-200 dark:border-zinc-800 shadow-xl rounded-2xl bg-white dark:bg-zinc-900">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <DialogTitle className="font-heading font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Phê duyệt Hàng loạt ({selectedPendingInvoices.length} Hóa đơn)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Số lượng hóa đơn chọn:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedPendingInvoices.length} hóa đơn</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-zinc-700 pt-2 text-sm font-bold">
                <span className="text-slate-700 dark:text-slate-200">Tổng tiền xác nhận:</span>
                <span className="font-mono text-emerald-600">{formatVND(selectedPendingAmount)}</span>
              </div>
            </div>

            <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-100 dark:bg-zinc-800 p-2.5 rounded-lg text-[11px] font-mono">
              {selectedPendingInvoices.map((inv) => (
                <div key={inv.id} className="flex justify-between">
                  <span className="font-bold text-indigo-600">{inv.invoice_code}</span>
                  <span>{inv.companies?.name} — {formatVND(inv.amount)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Ghi chú phê duyệt hàng loạt:</label>
              <Input
                placeholder="Ví dụ: Phê duyệt hàng loạt các giao dịch chuyển khoản VietQR"
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setIsBatchApproveOpen(false)} disabled={processing} className="text-xs">
              Hủy bỏ
            </Button>
            <Button onClick={handleBatchApprove} disabled={processing} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Phê duyệt tất cả ({selectedPendingInvoices.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 3: Hủy Hóa đơn (Đơn lẻ) */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="max-w-md border border-slate-200 dark:border-zinc-800 shadow-xl rounded-2xl bg-white dark:bg-zinc-900">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <DialogTitle className="font-heading font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600" />
              Xác nhận Hủy Hóa đơn SaaS
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-3 py-2 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Bạn có chắc chắn muốn hủy hóa đơn <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedInvoice.invoice_code}</span> của công ty <span className="font-bold">{selectedInvoice.companies?.name}</span> không?
              </p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                Hóa đơn sẽ chuyển sang trạng thái <strong>Đã hủy</strong> và công ty sẽ không được kích hoạt gói dịch vụ từ hóa đơn này.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setIsCancelOpen(false)} disabled={processing} className="text-xs">
              Đóng
            </Button>
            <Button onClick={handleCancelInvoice} disabled={processing} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs">
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Hủy hóa đơn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Hủy Hóa đơn Hàng loạt (Batch Cancel) */}
      <Dialog open={isBatchCancelOpen} onOpenChange={setIsBatchCancelOpen}>
        <DialogContent className="max-w-md border border-slate-200 dark:border-zinc-800 shadow-xl rounded-2xl bg-white dark:bg-zinc-900">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <DialogTitle className="font-heading font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-600" />
              Xác nhận Hủy Hàng loạt ({selectedIds.length} Hóa đơn)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Bạn có chắc chắn muốn hủy <span className="font-bold">{selectedIds.length}</span> hóa đơn đã chọn không?
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
              Các hóa đơn sẽ chuyển sang trạng thái <strong>Đã hủy</strong>. Lưu ý các hóa đơn đã thanh toán thành công sẽ được giữ nguyên.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setIsBatchCancelOpen(false)} disabled={processing} className="text-xs">
              Đóng
            </Button>
            <Button onClick={handleBatchCancel} disabled={processing} className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs">
              {processing && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Xác nhận Hủy tất cả
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal 5: Chi tiết Hóa đơn */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg border border-slate-200 dark:border-zinc-800 shadow-xl rounded-2xl bg-white dark:bg-zinc-900">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-zinc-800">
            <DialogTitle className="font-heading font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              Chi tiết Hóa đơn SaaS
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-xl">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Mã hóa đơn</span>
                  <span className="font-mono font-bold text-indigo-600 text-sm">{selectedInvoice.invoice_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Trạng thái</span>
                  <span className="font-bold text-slate-900 dark:text-white uppercase">{selectedInvoice.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Công ty BĐS</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedInvoice.companies?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Chủ sở hữu</span>
                  <span className="text-slate-700 dark:text-slate-300">{selectedInvoice.companies?.owner_name || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Gói SaaS</span>
                  <span className="font-bold text-indigo-600">{planLabelMap[selectedInvoice.plan] || selectedInvoice.plan}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Số lượng Seats</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedInvoice.seats} chỗ</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Số tiền thanh toán</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">{formatVND(selectedInvoice.amount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Phương thức</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedInvoice.payment_method || 'payos'}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500">Mã đơn PayOS (orderCode):</span>
                  <span className="font-mono font-bold">{selectedInvoice.payos_order_code || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500">Kỳ thanh toán:</span>
                  <span className="font-mono">{formatDate(selectedInvoice.billing_period_start)} đến {formatDate(selectedInvoice.billing_period_end)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-zinc-800">
                  <span className="text-slate-500">Thời gian tạo:</span>
                  <span className="font-mono">{formatDateTime(selectedInvoice.created_at)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Cập nhật lần cuối:</span>
                  <span className="font-mono">{formatDateTime(selectedInvoice.updated_at)}</span>
                </div>
              </div>

              {selectedInvoice.payment_url && (
                <div className="pt-2">
                  <a
                    href={selectedInvoice.payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-indigo-600 font-semibold rounded-lg text-xs transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Mở liên kết thanh toán PayOS
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-zinc-800">
            <Button variant="outline" onClick={() => setIsDetailOpen(false)} className="text-xs w-full sm:w-auto">
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

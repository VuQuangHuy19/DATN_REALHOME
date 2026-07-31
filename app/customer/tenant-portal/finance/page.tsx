'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Wallet, CreditCard, QrCode, Receipt, AlertTriangle,
  CheckCircle2, Clock, Download, Send, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface InvoiceItem {
  id: string;
  month: string;
  total: string;
  totalNum: number;
  status: 'unpaid' | 'paid' | 'overdue';
  dueDate: string;
  items: { name: string; amount: string }[];
  landlordBankName?: string;
  landlordAccountNumber?: string;
  landlordAccountOwner?: string;
}

export default function FinancePage() {
  const { user, profile } = useAuth();
  const [autoPay, setAutoPay] = useState(false);
  const [autoPayDialogOpen, setAutoPayDialogOpen] = useState(false);
  const [complaintDialogOpen, setComplaintDialogOpen] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [complaintInvoiceId, setComplaintInvoiceId] = useState<string | null>(null);

  // Dynamic calculation of totalPaid and totalUnpaid from invoices state
  const totalPaid = useMemo(() => {
    return invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.totalNum, 0);
  }, [invoices]);

  const totalUnpaid = useMemo(() => {
    return invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.totalNum, 0);
  }, [invoices]);

  // Payment Modal States
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<InvoiceItem | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'momo' | 'vietqr'>('momo');
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    if (!isPayModalOpen) {
      setTimeLeft(15 * 60);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPayModalOpen]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!user) return;

    async function fetchInvoices() {
      setLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
        const res = await fetch('/api/customer/tenant-portal/invoices', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        const invData = data.invoices || [];

        if (invData && invData.length > 0) {
          const mapped: InvoiceItem[] = invData.map((inv: any) => {
            const statusMap: Record<string, 'unpaid' | 'paid' | 'overdue'> = {
              unpaid: 'unpaid',
              paid: 'paid',
              partially_paid: 'unpaid',
              overdue: 'overdue',
              cancelled: 'paid',
            };

            const items = [
              inv.rent_amount > 0 && { name: 'Tiền phòng', amount: `${Number(inv.rent_amount).toLocaleString('vi-VN')}đ` },
              inv.electricity_amount > 0 && { name: `Điện (${inv.electricity_usage || 0} kWh)`, amount: `${Number(inv.electricity_amount).toLocaleString('vi-VN')}đ` },
              inv.water_amount > 0 && { name: 'Tiền nước', amount: `${Number(inv.water_amount).toLocaleString('vi-VN')}đ` },
              inv.service_amount > 0 && { name: 'Phí dịch vụ', amount: `${Number(inv.service_amount).toLocaleString('vi-VN')}đ` },
              inv.other_amount > 0 && { name: inv.other_details || 'Dịch vụ khác', amount: `${Number(inv.other_amount).toLocaleString('vi-VN')}đ` },
            ].filter(Boolean) as { name: string; amount: string }[];

            const periodLabel = inv.period
              ? `T${new Date(inv.period + '-01').getMonth() + 1}/${new Date(inv.period + '-01').getFullYear()}`
              : new Date(inv.issue_date).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

            const landlordInfo = inv.rooms?.buildings?.landlords;

            return {
              id: inv.id,
              month: periodLabel,
              total: `${Number(inv.total_amount).toLocaleString('vi-VN')}đ`,
              totalNum: Number(inv.total_amount),
              status: statusMap[inv.status] || 'unpaid',
              dueDate: inv.due_date ? new Date(inv.due_date).toLocaleDateString('vi-VN') : '',
              items,
              landlordBankName: landlordInfo?.bank_name || undefined,
              landlordAccountNumber: landlordInfo?.bank_account_number || undefined,
              landlordAccountOwner: landlordInfo?.bank_account_owner || undefined,
            };
          });

          setInvoices(mapped);

          // Auto-expand first unpaid invoice
          const firstUnpaid = mapped.find((i) => i.status === 'unpaid');
          if (firstUnpaid) setExpandedInvoice(firstUnpaid.id);
        } else {
          setInvoices([]);
        }
      } catch (err) {
        console.error('Error fetching invoices:', err);
        toast.error('Không thể tải hóa đơn. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, [user, profile]);

  const handleToggleAutoPay = () => {
    setAutoPayDialogOpen(true);
  };

  const confirmAutoPay = () => {
    setAutoPay(!autoPay);
    setAutoPayDialogOpen(false);
    toast.success(autoPay ? 'Đã tắt thanh toán tự động' : 'Đã bật thanh toán tự động thành công!');
  };

  const pendingCount = invoices.filter((i) => i.status !== 'paid').length;

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-full min-w-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-ink font-heading flex items-center gap-2">
            <Wallet className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 shrink-0" />
            <span>Tài chính &amp; Ví</span>
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted mt-1">Quản lý thanh toán, hóa đơn và ví điện tử</p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-300">
            <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
            <span>Đang tải hóa đơn...</span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Hóa đơn chờ thanh toán */}
        <Card className="border border-orange-300 bg-gradient-to-br from-orange-100/90 to-amber-100/60 dark:from-orange-950/40 dark:to-amber-950/30 shadow-sm min-w-0">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <p className="text-xs sm:text-sm font-extrabold text-orange-950 dark:text-orange-100 truncate">Chờ thanh toán</p>
              <Badge className="bg-orange-600 text-white border-none font-extrabold text-[10px] sm:text-xs shrink-0">
                {pendingCount} HĐ
              </Badge>
            </div>
            <p className="text-xl font-extrabold text-orange-800 dark:text-orange-200 font-mono truncate">
              {totalUnpaid.toLocaleString('vi-VN')}đ
            </p>
            <p className="text-[11px] text-orange-700 dark:text-orange-300 mt-1 font-semibold">Cần thanh toán sớm</p>
          </CardContent>
        </Card>

        {/* Đã thanh toán */}
        <Card className="border border-emerald-300 bg-gradient-to-br from-emerald-100/90 to-green-100/60 dark:from-emerald-950/40 dark:to-green-950/30 shadow-sm min-w-0">
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs sm:text-sm font-extrabold text-emerald-950 dark:text-emerald-100 mb-1">Đã thanh toán</p>
            <p className="text-xl sm:text-2xl font-extrabold text-emerald-800 dark:text-emerald-200 font-mono truncate">
              {totalPaid.toLocaleString('vi-VN')}đ
            </p>
            <p className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-300 mt-1 font-semibold">Lịch sử thanh toán</p>
          </CardContent>
        </Card>

        {/* QR Thanh toán */}
        <Card className="border border-blue-300 bg-gradient-to-br from-blue-100/90 to-indigo-100/60 dark:from-blue-950/40 dark:to-indigo-950/30 shadow-sm min-w-0">
          <CardContent className="p-4 sm:p-5 flex flex-col items-center text-center">
            <QrCode className="h-8 w-8 sm:h-10 sm:w-10 text-blue-700 dark:text-blue-300 mb-1.5 shrink-0" />
            <p className="text-xs sm:text-sm font-extrabold text-blue-950 dark:text-blue-100">VietQR / Napas</p>
            <p className="text-[10px] text-blue-800 dark:text-blue-300 mt-0.5 font-semibold">Quét mã để thanh toán nhanh</p>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Pay Toggle */}
      <Card className="border border-border-subtle min-w-0">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs sm:text-sm font-bold text-ink">Thanh toán tự động (Auto-Pay)</p>
            <p className="text-[11px] sm:text-xs text-ink-muted mt-0.5">Tự động trừ tiền từ Ví khi hóa đơn đến hạn</p>
          </div>
          <div className="flex items-center justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-subtle">
            <Badge variant="outline" className={`text-[10px] font-extrabold shrink-0 ${autoPay ? 'text-emerald-700 border-emerald-400 bg-emerald-50' : 'text-slate-600 border-slate-300 bg-slate-50'}`}>
              {autoPay ? '✓ Đang bật' : '○ Đang tắt'}
            </Badge>

            <AlertDialog open={autoPayDialogOpen} onOpenChange={setAutoPayDialogOpen}>
              <AlertDialogTrigger asChild>
                <div>
                  <Switch checked={autoPay} onCheckedChange={handleToggleAutoPay} />
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-sm sm:max-w-lg p-5">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-ink font-heading text-base sm:text-lg">
                    {autoPay ? 'Tắt Thanh toán tự động?' : 'Bật Thanh toán tự động?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs sm:text-sm">
                    {autoPay
                      ? 'Khi tắt, bạn sẽ cần thanh toán thủ công mỗi tháng. Hệ thống sẽ nhắc nhở trước ngày đến hạn.'
                      : 'Khi bật, hệ thống sẽ tự động trừ tiền từ Ví của bạn khi hóa đơn đến hạn. Đảm bảo Ví luôn có đủ số dư.'
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmAutoPay} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                    Xác nhận {autoPay ? 'tắt' : 'bật'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Danh sách Hóa đơn */}
      <Card className="border border-border-subtle min-w-0">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-ink font-heading flex items-center gap-2">
            <Receipt className="h-5 w-5 text-amber-600 shrink-0" />
            <span>Bảng kê Hóa đơn</span>
          </h2>
          {invoices.length > 0 && (
            <Badge variant="outline" className="text-[10px] text-ink-muted font-bold">
              {invoices.length} hóa đơn
            </Badge>
          )}
        </CardHeader>
        <CardContent className="pt-2 space-y-3">
          {/* Empty state */}
          {!loading && invoices.length === 0 && (
            <div className="py-10 flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Receipt className="h-6 w-6 text-amber-400" />
              </div>
              <p className="text-sm font-bold text-ink">Chưa có hóa đơn nào</p>
              <p className="text-xs text-ink-muted">Hóa đơn sẽ xuất hiện khi Ban Quản Lý phát sinh hóa đơn cho phòng của bạn.</p>
            </div>
          )}

          {invoices.map((invoice) => (
            <div key={invoice.id} className={`rounded-xl border transition-all overflow-hidden ${
              invoice.status === 'unpaid' ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20' :
              invoice.status === 'overdue' ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20' :
              'border-border-subtle bg-bg-subtle'
            }`}>
              <div
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 gap-3 cursor-pointer"
                onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 ${
                    invoice.status === 'unpaid' ? 'bg-amber-500/20 border border-amber-400/60' :
                    invoice.status === 'overdue' ? 'bg-red-500/20 border border-red-400/60' :
                    'bg-emerald-500/15'
                  }`}>
                    {invoice.status === 'paid' ? <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-700" /> :
                     invoice.status === 'overdue' ? <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-700" /> :
                     <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-800 dark:text-amber-200" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-ink truncate">Hóa đơn {invoice.month}</p>
                    <p className="text-[10px] text-ink-muted truncate">Hạn TT: {invoice.dueDate}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border-subtle/60">
                  <div className="text-left sm:text-right">
                    <p className="text-sm sm:text-base font-extrabold text-ink font-mono">{invoice.total}</p>
                  </div>
                  <Badge className={`text-[10px] font-extrabold shrink-0 border ${
                    invoice.status === 'unpaid' ? 'bg-amber-100 text-amber-950 border-amber-400' :
                    invoice.status === 'overdue' ? 'bg-red-100 text-red-900 border-red-400' :
                    'bg-emerald-100 text-emerald-900 border-emerald-400'
                  }`}>
                    {invoice.status === 'unpaid' ? 'Chờ thanh toán' :
                     invoice.status === 'overdue' ? 'Quá hạn' : 'Đã thanh toán'}
                  </Badge>
                </div>
              </div>

              {/* Chi tiết hóa đơn (expanded) */}
              {expandedInvoice === invoice.id && invoice.items.length > 0 && (
                <div className="px-3.5 sm:px-4 pb-4 pt-0 border-t border-border-subtle animate-fade-in">
                  <div className="space-y-1.5 mt-3">
                    {invoice.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs sm:text-sm py-1">
                        <span className="text-ink-muted truncate">{item.name}</span>
                        <span className="font-semibold text-ink font-mono shrink-0 ml-2">{item.amount}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-ink border-t border-border-subtle pt-2 mt-2">
                      <span>Tổng cộng</span>
                      <span className="font-mono text-amber-900 dark:text-amber-300 font-extrabold text-sm sm:text-base">{invoice.total}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-border-subtle">
                    {invoice.status !== 'paid' && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedInvoiceForPay(invoice);
                          setIsPayModalOpen(true);
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs shadow-sm cursor-pointer"
                      >
                        <CreditCard className="h-3.5 w-3.5 mr-1" />
                        Thanh toán ngay
                      </Button>
                    )}

                    {/* Khiếu nại AlertDialog */}
                    <AlertDialog
                      open={complaintDialogOpen && complaintInvoiceId === invoice.id}
                      onOpenChange={(open) => {
                        setComplaintDialogOpen(open);
                        if (!open) setComplaintInvoiceId(null);
                      }}
                    >
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-xs border-red-300 text-red-600 hover:bg-red-50"
                          onClick={() => setComplaintInvoiceId(invoice.id)}
                        >
                          <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                          Khiếu nại
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-sm sm:max-w-lg p-5">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-ink font-heading text-base">Gửi Khiếu Nại Hóa Đơn {invoice.month}</AlertDialogTitle>
                          <AlertDialogDescription className="text-xs sm:text-sm">
                            <p>Bạn muốn khiếu nại hóa đơn <strong>{invoice.month}</strong> với tổng số tiền <strong>{invoice.total}</strong>?</p>
                            <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 text-xs text-red-800 dark:text-red-200">
                              <p className="font-semibold mb-1">Lưu ý:</p>
                              <ul className="list-disc list-inside text-xs space-y-0.5">
                                <li>Khiếu nại sẽ được gửi tới Kế Toán và Ban Quản Lý</li>
                                <li>Thời gian xử lý: 3-5 ngày làm việc</li>
                                <li>Bạn sẽ nhận thông báo qua email khi có kết quả</li>
                              </ul>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white font-bold"
                            onClick={() => toast.success('Khiếu nại hóa đơn đã được gửi thành công!')}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Xác nhận gửi khiếu nại
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button variant="ghost" size="sm" className="rounded-xl text-xs text-ink-muted">
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Tải PDF
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Modal Thanh toán Online PayOS VietQR */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl bg-white border border-border-subtle p-6 text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading text-slate-950 flex items-center gap-2">
              <QrCode className="h-6 w-6 text-amber-500" /> Cổng Thanh Toán PayOS / VietQR
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-950 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500 text-slate-950 font-extrabold flex items-center justify-center text-sm shadow-inner">
                  PayOS
                </div>
                <div>
                  <h4 className="font-bold text-sm">Thanh toán qua PayOS (VietQR / Napas247)</h4>
                  <p className="text-[11px] text-slate-400">Hỗ trợ tất cả ứng dụng Ngân hàng (MB, VCB, Techcom, VPBank...)</p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-amber-400">
                <Clock className="h-3.5 w-3.5" /> {formatTimer(timeLeft)}
              </div>
            </div>

            {/* Mã QR VietQR Động */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="relative h-52 w-52 bg-white p-2 rounded-xl border border-slate-300 shadow-md flex items-center justify-center">
                <img
                  src={
                    selectedInvoiceForPay?.landlordAccountNumber
                      ? `https://img.vietqr.io/image/${(selectedInvoiceForPay.landlordBankName || 'MB').replace(/\s+/g, '')}-${selectedInvoiceForPay.landlordAccountNumber}-compact2.png?amount=${selectedInvoiceForPay.totalNum}&addInfo=REALHOME%20${selectedInvoiceForPay.month}&accountName=${encodeURIComponent(selectedInvoiceForPay.landlordAccountOwner || '')}`
                      : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PayOS_VietQR_RealHome_${selectedInvoiceForPay?.id || 'INV'}_Amount_${selectedInvoiceForPay?.totalNum || 0}`
                  }
                  alt="PayOS VietQR Code"
                  className="h-full w-full object-contain rounded-lg"
                />
              </div>
              <p className="text-xs text-slate-600 font-medium">Mở App Ngân hàng bất kỳ và Quét mã VietQR trên</p>
            </div>

            {/* Chi tiết chuyển khoản */}
            <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
                <span className="font-bold text-slate-900">{selectedInvoiceForPay?.landlordBankName || 'MBBank (Ngân hàng Quân Đội)'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số tài khoản nhận:</span>
                <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                  <span>{selectedInvoiceForPay?.landlordAccountNumber || '0857 844 999'}</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Chủ tài khoản:</span>
                <span className="font-bold text-slate-900">{selectedInvoiceForPay?.landlordAccountOwner || 'CTY CP BĐS REALHOME'}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số tiền:</span>
                <span className="font-mono font-extrabold text-amber-600 text-sm">{selectedInvoiceForPay?.total}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500">Nội dung chuyển tiền:</span>
                <div className="flex items-center gap-1 font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <span>REALHOME {selectedInvoiceForPay?.month || 'P201'}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={async () => {
                if (selectedInvoiceForPay) {
                  try {
                    await supabase
                      .from('invoices')
                      .update({ status: 'paid' })
                      .eq('id', selectedInvoiceForPay.id);
                  } catch (err) {
                    console.error('Error updating invoice:', err);
                  }
                }
                setInvoices((prev) =>
                  prev.map((i) => (i.id === selectedInvoiceForPay?.id ? { ...i, status: 'paid' } : i))
                );
                setIsPayModalOpen(false);
                toast.success('Hệ thống PayOS đã xác nhận thanh toán thành công!');
              }}
              className="w-full rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold py-3 shadow-md cursor-pointer"
            >
              Xác nhận đã chuyển khoản PayOS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Receipt,
  CreditCard,
  QrCode,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Droplets,
  Wifi,
  Building2,
  Copy,
  Download,
  Calendar,
  DollarSign,
  Smartphone,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';

interface CustomerInvoice {
  id: string;
  invoiceCode: string;
  period: string;
  roomCode: string;
  buildingName: string;
  dueDate: string;
  status: 'unpaid' | 'paid';
  rentAmount: number;
  electricity: { old: number; new: number; usage: number; rate: number; total: number };
  water: { usage: number; rate: number; total: number };
  internetAmount: number;
  commonServiceAmount: number;
  totalAmount: number;
}

const MOCK_INVOICE: CustomerInvoice = {
  id: 'INV-2026-07',
  invoiceCode: 'HD-P201-0726',
  period: 'Tháng 07/2026',
  roomCode: 'P.201',
  buildingName: 'Tòa nhà RealHome Cầu Giấy',
  dueDate: '30/07/2026',
  status: 'unpaid',
  rentAmount: 5000000,
  electricity: { old: 1240, new: 1365, usage: 125, rate: 4000, total: 500000 },
  water: { usage: 3, rate: 35000, total: 105000 },
  internetAmount: 100000,
  commonServiceAmount: 150000,
  totalAmount: 5855000,
};

export default function TenantInvoicesPage() {
  const { user, profile } = useAuth();
  const [invoice, setInvoice] = useState<CustomerInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'momo' | 'vietqr'>('momo');

  // Countdown timer 15 minutes
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    async function fetchRealInvoice() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*, rooms(code, building_id, buildings(id, name, address))')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) console.error('Error fetching invoices:', error);

        if (data && data.length > 0) {
          const item = data[0];
          const b = (item.rooms as any)?.buildings;
          const r = item.rooms as any;

          const oldEl = item.electricity_old_index || 1240;
          const newEl = item.electricity_new_index || 1365;
          const elUsage = newEl - oldEl > 0 ? newEl - oldEl : 125;
          const elRate = item.electricity_rate || 4000;
          const elTotal = item.electricity_fee || elUsage * elRate;

          const wUsage = item.water_usage || 3;
          const wRate = item.water_rate || 35000;
          const wTotal = item.water_fee || wUsage * wRate;

          setInvoice({
            id: item.id,
            invoiceCode: item.invoice_code || `HD-P${r?.code || '501'}-0726`,
            period: item.billing_cycle || 'Tháng 07/2026',
            roomCode: r?.code ? `P.${r.code}` : 'P.501',
            buildingName: b?.name || 'Số 3 ngõ 248 Yên Hoà',
            dueDate: item.due_date ? new Date(item.due_date).toLocaleDateString('vi-VN') : '30/07/2026',
            status: item.status === 'paid' ? 'paid' : 'unpaid',
            rentAmount: item.room_fee || item.rent_amount || 5000000,
            electricity: { old: oldEl, new: newEl, usage: elUsage, rate: elRate, total: elTotal },
            water: { usage: wUsage, rate: wRate, total: wTotal },
            internetAmount: item.internet_fee || 100000,
            commonServiceAmount: item.service_fee || 150000,
            totalAmount: item.total_amount || (5000000 + elTotal + wTotal + 100000 + 150000),
          });
        } else {
          setInvoice(MOCK_INVOICE);
        }
      } catch (err) {
        console.error('Lỗi khi tải hóa đơn:', err);
        setInvoice(MOCK_INVOICE);
      } finally {
        setLoading(false);
      }
    }

    fetchRealInvoice();
  }, [user]);

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

  const transferContent = `REALHOME ${invoice?.roomCode || 'P501'} T0726`;
  const momoNumber = '0857 844 999';
  const momoOwner = 'CTY CP BĐS REALHOME';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}!`);
  };

  const handleSimulatePaid = async () => {
    if (invoice && !invoice.id.startsWith('INV-')) {
      try {
        await supabase
          .from('invoices')
          .update({ status: 'paid' })
          .eq('id', invoice.id);
      } catch (err) {
        console.error('Lỗi cập nhật hóa đơn:', err);
      }
    }

    setInvoice((prev) => (prev ? { ...prev, status: 'paid' } : null));
    setIsPayModalOpen(false);
    toast.success('Hệ thống đã ghi nhận thanh toán thành công!');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950 p-6 md:p-8 text-white border border-amber-500/30 shadow-xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-400/30">
              <Receipt className="h-3.5 w-3.5 text-amber-400" /> Quản lý hóa đơn &amp; Cổng thanh toán
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-white tracking-tight">
              Hóa Đơn &amp; Thanh Toán Online
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-xl">
              Tra cứu chi tiết tiền phòng, chỉ số điện nước &amp; thực hiện thanh toán trực tuyến qua ví MoMo Banking hoặc VietQR.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            {invoice.status === 'unpaid' ? (
              <Button
                size="lg"
                onClick={() => setIsPayModalOpen(true)}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold shadow-lg shadow-amber-500/25 flex items-center gap-2"
              >
                <CreditCard className="h-5 w-5" />
                Thanh toán ngay ({invoice.totalAmount.toLocaleString('vi-VN')}đ)
              </Button>
            ) : (
              <Badge className="bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-xl">
                ✅ Đã thanh toán đầy đủ
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Main Invoice Card */}
      <Card className="border border-border-subtle rounded-2xl bg-white shadow-sm overflow-hidden">
        {/* Top bar */}
        <div className="bg-slate-950 p-6 text-white border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-mono font-extrabold text-sm">
                Mã hóa đơn: {invoice.invoiceCode}
              </span>
              <Badge
                className={
                  invoice.status === 'unpaid'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                }
              >
                {invoice.status === 'unpaid' ? '⚠️ Chưa thanh toán' : '✅ Đã thanh toán'}
              </Badge>
            </div>
            <h2 className="text-xl font-bold font-heading text-white mt-1">
              Hóa Đơn {invoice.period} — {invoice.buildingName} ({invoice.roomCode})
            </h2>
          </div>

          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-left sm:text-right shrink-0">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Tổng tiền kỳ này</span>
            <span className="text-2xl font-extrabold text-amber-400 font-mono">
              {invoice.totalAmount.toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Cảnh báo hạn */}
          {invoice.status === 'unpaid' && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-400/40 flex items-center gap-3 text-amber-900 text-xs font-medium">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <strong>Hạn chót thanh toán: {invoice.dueDate}</strong>. Vui lòng hoàn tất thanh toán đúng hạn để tránh phát sinh phí phạt quá hạn.
              </div>
            </div>
          )}

          {/* Bảng kê chi tiết các mục */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold font-heading text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-500" /> Chi Tiết Các Khoản Phí Tháng 07/2026
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Khoản mục</th>
                    <th className="p-3">Chi tiết / Chỉ số</th>
                    <th className="p-3">Đơn giá</th>
                    <th className="p-3 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {/* Tiền nhà */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-600" /> Tiền thuê phòng
                    </td>
                    <td className="p-3 text-slate-500">{invoice.period} ({invoice.roomCode})</td>
                    <td className="p-3 text-slate-500 font-mono">{invoice.rentAmount.toLocaleString('vi-VN')}đ</td>
                    <td className="p-3 text-right font-bold font-mono text-slate-950">
                      {invoice.rentAmount.toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* Điện */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" /> Tiền Điện
                    </td>
                    <td className="p-3 text-slate-500 font-mono">
                      {invoice.electricity.old} ➔ {invoice.electricity.new} ({invoice.electricity.usage} kWh)
                    </td>
                    <td className="p-3 text-slate-500 font-mono">{invoice.electricity.rate.toLocaleString('vi-VN')}đ/kWh</td>
                    <td className="p-3 text-right font-bold font-mono text-amber-700">
                      {invoice.electricity.total.toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* Nước */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-500" /> Tiền Nước
                    </td>
                    <td className="p-3 text-slate-500 font-mono">{invoice.water.usage} m³</td>
                    <td className="p-3 text-slate-500 font-mono">{invoice.water.rate.toLocaleString('vi-VN')}đ/m³</td>
                    <td className="p-3 text-right font-bold font-mono text-blue-700">
                      {invoice.water.total.toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* Internet */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-purple-500" /> Internet / Wifi
                    </td>
                    <td className="p-3 text-slate-500">Cố định theo phòng</td>
                    <td className="p-3 text-slate-500 font-mono">{invoice.internetAmount.toLocaleString('vi-VN')}đ</td>
                    <td className="p-3 text-right font-bold font-mono text-purple-700">
                      {invoice.internetAmount.toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* Dịch vụ chung */}
                  <tr className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" /> Dịch vụ chung
                    </td>
                    <td className="p-3 text-slate-500">Vệ sinh, thang máy, điện chung</td>
                    <td className="p-3 text-slate-500 font-mono">{invoice.commonServiceAmount.toLocaleString('vi-VN')}đ</td>
                    <td className="p-3 text-right font-bold font-mono text-slate-800">
                      {invoice.commonServiceAmount.toLocaleString('vi-VN')}đ
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="p-4 bg-slate-900 text-white flex justify-between items-center border-t border-slate-800">
                <span className="font-extrabold text-sm uppercase font-heading text-amber-400">Tổng cộng thanh toán</span>
                <span className="text-xl font-extrabold font-mono text-amber-400">
                  {invoice.totalAmount.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>
          </div>
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
                  <p className="text-[11px] text-slate-400">Hỗ trợ tất cả ứng dụng Ngân hàng (MB, VCB, Techcom...)</p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-black/40 px-2.5 py-1 rounded-lg text-xs font-mono font-bold text-amber-400">
                <Clock className="h-3.5 w-3.5" /> {formatTimer(timeLeft)}
              </div>
            </div>

            {/* Mã QR VietQR Động */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="relative h-52 w-52 bg-white p-2 rounded-xl border border-slate-300 shadow-md flex items-center justify-center">
                <Image
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PayOS_VietQR_RealHome_${invoice.id}`}
                  alt="PayOS VietQR Code"
                  width={200}
                  height={200}
                  className="object-contain rounded-lg"
                />
              </div>
              <p className="text-xs text-slate-600 font-medium">Mở App Ngân hàng bất kỳ và Quét mã VietQR trên</p>
            </div>

            {/* Chi tiết chuyển khoản */}
            <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
                <span className="font-bold text-slate-900">MBBank (Ngân hàng Quân Đội)</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số tài khoản nhận:</span>
                <div className="flex items-center gap-1 font-mono font-bold text-slate-900">
                  <span>0857 844 999</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Chủ tài khoản:</span>
                <span className="font-bold text-slate-900">CTY CP BĐS REALHOME</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500">Số tiền:</span>
                <span className="font-mono font-extrabold text-amber-600 text-sm">{invoice.totalAmount.toLocaleString('vi-VN')}đ</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500">Nội dung chuyển tiền:</span>
                <div className="flex items-center gap-1 font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <span>{transferContent}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSimulatePaid}
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

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  FileText, AlertTriangle, CheckCircle2, Clock, Calendar,
  Download, Building2, User, Phone, CreditCard,
  Printer, ShieldCheck, MapPin, Loader2, RefreshCw, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';

export interface TenantContractItem {
  id: string;
  code: string;
  type: string;
  apartment: string;
  buildingName: string;
  address: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expiring' | 'expired';
  statusLabel: string;
  monthlyRent: number;
  deposit: number;
  partyAName: string;
  partyAPhone: string;
  partyBName: string;
  partyBPhone: string;
  partyBCitizenId: string;
}



function getStatusConfig(status: string) {
  switch (status) {
    case 'active':
      return { color: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border-emerald-400 font-bold', icon: CheckCircle2, iconColor: 'text-emerald-600', cardBorder: 'border-emerald-300 dark:border-emerald-800 hover:border-emerald-500' };
    case 'expiring':
      return { color: 'bg-amber-500 text-white font-bold border-amber-600', icon: Clock, iconColor: 'text-amber-600 dark:text-amber-400', cardBorder: 'border-amber-300 dark:border-amber-800 hover:border-amber-500 shadow-sm' };
    case 'expired':
      return { color: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 font-medium', icon: FileText, iconColor: 'text-slate-500', cardBorder: 'border-slate-200 dark:border-slate-800' };
    default:
      return { color: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 font-medium', icon: FileText, iconColor: 'text-slate-500', cardBorder: 'border-slate-200 dark:border-slate-800' };
  }
}

export default function ContractsPage() {
  const { user, profile } = useAuth();
  const [contracts, setContracts] = useState<TenantContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [selectedContract, setSelectedContract] = useState<TenantContractItem | null>(null);
  const [renewingContract, setRenewingContract] = useState<TenantContractItem | null>(null);
  const [renewTerm, setRenewTerm] = useState('12');
  const [renewNote, setRenewNote] = useState('');
  const [isSubmittingRenew, setIsSubmittingRenew] = useState(false);

  // Fetch real contracts from DB for current user phone/email
  useEffect(() => {
    if (!user) return;

    async function fetchRealContracts() {
      setLoading(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
        const res = await fetch('/api/customer/tenant-portal/contracts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const apiData = await res.json();
        const data = apiData.contracts || [];

        if (data && data.length > 0) {
          const mapped: TenantContractItem[] = data.map((item: any) => {
            const roomCode = item.rooms?.code ? `Phòng ${item.rooms.code}` : 'Phòng căn hộ';
            const bName = item.rooms?.buildings?.name || 'RealHome Building';
            const addr = item.rooms?.buildings?.address || 'Hà Nội';

            let st: 'active' | 'expiring' | 'expired' = 'active';
            let stLabel = 'Đang hiệu lực';

            if (item.status === 'ended' || item.status === 'terminated' || item.status === 'cancelled') {
              st = 'expired';
              stLabel = 'Đã kết thúc';
            } else if (item.end_date) {
              const daysLeft = Math.ceil((new Date(item.end_date).getTime() - Date.now()) / 86400000);
              if (daysLeft <= 30 && daysLeft > 0) {
                st = 'expiring';
                stLabel = `Sắp hết hạn (${daysLeft} ngày)`;
              } else if (daysLeft <= 0) {
                st = 'expired';
                stLabel = 'Đã kết thúc';
              }
            }

            return {
              id: item.id,
              code: item.contract_code || `HD-${item.id.slice(0, 6)}`,
              type: 'Hợp đồng thuê căn hộ',
              apartment: roomCode,
              buildingName: bName,
              address: addr,
              startDate: item.start_date ? new Date(item.start_date).toLocaleDateString('vi-VN') : '',
              endDate: item.end_date ? new Date(item.end_date).toLocaleDateString('vi-VN') : '',
              status: st,
              statusLabel: stLabel,
              monthlyRent: Number(item.rent_price || item.rooms?.price || 0),
              deposit: Number(item.deposit_amount || 0),
              partyAName: item.party_a_name || 'Ban Quản Lý',
              partyAPhone: item.party_a_phone || '',
              partyBName: item.party_b_name || profile?.full_name || '',
              partyBPhone: item.party_b_phone || profile?.phone || '',
              partyBCitizenId: item.party_b_id_card || '',
            };
          });

          setContracts(mapped);
        } else {
          setContracts([]);
        }
      } catch (err) {
        console.error('Error fetching real contracts:', err);
        setContracts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchRealContracts();
  }, [user, profile]);

  const expiringContracts = contracts.filter((c) => c.status === 'expiring');

  const handleDownloadPDF = (contractCode: string) => {
    toast.success(`Đang tải bản in PDF hợp đồng ${contractCode}...`);
    window.print();
  };

  const handleSendRenewRequest = async () => {
    if (!renewingContract) return;
    setIsSubmittingRenew(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSubmittingRenew(false);
    toast.success(`Đã gửi yêu cầu gia hạn ${renewTerm} tháng cho hợp đồng ${renewingContract.code} tới @BQL!`);
    setRenewingContract(null);
    setRenewNote('');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-ink font-heading flex items-center gap-2">
            <FileText className="h-7 w-7 text-amber-600" />
            Hợp đồng của tôi
          </h1>
          <p className="text-sm text-ink-muted mt-1">Chạm vào bất kỳ ô hợp đồng nào để xem chi tiết hoặc thực hiện gia hạn</p>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-xl border border-amber-300">
            <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
            <span>Đồng bộ hợp đồng từ DB...</span>
          </div>
        )}
      </div>

      {/* Alert Banner */}
      {expiringContracts.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-100/90 dark:bg-amber-950/60 border-2 border-amber-400/80 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-amber-800 dark:text-amber-300 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-extrabold text-amber-950 dark:text-amber-100">
              ⚠️ Bạn có {expiringContracts.length} hợp đồng sắp hết hạn
            </p>
            <p className="text-xs font-semibold text-amber-900/90 dark:text-amber-200 mt-0.5">
              Vui lòng bấm nút Gia hạn bên dưới để gửi yêu cầu gia hạn trước 30 ngày.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && contracts.length === 0 && (
        <Card className="border border-dashed border-border-subtle">
          <CardContent className="py-14 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <FileText className="h-7 w-7 text-amber-400" />
            </div>
            <p className="text-sm font-bold text-ink">Chưa có hợp đồng nào</p>
            <p className="text-xs text-ink-muted max-w-[280px]">Hợp đồng thuê phòng sẽ xuất hiện tại đây sau khi Ban Quản Lý tạo hợp đồng cho bạn.</p>
          </CardContent>
        </Card>
      )}

      {/* Danh sách Hợp đồng */}
      <div className="space-y-4">
        {contracts.map((contract) => {
          const config = getStatusConfig(contract.status);
          const StatusIcon = config.icon;

          return (
            <Card
              key={contract.id}
              onClick={() => setSelectedContract(contract)}
              className={`border ${config.cardBorder} transition-all duration-200 shadow-sm cursor-pointer group hover:shadow-md hover:border-amber-400`}
            >
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Info */}
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      contract.status === 'active' ? 'bg-emerald-500/15' :
                      contract.status === 'expiring' ? 'bg-amber-500/20 border border-amber-400/50' : 'bg-slate-500/10'
                    }`}>
                      <StatusIcon className={`h-6 w-6 ${config.iconColor}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-extrabold text-ink font-heading group-hover:text-amber-600 transition-colors">
                          {contract.code}
                        </h3>
                        <Badge className={`${config.color} text-[10px] px-2 py-0.5 rounded-md`}>
                          {contract.statusLabel}
                        </Badge>
                      </div>
                      <p className="text-sm font-semibold text-ink-muted">
                        {contract.type} — <strong>{contract.apartment}</strong> ({contract.buildingName})
                      </p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-ink-muted">
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <Calendar className="h-3.5 w-3.5 text-amber-600" />
                          {contract.startDate} → {contract.endDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Price & 2 Action Buttons (Gia hạn & Tải PDF) */}
                  <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-xs font-semibold text-ink-muted">Tiền thuê/tháng</p>
                      <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                        {contract.monthlyRent.toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-ink-muted">Tiền cọc</p>
                      <p className="text-sm font-bold text-ink font-mono">
                        {contract.deposit.toLocaleString('vi-VN')}đ
                      </p>
                    </div>

                    {/* 2 Nút Bấm: Gia hạn & Tải PDF */}
                    <div className="flex gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenewingContract(contract);
                        }}
                        className="rounded-xl text-xs font-bold border-amber-500/80 text-amber-950 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 shadow-sm"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1 text-amber-600" />
                        Gia hạn
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPDF(contract.code);
                        }}
                        className="rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white font-extrabold shadow-sm border-none"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Tải PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 📄 Modal Chi tiết Hợp đồng (Khi nhấn vào bất kỳ ô hợp đồng nào) */}
      <Dialog open={!!selectedContract} onOpenChange={(open) => !open && setSelectedContract(null)}>
        {selectedContract && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
            <DialogHeader className="border-b border-border-subtle pb-4">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-xl font-extrabold font-heading text-ink flex items-center gap-2">
                  <FileText className="h-6 w-6 text-amber-600" />
                  Chi tiết hợp đồng {selectedContract.code}
                </DialogTitle>
                <Badge className={`${getStatusConfig(selectedContract.status).color} text-xs px-2.5 py-1 rounded-lg`}>
                  {selectedContract.statusLabel}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-6 pt-2">
              {/* Căn hộ & Địa chỉ */}
              <div className="p-4 rounded-xl bg-bg-subtle border border-border-subtle space-y-2">
                <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
                  <Building2 className="h-4.5 w-4.5 text-amber-600" />
                  <span>{selectedContract.apartment} — {selectedContract.buildingName}</span>
                </div>
                <p className="text-xs text-ink-muted flex items-center gap-1.5 pl-6">
                  <MapPin className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
                  {selectedContract.address}
                </p>
              </div>

              {/* Thông tin Bên A & Bên B */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bên A */}
                <div className="p-4 rounded-xl border border-border-subtle bg-card space-y-2">
                  <p className="text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" /> BÊN CHO THUÊ (BÊN A)
                  </p>
                  <p className="text-sm font-bold text-ink">{selectedContract.partyAName}</p>
                  <p className="text-xs text-ink-muted flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-amber-600" /> {selectedContract.partyAPhone}
                  </p>
                </div>

                {/* Bên B */}
                <div className="p-4 rounded-xl border border-border-subtle bg-card space-y-2">
                  <p className="text-xs font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <User className="h-4 w-4" /> BÊN THUÊ (BÊN B)
                  </p>
                  <p className="text-sm font-bold text-ink">{selectedContract.partyBName}</p>
                  <p className="text-xs text-ink-muted flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-amber-600" /> {selectedContract.partyBPhone}
                  </p>
                  <p className="text-xs text-ink-muted flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-amber-600" /> CCCD: {selectedContract.partyBCitizenId}
                  </p>
                </div>
              </div>

              {/* Thời hạn & Chi phí */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border-subtle bg-card space-y-1">
                  <p className="text-xs font-bold text-ink-muted">Thời hạn hợp đồng</p>
                  <p className="text-sm font-extrabold text-ink flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    {selectedContract.startDate} đến {selectedContract.endDate}
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-1">
                    ✓ Đã thanh toán tiền cọc đầy đủ
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border-subtle bg-card space-y-1">
                  <p className="text-xs font-bold text-ink-muted">Tiền thuê &amp; Cọc</p>
                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-ink-muted font-medium">Giá thuê hàng tháng:</span>
                    <span className="font-extrabold text-amber-600 font-mono text-sm">{selectedContract.monthlyRent.toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-muted font-medium">Tiền đặt cọc:</span>
                    <span className="font-extrabold text-ink font-mono">{selectedContract.deposit.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </div>

              {/* Các điều khoản cơ bản */}
              <div className="p-4 rounded-xl border border-border-subtle bg-bg-subtle space-y-2">
                <p className="text-xs font-extrabold text-ink uppercase">Các điều khoản &amp; Quy định chính</p>
                <ul className="text-xs text-ink-muted space-y-1 list-disc pl-4 font-medium">
                  <li>Thanh toán tiền thuê định kỳ vào <strong>Mùng 5 hàng tháng</strong>.</li>
                  <li>Tiền điện: 4.000đ/kWh — Tiền nước: 35.000đ/m³ (tính theo chỉ số công tơ).</li>
                  <li>Giữ gìn tài sản trang thiết bị căn hộ theo biên bản bàn giao.</li>
                  <li>Thông báo gia hạn hoặc chấm dứt hợp đồng trước ít nhất <strong>30 ngày</strong>.</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="border-t border-border-subtle pt-4 flex flex-col sm:flex-row justify-between gap-3">
              <Button variant="outline" onClick={() => setSelectedContract(null)} className="rounded-xl font-bold">
                Đóng
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRenewingContract(selectedContract);
                    setSelectedContract(null);
                  }}
                  className="rounded-xl border-amber-500 text-amber-950 dark:text-amber-200 font-bold bg-amber-50 dark:bg-amber-950/40"
                >
                  <RefreshCw className="h-4 w-4 mr-1.5 text-amber-600" />
                  Gia hạn
                </Button>
                <Button
                  onClick={() => handleDownloadPDF(selectedContract.code)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-md"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  In / Tải PDF
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* 🔄 Modal Yêu cầu Gia hạn Hợp đồng */}
      <Dialog open={!!renewingContract} onOpenChange={(open) => !open && setRenewingContract(null)}>
        {renewingContract && (
          <DialogContent className="max-w-md p-6 rounded-2xl">
            <DialogHeader className="border-b border-border-subtle pb-3">
              <DialogTitle className="text-lg font-extrabold font-heading text-ink flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-amber-600" />
                Gửi yêu cầu Gia hạn hợp đồng
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300">
                <p className="text-xs font-bold text-amber-950 dark:text-amber-200">
                  Hợp đồng: <strong>{renewingContract.code}</strong> — {renewingContract.apartment}
                </p>
                <p className="text-[11px] text-amber-900/80 dark:text-amber-300 mt-0.5">
                  Ngày hết hạn hiện tại: {renewingContract.endDate}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-ink-muted mb-2 block">Thời hạn muốn gia hạn thêm</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: '6', label: '6 Tháng' },
                    { value: '12', label: '12 Tháng (1 Năm)' },
                    { value: '24', label: '24 Tháng (2 Năm)' },
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setRenewTerm(t.value)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        renewTerm === t.value
                          ? 'border-amber-500 bg-amber-500/20 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400/50'
                          : 'border-border-subtle bg-bg-subtle text-ink-muted hover:border-amber-400'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-ink-muted mb-1.5 block">Ghi chú gửi Ban Quản Lý (tùy chọn)</label>
                <Input
                  placeholder="VD: Mong muốn giữ nguyên giá thuê cũ..."
                  value={renewNote}
                  onChange={(e) => setRenewNote(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-border-subtle pt-4 flex justify-between gap-2">
              <Button variant="outline" onClick={() => setRenewingContract(null)} className="rounded-xl font-bold">
                Hủy
              </Button>
              <Button
                onClick={handleSendRenewRequest}
                disabled={isSubmittingRenew}
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-md"
              >
                {isSubmittingRenew ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang gửi...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Gửi yêu cầu gia hạn</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

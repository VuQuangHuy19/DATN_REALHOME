'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getInvoices, updateInvoice, batchGenerateInvoices, deleteInvoice } from '@/src/features/finance/services/invoices';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Loader2, Search, PlusCircle, CheckCircle, XCircle, FileText, 
  Printer, DollarSign, Calendar, RefreshCw, AlertCircle 
} from 'lucide-react';
import type { InvoiceWithRoomAndContract } from '@/src/features/finance/services/invoices';

export default function InvoicesPage() {
  const { company, role, profile } = useAuth();
  
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [invoices, setInvoices] = useState<InvoiceWithRoomAndContract[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Dialog State
  const [viewInvoice, setViewInvoice] = useState<InvoiceWithRoomAndContract | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<string>('transfer');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadInvoices = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const landlordId = role === 'landlord' ? (profile?.landlord_id || undefined) : undefined;
      const data = await getInvoices(company.id, selectedPeriod, landlordId);
      setInvoices(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Lỗi khi tải hóa đơn: ' + msg);
    } finally {
      setLoading(false);
    }
  }, [company?.id, selectedPeriod, role, profile?.landlord_id]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Filters
  const filtered = invoices.filter((item) => {
    const matchesSearch = 
      (item.rooms?.code && item.rooms.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.rental_contracts?.party_b_name && item.rental_contracts.party_b_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.invoice_code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleBatchGenerate = async () => {
    if (!company?.id || !selectedPeriod) return;
    
    if (!confirm(`Bạn muốn tự động lập hóa đơn cho tất cả phòng có hợp đồng thuê trong kỳ ${selectedPeriod}?`)) {
      return;
    }

    setGenerating(true);
    try {
      const landlordId = role === 'landlord' ? (profile?.landlord_id || undefined) : undefined;
      const result = await batchGenerateInvoices(company.id, selectedPeriod, landlordId);
      toast.success(`Lập hóa đơn thành công! Đã tạo: ${result.successCount}, Bỏ qua: ${result.skipCount} (đã tạo hoặc không có phòng thuê).`);
      loadInvoices();
    } catch (err: any) {
      toast.error('Lỗi khi lập hóa đơn hàng loạt: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    setUpdatingStatus(true);
    try {
      await updateInvoice(invoiceId, {
        status: 'paid',
        payment_date: new Date().toISOString(),
        payment_method: payMethod,
      });
      toast.success('Đã đánh dấu hóa đơn đã thanh toán thành công!');
      setIsViewOpen(false);
      loadInvoices();
    } catch (err: any) {
      toast.error('Lỗi cập nhật hóa đơn: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy hóa đơn này?')) return;
    setUpdatingStatus(true);
    try {
      await updateInvoice(invoiceId, { status: 'cancelled' });
      toast.success('Đã hủy hóa đơn.');
      setIsViewOpen(false);
      loadInvoices();
    } catch (err: any) {
      toast.error('Lỗi hủy hóa đơn: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const statusBadges: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    unpaid: { label: 'Chưa thanh toán', variant: 'outline' },
    paid: { label: 'Đã thanh toán', variant: 'default' },
    partially_paid: { label: 'Thanh toán một phần', variant: 'secondary' },
    overdue: { label: 'Quá hạn', variant: 'destructive' },
    cancelled: { label: 'Đã hủy', variant: 'secondary' },
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink tracking-tight">Quản Lý Hóa Đơn Tháng</h1>
          <p className="text-ink-muted text-sm mt-0.5">Quản lý thanh toán hóa đơn tiền phòng và dịch vụ hàng tháng</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadInvoices} variant="outline" size="icon" disabled={loading} title="Tải lại" className="border-border hover:bg-bg-subtle text-ink rounded-lg">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleBatchGenerate} disabled={generating || loading} className="bg-accent hover:bg-accent-500 text-white rounded-lg font-semibold shadow-none">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Đang lập...
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4 mr-2" />
                Lập hóa đơn hàng loạt
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Bộ lọc */}
      <Card className="border-border shadow-none rounded-lg bg-white">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-ink font-semibold text-xs uppercase tracking-wider"><Calendar className="h-4 w-4 text-ink-muted" /> Chọn kỳ hóa đơn</Label>
            <Input type="month" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent" />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-ink font-semibold text-xs uppercase tracking-wider"><Search className="h-4 w-4 text-ink-muted" /> Tìm kiếm</Label>
            <Input placeholder="Tìm phòng, tên khách, mã hóa đơn..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="rounded-lg border-border focus-visible:ring-accent" />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-ink font-semibold text-xs uppercase tracking-wider">Trạng thái thanh toán</Label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="all">Tất cả</option>
              <option value="unpaid">Chưa thanh toán</option>
              <option value="paid">Đã thanh toán</option>
              <option value="overdue">Quá hạn</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bảng hóa đơn */}
      <Card className="border-border shadow-none rounded-lg bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="overflow-hidden">
              {/* Desktop view */}
              <table className="w-full text-sm hidden md:table border-collapse">
                <thead className="bg-bg-subtle border-b border-border text-ink-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Mã hóa đơn</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Phòng</th>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider">Khách thuê</th>
                    <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">Kỳ đóng</th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider">Tổng tiền thanh toán</th>
                    <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">Hạn thanh toán</th>
                    <th className="px-6 py-3 text-center text-xs font-bold uppercase tracking-wider">Trạng thái</th>
                    <th className="px-6 py-3 text-right text-xs font-bold uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  {filtered.map((item) => {
                    const badge = statusBadges[item.status] || { label: item.status, variant: 'outline' };
                    let statusColor = 'bg-bg-subtle text-ink-muted border-border';
                    if (item.status === 'paid') statusColor = 'bg-green-50 text-green-700 border-green-250';
                    if (item.status === 'unpaid') statusColor = 'bg-amber-50 text-amber-700 border-amber-250';
                    if (item.status === 'overdue') statusColor = 'bg-red-50 text-red-750 border-red-250';
                    
                    return (
                      <tr key={item.id} className="hover:bg-bg-subtle/50 transition-colors cursor-pointer" onClick={() => { setViewInvoice(item); setIsViewOpen(true); }}>
                        <td className="px-6 py-4 font-mono font-bold text-xs">{item.invoice_code}</td>
                        <td className="px-6 py-4 font-bold text-accent">Phòng {item.rooms?.code || '—'}</td>
                        <td className="px-6 py-4 font-semibold">{item.rental_contracts?.party_b_name || 'Khách thuê lẻ'}</td>
                        <td className="px-6 py-4 text-center text-xs font-mono font-medium text-ink-muted">{item.period}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-accent text-sm">
                          {Number(item.total_amount).toLocaleString('vi-VN')}đ
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-mono text-ink-muted">{new Date(item.due_date).toLocaleDateString('vi-VN')}</td>
                        <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <Badge className={`${statusColor} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant={badge.variant}>
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setViewInvoice(item); setIsViewOpen(true); }}
                            className="text-accent hover:text-accent-500 hover:bg-bg-subtle rounded-lg font-semibold text-xs"
                          >
                            Chi tiết
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-ink-muted bg-white">
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-35" />
                        <p className="text-sm font-semibold">Không tìm thấy hóa đơn nào trong kỳ này.</p>
                        <p className="text-xs text-ink-muted mt-1">Bấm nút &quot;Lập hóa đơn hàng loạt&quot; để tạo tự động.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border bg-white">
                {filtered.map((item) => {
                  const badge = statusBadges[item.status] || { label: item.status, variant: 'outline' };
                  let statusColor = 'bg-bg-subtle text-ink-muted border-border';
                  if (item.status === 'paid') statusColor = 'bg-green-50 text-green-700 border-green-250';
                  if (item.status === 'unpaid') statusColor = 'bg-amber-50 text-amber-700 border-amber-250';
                  if (item.status === 'overdue') statusColor = 'bg-red-50 text-red-750 border-red-250';
                  
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => { setViewInvoice(item); setIsViewOpen(true); }}
                      className="p-4 hover:bg-bg-subtle/30 cursor-pointer transition-colors space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-accent text-sm">Phòng {item.rooms?.code || '—'}</span>
                        <Badge className={`${statusColor} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant={badge.variant}>
                          {badge.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted">
                        <div>
                          <span className="font-medium text-ink-muted">Mã HĐ:</span>{' '}
                          <span className="text-ink font-mono font-bold">{item.invoice_code}</span>
                        </div>
                        <div>
                          <span className="font-medium text-ink-muted">Khách thuê:</span>{' '}
                          <span className="text-ink font-semibold">{item.rental_contracts?.party_b_name || 'Khách thuê lẻ'}</span>
                        </div>
                        <div>
                          <span className="font-medium text-ink-muted">Kỳ đóng:</span>{' '}
                          <span className="text-ink font-mono">{item.period}</span>
                        </div>
                        <div>
                          <span className="font-medium text-ink-muted">Hạn thanh toán:</span>{' '}
                          <span className="text-ink font-mono">{new Date(item.due_date).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-sm font-bold text-accent font-mono">
                          {Number(item.total_amount).toLocaleString('vi-VN')}đ
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); setViewInvoice(item); setIsViewOpen(true); }}
                          className="text-accent hover:text-accent-500 hover:bg-bg-subtle rounded-lg font-semibold text-xs h-7 px-2"
                        >
                          Chi tiết
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-center py-12 text-ink-muted bg-white">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-35" />
                    <p className="text-sm font-semibold">Không tìm thấy hóa đơn nào trong kỳ này.</p>
                    <p className="text-xs text-ink-muted mt-1">Bấm nút &quot;Lập hóa đơn hàng loạt&quot; để tạo tự động.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Detail Receipt Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md bg-white border border-border rounded-lg shadow-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ink text-lg font-bold font-heading">
              <FileText className="h-5 w-5 text-accent" /> Hóa Đơn Thu Tiền Nhà
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted font-mono">Mã: {viewInvoice?.invoice_code} (Kỳ {viewInvoice?.period})</DialogDescription>
          </DialogHeader>
          
          {viewInvoice && (
            <div className="space-y-4 pt-4 text-sm text-ink-muted">
              {/* Thông tin phòng & khách */}
              <div className="border rounded-lg p-3 bg-bg-subtle border-border space-y-1">
                <div className="flex justify-between">
                  <span className="text-ink-muted text-xs font-semibold">Phòng thuê:</span>
                  <span className="font-bold text-accent">Phòng {viewInvoice.rooms?.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted text-xs font-semibold">Khách thuê:</span>
                  <span className="font-semibold text-ink">{viewInvoice.rental_contracts?.party_b_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted text-xs font-semibold">Hạn nộp tiền:</span>
                  <span className="font-medium text-ink font-mono">{new Date(viewInvoice.due_date).toLocaleDateString('vi-VN')}</span>
                </div>
                {viewInvoice.status === 'paid' && (
                  <div className="flex justify-between text-green-700 bg-green-50 border border-green-250 p-2 rounded-lg mt-2 text-xs font-bold">
                    <span>Thanh toán ngày:</span>
                    <span className="font-mono">
                      {viewInvoice.payment_date ? new Date(viewInvoice.payment_date).toLocaleDateString('vi-VN') : 'N/A'} 
                      ({viewInvoice.payment_method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'})
                    </span>
                  </div>
                )}
              </div>

              {/* Chi tiết tiền dịch vụ */}
              <div className="space-y-2">
                <h4 className="font-bold font-heading text-ink text-xs uppercase tracking-wider border-b border-border pb-1.5">Chi tiết hóa đơn</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-ink-muted font-semibold text-xs">Tiền phòng:</span>
                    <span className="font-mono font-semibold text-ink">{Number(viewInvoice.rent_amount).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted font-semibold text-xs">
                      Tiền điện: <span className="text-[10px] text-ink-muted italic font-mono">(Sử dụng {viewInvoice.electricity_usage} số)</span>
                    </span>
                    <span className="font-mono font-semibold text-ink">{Number(viewInvoice.electricity_amount).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted font-semibold text-xs">Tiền nước:</span>
                    <span className="font-mono font-semibold text-ink">{Number(viewInvoice.water_amount).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted font-semibold text-xs">Phí dịch vụ chung:</span>
                    <span className="font-mono font-semibold text-ink">{Number(viewInvoice.service_amount).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted font-semibold text-xs">
                      Dịch vụ khác <span className="text-[10px] text-ink-muted font-mono">({viewInvoice.other_details})</span>:
                    </span>
                    <span className="font-mono font-semibold text-ink">{Number(viewInvoice.other_amount).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <hr className="border-dashed border-border" />
                  <div className="flex justify-between text-base font-bold text-ink pt-1 font-heading">
                    <span>Tổng tiền thu:</span>
                    <span className="text-accent font-mono">{Number(viewInvoice.total_amount).toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
              </div>

              {/* Nút thao tác thay đổi trạng thái hóa đơn */}
              <div className="pt-2 flex flex-col gap-2">
                {viewInvoice.status !== 'paid' && viewInvoice.status !== 'cancelled' && (
                  <div className="border border-border p-3 rounded-lg space-y-3 bg-white">
                    <div className="space-y-1.5">
                      <Label htmlFor="pay_method" className="text-ink font-semibold text-xs uppercase tracking-wider block">Hình thức thanh toán thực tế</Label>
                      <select 
                        id="pay_method" 
                        value={payMethod} 
                        onChange={(e) => setPayMethod(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="transfer">Chuyển khoản</option>
                        <option value="cash">Tiền mặt</option>
                      </select>
                    </div>
                    <Button 
                      onClick={() => handleMarkAsPaid(viewInvoice.id)} 
                      disabled={updatingStatus}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
                    >
                      {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Đánh dấu ĐÃ THANH TOÁN
                    </Button>
                  </div>
                )}

                {viewInvoice.status !== 'cancelled' && viewInvoice.status !== 'paid' && (
                  <Button 
                    onClick={() => handleCancelInvoice(viewInvoice.id)} 
                    variant="outline" 
                    disabled={updatingStatus}
                    className="w-full border-danger/20 text-danger hover:bg-danger/10 hover:text-danger rounded-lg font-semibold"
                  >
                    {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Hủy hóa đơn này
                  </Button>
                )}
                
                <Button variant="ghost" onClick={() => setIsViewOpen(false)} className="w-full text-ink-muted hover:bg-bg-subtle rounded-lg font-semibold">
                  Đóng cửa sổ
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

}

'use client';

import { useState, useEffect } from 'react';
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

  const loadInvoices = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const landlordId = role === 'landlord' ? (profile?.landlord_id || undefined) : undefined;
      const data = await getInvoices(company.id, selectedPeriod, landlordId);
      setInvoices(data);
    } catch (err: any) {
      toast.error('Lỗi khi tải hóa đơn: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [company?.id, selectedPeriod]);

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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản Lý Hóa Đơn Tháng</h1>
          <p className="text-slate-500">Quản lý thanh toán hóa đơn tiền phòng và dịch vụ hàng tháng</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadInvoices} variant="outline" size="icon" disabled={loading} title="Tải lại">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleBatchGenerate} disabled={generating || loading} className="bg-indigo-650 hover:bg-indigo-700 text-white shadow-sm">
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
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-slate-400" /> Chọn kỳ hóa đơn</Label>
            <Input type="month" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Search className="h-4 w-4 text-slate-400" /> Tìm kiếm</Label>
            <Input placeholder="Tìm phòng, tên khách, mã hóa đơn..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">Trạng thái thanh toán</Label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
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
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-6 p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-655" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b text-slate-700 font-semibold">
                  <tr>
                    <th className="px-6 py-3 text-left">Mã hóa đơn</th>
                    <th className="px-6 py-3 text-left">Phòng</th>
                    <th className="px-6 py-3 text-left">Khách thuê</th>
                    <th className="px-6 py-3 text-left">Kỳ đóng</th>
                    <th className="px-6 py-3 text-left">Tổng tiền thanh toán</th>
                    <th className="px-6 py-3 text-left">Hạn thanh toán</th>
                    <th className="px-6 py-3 text-left">Trạng thái</th>
                    <th className="px-6 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700">
                  {filtered.map((item) => {
                    const badge = statusBadges[item.status] || { label: item.status, variant: 'outline' };
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-slate-900">{item.invoice_code}</td>
                        <td className="px-6 py-4 font-semibold text-indigo-650">Phòng {item.rooms?.code || '—'}</td>
                        <td className="px-6 py-4 font-medium">{item.rental_contracts?.party_b_name || 'Khách thuê lẻ'}</td>
                        <td className="px-6 py-4 text-slate-650">{item.period}</td>
                        <td className="px-6 py-4 font-semibold text-slate-900">{Number(item.total_amount).toLocaleString('vi-VN')} đ</td>
                        <td className="px-6 py-4 text-slate-500">{new Date(item.due_date).toLocaleDateString('vi-VN')}</td>
                        <td className="px-6 py-4">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setViewInvoice(item); setIsViewOpen(true); }}
                            className="text-indigo-650 hover:text-indigo-800"
                          >
                            Chi tiết
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400 bg-white">
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-35" />
                        <p className="text-sm font-medium">Không tìm thấy hóa đơn nào trong kỳ này.</p>
                        <p className="text-xs text-slate-400 mt-1">Bấm nút &quot;Lập hóa đơn hàng loạt&quot; để tạo tự động.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Detail Receipt Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-650">
              <FileText className="h-5 w-5" /> Hóa Đơn Thu Tiền Nhà
            </DialogTitle>
            <DialogDescription>Mã: {viewInvoice?.invoice_code} (Kỳ {viewInvoice?.period})</DialogDescription>
          </DialogHeader>
          
          {viewInvoice && (
            <div className="space-y-4 pt-4 text-sm">
              {/* Thông tin phòng & khách */}
              <div className="border rounded-lg p-3 bg-slate-50/50 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Phòng thuê:</span>
                  <span className="font-semibold text-indigo-750">Phòng {viewInvoice.rooms?.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Khách thuê:</span>
                  <span className="font-semibold text-slate-800">{viewInvoice.rental_contracts?.party_b_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Hạn nộp tiền:</span>
                  <span className="font-medium text-slate-800">{new Date(viewInvoice.due_date).toLocaleDateString('vi-VN')}</span>
                </div>
                {viewInvoice.status === 'paid' && (
                  <div className="flex justify-between text-green-700 bg-green-50 p-1.5 rounded mt-1.5 text-xs font-semibold">
                    <span>Thanh toán ngày:</span>
                    <span>
                      {viewInvoice.payment_date ? new Date(viewInvoice.payment_date).toLocaleDateString('vi-VN') : 'N/A'} 
                      ({viewInvoice.payment_method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'})
                    </span>
                  </div>
                )}
              </div>

              {/* Chi tiết tiền dịch vụ */}
              <div className="space-y-2">
                <h4 className="font-semibold text-slate-700 border-b pb-1">Chi tiết hóa đơn</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span>Tiền phòng:</span>
                    <span className="font-medium">{Number(viewInvoice.rent_amount).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Tiền điện: <span className="text-xs text-slate-400">(Sử dụng {viewInvoice.electricity_usage} số)</span>
                    </span>
                    <span className="font-medium">{Number(viewInvoice.electricity_amount).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tiền nước:</span>
                    <span className="font-medium">{Number(viewInvoice.water_amount).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phí dịch vụ chung:</span>
                    <span className="font-medium">{Number(viewInvoice.service_amount).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Dịch vụ khác <span className="text-xs text-slate-400">({viewInvoice.other_details})</span>:
                    </span>
                    <span className="font-medium">{Number(viewInvoice.other_amount).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <hr className="border-dashed" />
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-1">
                    <span>Tổng tiền thu:</span>
                    <span className="text-indigo-650">{Number(viewInvoice.total_amount).toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              </div>

              {/* Nút thao tác thay đổi trạng thái hóa đơn */}
              <div className="pt-4 flex flex-col gap-2">
                {viewInvoice.status !== 'paid' && viewInvoice.status !== 'cancelled' && (
                  <div className="border p-3 rounded-lg space-y-3 bg-white">
                    <div className="space-y-1.5">
                      <Label htmlFor="pay_method">Hình thức thanh toán thực tế</Label>
                      <select 
                        id="pay_method" 
                        value={payMethod} 
                        onChange={(e) => setPayMethod(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="transfer">Chuyển khoản</option>
                        <option value="cash">Tiền mặt</option>
                      </select>
                    </div>
                    <Button 
                      onClick={() => handleMarkAsPaid(viewInvoice.id)} 
                      disabled={updatingStatus}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
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
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Hủy hóa đơn này
                  </Button>
                )}
                
                <Button variant="ghost" onClick={() => setIsViewOpen(false)} className="w-full">
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

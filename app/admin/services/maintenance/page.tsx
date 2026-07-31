'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getMaintenanceRequests, updateMaintenanceCost, exportMaintenancePDF } from '@/src/features/services/services/maintenance';
import type { MaintenanceWithRoom } from '@/src/features/services/services/maintenance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Loader2, Search, Wrench, FileText, Printer, QrCode, CheckCircle2, 
  Clock, AlertTriangle, RefreshCw, DollarSign, Building2, User, Phone, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface BuildingItem {
  id: string;
  name: string;
  code?: string | null;
  landlord_id?: string | null;
}

interface LandlordItem {
  id: string;
  code?: string | null;
  name: string;
  phone?: string | null;
}

export default function AdminMaintenancePage() {
  const { company } = useAuth();
  
  const [requests, setRequests] = useState<MaintenanceWithRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [costBearerFilter, setCostBearerFilter] = useState('all');

  // Lọc Tòa nhà & Chủ nhà
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [landlordList, setLandlordList] = useState<LandlordItem[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');
  const [buildingSearchTerm, setBuildingSearchTerm] = useState<string>('');

  // Tải danh sách Tòa nhà & Chủ nhà
  useEffect(() => {
    if (!company?.id) return;
    async function fetchBuildingsAndLandlords() {
      setBuildingsLoading(true);
      try {
        const { data: bData } = await supabase
          .from('buildings')
          .select('id, name, code, landlord_id')
          .eq('company_id', company!.id);
        setBuildings(bData || []);

        const { data: lData } = await supabase
          .from('landlords')
          .select('id, code, name, phone')
          .eq('company_id', company!.id);
        setLandlordList(lData || []);
      } catch (err) {
        console.error('Error fetching buildings/landlords:', err);
      } finally {
        setBuildingsLoading(false);
      }
    }
    fetchBuildingsAndLandlords();
  }, [company?.id]);

  // Modal State
  const [selectedReq, setSelectedReq] = useState<MaintenanceWithRoom | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form State Chi Phí Bảo Trì
  const [repairDetails, setRepairDetails] = useState('');
  const [costAmount, setCostAmount] = useState<number>(0);
  const [costBearer, setCostBearer] = useState<'landlord' | 'tenant' | 'shared'>('landlord');
  const [status, setStatus] = useState('Hoàn tất');

  // VietQR Modal State
  const [showQRModal, setShowQRModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const data = await getMaintenanceRequests(company.id);
      setRequests(data);
    } catch (err: any) {
      toast.error('Lỗi khi tải dữ liệu bảo trì: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDetail = (req: MaintenanceWithRoom) => {
    setSelectedReq(req);
    setRepairDetails(req.repair_details || '');
    setCostAmount(req.cost_amount || 0);
    setCostBearer(req.cost_bearer || 'landlord');
    setStatus(req.status || 'Hoàn tất');
    setIsDetailOpen(true);
  };

  const calculateTenantAmount = () => {
    if (costBearer === 'landlord') return 0;
    if (costBearer === 'shared') return Math.round(costAmount / 2);
    return costAmount;
  };

  const handleSaveCostAndStatus = async (paymentStatus: 'waived' | 'unpaid' | 'paid' | 'added_to_monthly_invoice') => {
    if (!selectedReq) return;
    setIsUpdating(true);

    const tenantAmount = costBearer === 'landlord' ? 0 : (costBearer === 'shared' ? Math.round(costAmount / 2) : costAmount);

    try {
      await updateMaintenanceCost(selectedReq.id, {
        repair_details: repairDetails,
        cost_amount: costAmount,
        cost_bearer: costBearer,
        tenant_amount: tenantAmount,
        payment_status: paymentStatus,
        status: status,
      });

      toast.success('Đã cập nhật phiếu bảo trì & chi phí thành công!');
      setIsDetailOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Lỗi khi cập nhật chi phí: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExportPDF = () => {
    if (!selectedReq) return;
    const tenantAmount = calculateTenantAmount();

    exportMaintenancePDF({
      id: selectedReq.id,
      title: selectedReq.title,
      roomCode: selectedReq.rooms?.code,
      buildingName: selectedReq.rooms?.buildings?.name,
      createdAt: new Date(selectedReq.created_at).toLocaleDateString('vi-VN'),
      repairDetails: repairDetails || selectedReq.description || '',
      costAmount: costAmount,
      costBearer: costBearer,
      tenantAmount: tenantAmount,
      tenantName: 'Khách thuê',
    });
  };

  // Lọc danh sách Tòa nhà theo từ khóa gõ
  const filteredBuildings = useMemo(() => {
    if (!buildingSearchTerm.trim()) return buildings;
    const term = buildingSearchTerm.toLowerCase().trim();
    return buildings.filter((b) => {
      const bName = b.name?.toLowerCase() || '';
      const bCode = b.code?.toLowerCase() || '';
      const landlord = landlordList.find((l) => l.code === b.landlord_id || l.id === b.landlord_id);
      const lName = landlord?.name?.toLowerCase() || '';
      const lCode = landlord?.code?.toLowerCase() || '';
      const lPhone = landlord?.phone?.toLowerCase() || '';
      return bName.includes(term) || bCode.includes(term) || lName.includes(term) || lCode.includes(term) || lPhone.includes(term);
    });
  }, [buildings, landlordList, buildingSearchTerm]);

  const filteredRequests = requests.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesBuilding =
      selectedBuildingId === 'all' ||
      !selectedBuildingId ||
      r.rooms?.building_id === selectedBuildingId ||
      r.rooms?.buildings?.id === selectedBuildingId;

    const matchesSearch = 
      r.title.toLowerCase().includes(q) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.rooms?.code && r.rooms.code.toLowerCase().includes(q)) ||
      (r.rooms?.buildings?.name && r.rooms.buildings.name.toLowerCase().includes(q));
    
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesCostBearer = costBearerFilter === 'all' || r.cost_bearer === costBearerFilter;

    return matchesBuilding && matchesSearch && matchesStatus && matchesCostBearer;
  });

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink tracking-tight flex items-center gap-2">
            <Wrench className="h-6 w-6 text-amber-600" /> Quản Lý Bảo Trì & Sửa Chữa
          </h1>
          <p className="text-ink-muted text-sm mt-0.5">Tiếp nhận yêu cầu sự cố, phân định chi phí và xuất hóa đơn / biên bản nghiệm thu 0đ</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm" disabled={loading} className="rounded-lg">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Tải lại
        </Button>
      </div>

      {/* Bộ lọc Thông minh */}
      <Card className="border-border shadow-none rounded-xl bg-white overflow-hidden">
        <CardContent className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Ô 1: Chọn Tòa nhà (Mã / Chủ nhà) (5 cols) */}
          <div className="md:col-span-5 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-ink font-bold text-xs uppercase tracking-wider">
                <Building2 className="h-4 w-4 text-accent" /> Chọn tòa nhà ({filteredBuildings.length}/{buildings.length})
              </Label>
              {selectedBuildingId !== 'all' && (
                <button
                  onClick={() => setSelectedBuildingId('all')}
                  className="text-[11px] text-accent font-bold hover:underline flex items-center gap-0.5"
                >
                  <X className="h-3 w-3" /> Tất cả tòa
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted" />
                <Input
                  placeholder="Gõ Tên/Mã tòa nhà hoặc Mã/Tên chủ nhà (VD: TH01)..."
                  value={buildingSearchTerm}
                  onChange={(e) => setBuildingSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-lg border-border focus-visible:ring-accent font-semibold"
                />
              </div>

              {buildingsLoading ? (
                <div className="h-10 border border-border rounded-lg flex items-center px-3 text-ink-muted bg-bg-subtle/50 text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2 text-accent" /> Đang tải tòa nhà...</div>
              ) : (
                <select
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="all">🏢 -- Tất cả Tòa nhà --</option>
                  {filteredBuildings.map((b) => {
                    const landlord = landlordList.find((l) => l.code === b.landlord_id || l.id === b.landlord_id);
                    const landlordLabel = landlord ? ` — Chủ: ${landlord.name} (${landlord.code || ''})` : (b.landlord_id ? ` — Chủ: ${b.landlord_id}` : '');
                    return (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.code ? `[${b.code}]` : ''}{landlordLabel}
                      </option>
                    );
                  })}
                </select>
              )}
            </div>
          </div>

          {/* Ô 2: Tìm nhanh Sự cố / Phòng / Khách / SĐT (3 cols) */}
          <div className="md:col-span-3 space-y-1.5">
            <Label className="flex items-center gap-1.5 text-ink font-bold text-xs uppercase tracking-wider">
              <Search className="h-4 w-4 text-accent" /> Tìm Sự cố / Phòng / Khách
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input
                placeholder="Tên sự cố, Số phòng (302)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-10 text-sm rounded-lg border-border font-semibold focus-visible:ring-accent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Ô 3: Trạng thái xử lý (2 cols) */}
          <div className="md:col-span-2 space-y-1.5">
            <Label className="flex items-center gap-1.5 text-ink font-bold text-xs uppercase tracking-wider">
              Trạng thái
            </Label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="Đang tiếp nhận">🔴 Đang tiếp nhận</option>
              <option value="Đang xử lý">🟡 Đang xử lý</option>
              <option value="Hoàn tất">🟢 Hoàn tất</option>
            </select>
          </div>

          {/* Ô 4: Lọc Phân định Chi phí (2 cols) */}
          <div className="md:col-span-2 space-y-1.5">
            <Label className="flex items-center gap-1.5 text-ink font-bold text-xs uppercase tracking-wider">
              Chi phí
            </Label>
            <select
              value={costBearerFilter}
              onChange={(e) => setCostBearerFilter(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="all">Tất cả chi phí</option>
              <option value="landlord">🟢 Miễn phí (Chủ nhà chịu)</option>
              <option value="tenant">🟡 Khách thuê chịu</option>
              <option value="shared">🔵 Chia đôi 50/50</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bảng danh sách yêu cầu bảo trì */}
      <Card className="border-border shadow-none rounded-xl bg-white overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full text-sm hidden md:table border-collapse">
                <thead className="bg-slate-100 dark:bg-zinc-800 border-b-2 border-border text-ink font-bold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-left">Phòng & Tòa nhà</th>
                    <th className="px-6 py-4 text-left">Nội dung sự cố</th>
                    <th className="px-4 py-4 text-center">Ưu tiên</th>
                    <th className="px-4 py-4 text-center">Trạng thái</th>
                    <th className="px-4 py-4 text-right">Chi phí thực thu</th>
                    <th className="px-6 py-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-amber-50/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-ink text-sm">Phòng {req.rooms?.code || 'N/A'}</div>
                        <div className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-ink-muted" />
                          <span>{req.rooms?.buildings?.name || 'Chưa cập nhật'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-ink">{req.title}</div>
                        {req.description && <div className="text-xs text-ink-muted truncate max-w-xs">{req.description}</div>}
                        <div className="text-[10px] text-ink-muted mt-1">{new Date(req.created_at).toLocaleDateString('vi-VN')}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge variant="outline" className={`text-[10px] font-bold ${
                          req.priority === 'Khẩn cấp' ? 'text-red-700 border-red-400 bg-red-50' :
                          req.priority === 'Cao' ? 'text-orange-700 border-orange-400 bg-orange-50' :
                          req.priority === 'Bình thường' ? 'text-yellow-800 border-yellow-400 bg-yellow-50' :
                          'text-emerald-700 border-emerald-400 bg-emerald-50'
                        }`}>{req.priority || 'Bình thường'}</Badge>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge className={`text-[10px] font-extrabold border ${
                          req.status === 'Đang tiếp nhận' ? 'bg-amber-100 text-amber-950 border-amber-400' :
                          req.status === 'Đang xử lý' ? 'bg-blue-100 text-blue-900 border-blue-400' :
                          'bg-emerald-100 text-emerald-900 border-emerald-400'
                        }`}>{req.status || 'Đang tiếp nhận'}</Badge>
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-bold">
                        {req.cost_bearer === 'landlord' || (req.tenant_amount ?? 0) === 0 ? (
                          <span className="text-emerald-600 text-xs font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">0đ (Miễn phí)</span>
                        ) : (
                          <span className="text-amber-700">{Number(req.tenant_amount).toLocaleString('vi-VN')}đ</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Button
                          size="sm"
                          onClick={() => openDetail(req)}
                          className="bg-accent text-white hover:bg-accent-500 rounded-lg text-xs font-semibold"
                        >
                          Xử lý & Xuất phiếu
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-ink-muted bg-white">
                        <Wrench className="h-10 w-10 mx-auto mb-2 opacity-35" />
                        Chưa có yêu cầu bảo trì nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Chi tiết & Nghiệm thu Chi phí Bảo trì */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl bg-white border border-border rounded-xl p-6 overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-bold font-heading text-lg text-ink">
              <Wrench className="h-5 w-5 text-accent" /> Chi Tiết Xử Lý & Báo Giá Bảo Trì
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Phòng {selectedReq?.rooms?.code} - {selectedReq?.rooms?.buildings?.name} (Mã phiếu: BT-{selectedReq?.id.slice(0, 8)})
            </DialogDescription>
          </DialogHeader>

          {selectedReq && (
            <div className="space-y-4 pt-2">
              <div className="bg-bg-subtle p-3.5 rounded-lg border border-border space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold text-ink">Nội dung sự cố:</span>
                  <span className="text-ink font-semibold">{selectedReq.title}</span>
                </div>
                {selectedReq.description && (
                  <div className="text-ink-muted italic">Mô tả: {selectedReq.description}</div>
                )}
              </div>

              {/* Form cập nhật chi phí */}
              <div className="space-y-3 border-t border-border pt-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-accent" /> Phân Định Chi Phí Sửa Chữa
                </h4>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-ink">Chi tiết Vật tư & Nhân công thực hiện</Label>
                  <textarea
                    rows={3}
                    value={repairDetails}
                    onChange={(e) => setRepairDetails(e.target.value)}
                    placeholder="VD: Thay 1 bộ vòi sen inox (300k) + Công thợ thay lắp (100k)..."
                    className="w-full rounded-lg border border-border p-2.5 text-xs focus:ring-accent focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-ink">Tổng chi phí thực tế (đ)</Label>
                    <Input
                      type="number"
                      value={costAmount}
                      onChange={(e) => setCostAmount(Number(e.target.value))}
                      className="rounded-lg font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-ink">Bên chịu chi phí (Chi trả)</Label>
                    <select
                      value={costBearer}
                      onChange={(e) => setCostBearer(e.target.value as any)}
                      className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="landlord">🟢 Chủ nhà / BQL chịu (MIỄN PHÍ KHÁCH 0đ)</option>
                      <option value="tenant">🟡 Khách thuê chịu 100%</option>
                      <option value="shared">🔵 Chia đôi 50/50</option>
                    </select>
                  </div>
                </div>

                {/* Kết quả tính toán tiền khách phải trả */}
                <div className="p-3 rounded-lg border bg-amber-50/40 border-amber-200 flex justify-between items-center text-sm">
                  <span className="font-bold text-amber-900 text-xs uppercase">Số tiền thực thu từ Khách thuê:</span>
                  <span className="font-black font-mono text-base text-amber-800">
                    {calculateTenantAmount().toLocaleString('vi-VN')} đ
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-ink">Trạng thái xử lý sự cố</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="Đang tiếp nhận">Đang tiếp nhận</option>
                    <option value="Đang xử lý">Đang xử lý</option>
                    <option value="Hoàn tất">🟢 Hoàn tất nghiệm thu</option>
                  </select>
                </div>
              </div>

              {/* Các nút thao tác xuất hóa đơn & file PDF */}
              <div className="pt-3 border-t border-border flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={handleExportPDF}
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 font-bold rounded-lg text-xs h-10"
                  >
                    <Printer className="h-4 w-4 mr-2" /> In / Tải File PDF Nghiệm Thu
                  </Button>

                  {calculateTenantAmount() > 0 && (
                    <Button
                      type="button"
                      onClick={() => setShowQRModal(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs h-10"
                    >
                      <QrCode className="h-4 w-4 mr-2" /> Hiện mã VietQR Thu Tiền Ngay
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleSaveCostAndStatus('added_to_monthly_invoice')}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs h-10"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                    Cộng vào Hóa Đơn Tháng Tiếp Theo
                  </Button>

                  <Button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleSaveCostAndStatus(costBearer === 'landlord' ? 'waived' : 'paid')}
                    className="bg-accent hover:bg-accent-500 text-white font-bold rounded-lg text-xs h-10"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    {costBearer === 'landlord' ? 'Xác Nhận Miễn Phí 0đ (Lưu)' : 'Đã Thu Tiền Mặt (Lưu)'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal VietQR PayOS */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-sm bg-white border border-border rounded-xl p-6 text-center">
          <DialogHeader>
            <DialogTitle className="font-bold text-ink text-base">Thanh Toán Bảo Trì Qua VietQR</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">Quét mã bằng App Ngân hàng để thanh toán cho BQL</DialogDescription>
          </DialogHeader>

          {selectedReq && (
            <div className="space-y-4 pt-2 flex flex-col items-center">
              <div className="p-3 bg-white border-2 border-emerald-500 rounded-xl shadow-md">
                <img
                  src={`https://img.vietqr.io/image/MB-000000000000-compact2.png?amount=${calculateTenantAmount()}&addInfo=${encodeURIComponent(`BT ${selectedReq.rooms?.code || ''}`)}&accountName=REALHOME`}
                  alt="Mã QR VietQR Thanh toán Bảo Trì"
                  className="w-56 h-56 object-contain"
                />
              </div>

              <div className="text-xs space-y-1 text-ink">
                <p className="font-bold text-sm text-emerald-700">{calculateTenantAmount().toLocaleString('vi-VN')} đ</p>
                <p className="text-ink-muted">Nội dung chuyển khoản: <span className="font-mono font-bold text-ink">BT {selectedReq.rooms?.code}</span></p>
              </div>

              <Button
                onClick={() => {
                  setShowQRModal(false);
                  handleSaveCostAndStatus('paid');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
              >
                Đánh Dấu Đã Nhận Chuyển Khoản
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

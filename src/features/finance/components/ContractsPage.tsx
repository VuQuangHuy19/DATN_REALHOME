'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Pencil, Trash2, Plus, Search, FileText, Loader2, AlertCircle, 
  Printer, CreditCard, Calendar, User, ShieldCheck, HelpCircle,
  Building, Landmark, RefreshCw, ClipboardCheck, FileSignature
} from 'lucide-react';
import { useContractTemplates, useDepositContracts, useRentalContracts } from '@/src/features/finance/hooks/useContracts';
import { useProfiles } from '@/src/features/staff/hooks/useStaff';;
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBContractTemplate } from '@/lib/supabase/types';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { HandoverReportDialog } from './HandoverReportDialog';
import { getContractTermMonths, calculateCommissionAmount } from '@/src/features/finance/services/commission';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const formatDateDisplay = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  if (dateStr.includes('/')) return dateStr;
  if (dateStr.includes('-')) {
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '—';
  }
};

export function ContractsPage() {
  const router = useRouter();
  const { company, role } = useAuth();
  const pathname = usePathname();
  const pathPrefix = pathname?.startsWith('/landlord') ? '/landlord' : '/admin';
  const [activeTab, setActiveTab] = useState<'deposits' | 'rentals' | 'archived' | 'templates'>('deposits');
  
  // Tab 1: Hợp đồng đặt cọc
  const { 
    items: depositContracts, 
    loading: depositsLoading, 
    error: depositsError, 
    remove: removeDeposit,
    refetch: refetchDeposits
  } = useDepositContracts(company?.id);
  const [depositSearch, setDepositSearch] = useState('');

  // Tab 2: Hợp đồng thuê chính thức
  const {
    items: rentalContracts,
    loading: rentalsLoading,
    error: rentalsError,
    remove: removeRental,
    refetch: refetchRentals,
  } = useRentalContracts(company?.id);
  const [rentalSearch, setRentalSearch] = useState('');

  // Tab 3: Hợp đồng đã thanh lý / hết hạn / hủy
  const [archivedSearch, setArchivedSearch] = useState('');

  // Tab 3: Mẫu hợp đồng
  const { 
    items: contractList, 
    loading: templatesLoading, 
    error: templatesError, 
    add: addTemplate, 
    update: updateTemplate, 
    remove: removeTemplate 
  } = useContractTemplates(company?.id);
  const [templateSearch, setTemplateSearch] = useState('');

  // Tải danh sách user profiles để map tên/mã Sale
  const { items: profiles } = useProfiles(company?.id);
  const profilesMap = useMemo(() => {
    const map = new Map<string, any>();
    profiles.forEach((p) => map.set(p.id, p));
    return map;
  }, [profiles]);
  const [editItem, setEditItem] = useState<DBContractTemplate | null>(null);
  const [viewItem, setViewItem] = useState<DBContractTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [viewDeposit, setViewDeposit] = useState<any | null>(null);
  const [isViewDepositOpen, setIsViewDepositOpen] = useState(false);
  const [viewRental, setViewRental] = useState<any | null>(null);
  const [isViewRentalOpen, setIsViewRentalOpen] = useState(false);
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [handoverContract, setHandoverContract] = useState<any | null>(null);
  const [handoverSourceType, setHandoverSourceType] = useState<'deposit' | 'rental'>('deposit');
  const error = depositsError || rentalsError || templatesError;

  // Handlers
  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch('/api/contracts/deposit/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi cập nhật trạng thái');
      }
      toast.success('Cập nhật trạng thái hợp đồng thành công!');
      
      // Update local state if details dialog is open
      if (viewDeposit && viewDeposit.id === id) {
        setViewDeposit({ ...viewDeposit, status: newStatus });
      }
      refetchDeposits();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRentalStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch('/api/contracts/rental/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi cập nhật trạng thái');
      }
      toast.success('Cập nhật trạng thái hợp đồng thành công!');
      
      // Update local state if details dialog is open
      if (viewRental && viewRental.id === id) {
        setViewRental({ ...viewRental, status: newStatus });
      }
      refetchRentals();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleLandlordConfirm = async (id: string, isOverride = false) => {
    const msg = isOverride 
      ? 'Bạn với vai trò Quản trị viên/Manager có chắc chắn muốn DUYỆT ĐÈ hợp đồng cọc này?' 
      : 'Bạn có chắc chắn đã nhận đủ tiền đặt cọc cho phòng này?';
    if (!confirm(msg)) return;
    try {
      const response = await fetch('/api/contracts/deposit/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi xác nhận cọc');
      }
      toast.success(isOverride ? 'Duyệt đè hợp đồng cọc thành công!' : 'Xác nhận nhận cọc thành công!');
      
      // Update local state if details dialog is open
      if (viewDeposit && viewDeposit.id === id) {
        setViewDeposit({ ...viewDeposit, status: 'signed' });
      }
      refetchDeposits();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Filters
  const filteredTemplates = contractList.filter((c) =>
    c.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
    c.type.toLowerCase().includes(templateSearch.toLowerCase())
  );

  // Tab 1: Chỉ lấy các hợp đồng cọc còn hiệu lực / đang xử lý
  const filteredDeposits = depositContracts.filter((d) =>
    ['draft', 'active', 'signed', 'converted'].includes(d.status) &&
    (d.party_b_name.toLowerCase().includes(depositSearch.toLowerCase()) ||
    d.party_b_phone.includes(depositSearch) ||
    d.contract_code.toLowerCase().includes(depositSearch.toLowerCase()) ||
    (d.rooms?.code && d.rooms.code.toLowerCase().includes(depositSearch.toLowerCase())))
  );

  // Tab 2: Chỉ lấy các hợp đồng thuê đang hoạt động / bản nháp
  const filteredRentals = rentalContracts.filter((r) =>
    ['draft', 'active'].includes(r.status) &&
    (r.party_b_name.toLowerCase().includes(rentalSearch.toLowerCase()) ||
    r.party_b_phone.includes(rentalSearch) ||
    r.contract_code.toLowerCase().includes(rentalSearch.toLowerCase()) ||
    (r.rooms?.code && r.rooms.code.toLowerCase().includes(rentalSearch.toLowerCase())))
  );

  // Tab 3: Hợp đồng đã thanh lý / hết hạn / hủy / mất cọc / trả cọc
  const archivedDeposits = depositContracts
    .filter((d) => ['cancelled', 'forfeited', 'refunded'].includes(d.status))
    .map((d) => ({ ...d, contract_category: 'cọc' as const }));

  const archivedRentals = rentalContracts
    .filter((r) => ['ended', 'terminated', 'cancelled'].includes(r.status))
    .map((r) => ({ ...r, contract_category: 'thuê' as const }));

  const filteredArchived = [...archivedRentals, ...archivedDeposits].filter((item) =>
    item.party_b_name.toLowerCase().includes(archivedSearch.toLowerCase()) ||
    item.party_b_phone.includes(archivedSearch) ||
    item.contract_code.toLowerCase().includes(archivedSearch.toLowerCase()) ||
    (item.rooms?.code && item.rooms.code.toLowerCase().includes(archivedSearch.toLowerCase()))
  );

  // Status mapping
  const statusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Bản nháp', color: 'bg-slate-100 text-slate-700' },
    active: { label: 'Chờ xác nhận', color: 'bg-amber-100 text-amber-700 border border-amber-200' },
    signed: { label: 'Đã xác nhận cọc', color: 'bg-green-100 text-green-700 border border-green-200' },
    converted: { label: 'Đã thuê', color: 'bg-indigo-100 text-indigo-700' },
    cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
    forfeited: { label: 'Mất cọc', color: 'bg-amber-100 text-amber-700' },
    refunded: { label: 'Trả cọc', color: 'bg-teal-100 text-teal-700' },
  };

  const handleSaveTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const payload = {
      company_id: company?.id ?? '',
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      content: formData.get('content') as string || null,
    };
    if (editItem) {
      await updateTemplate(editItem.id, payload);
    } else {
      await addTemplate(payload);
    }
    setSaving(false);
    setIsDialogOpen(false);
    setEditItem(null);
  };

  const openAddTemplate = () => { setEditItem(null); setIsDialogOpen(true); };
  const openEditTemplate = (item: DBContractTemplate) => { setEditItem(item); setIsDialogOpen(true); };
  const openViewTemplate = (item: DBContractTemplate) => { setViewItem(item); setIsViewOpen(true); };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-ink tracking-tight">Quản lý hợp đồng</h1>
          <p className="text-ink-muted text-sm mt-0.5">Quản lý hợp đồng đặt cọc giữ chỗ và hợp đồng thuê chính thức</p>
        </div>

        {activeTab === 'deposits' ? (
          role !== 'landlord' && (
            <Button asChild className="bg-accent hover:bg-accent-500 text-white rounded-lg font-semibold shadow-none">
              <Link href={`${pathPrefix}/contracts/create`}>
                <Plus className="h-4 w-4 mr-2" /> Soạn hợp đồng cọc
              </Link>
            </Button>
          )
        ) : activeTab === 'rentals' ? (
          role !== 'sales_agent' && role !== 'landlord' && (
            <Button asChild className="bg-accent hover:bg-accent-500 text-white rounded-lg font-semibold shadow-none">
              <Link href={`${pathPrefix}/contracts/create-rental`}>
                <Plus className="h-4 w-4 mr-2" /> Soạn hợp đồng thuê
              </Link>
            </Button>
          )
        ) : (
          role !== 'sales_agent' && role !== 'landlord' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddTemplate} className="bg-accent hover:bg-accent-500 text-white rounded-lg font-semibold shadow-none">
                  <Plus className="h-4 w-4 mr-2" /> Thêm mẫu hợp đồng
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl rounded-lg border border-border bg-white shadow-lg">
                <DialogHeader>
                  <DialogTitle className="font-heading text-lg font-bold text-ink">{editItem ? 'Chỉnh sửa' : 'Thêm'} mẫu hợp đồng</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSaveTemplate} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-ink font-semibold text-xs uppercase tracking-wider">Tên mẫu</Label>
                      <Input id="name" name="name" defaultValue={editItem?.name} required className="rounded-lg border-border focus-visible:ring-accent" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="type" className="text-ink font-semibold text-xs uppercase tracking-wider">Loại hợp đồng</Label>
                      <Input id="type" name="type" defaultValue={editItem?.type} required className="rounded-lg border-border focus-visible:ring-accent" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="content" className="text-ink font-semibold text-xs uppercase tracking-wider">Nội dung mẫu</Label>
                    <Textarea id="content" name="content" defaultValue={editItem?.content ?? ''} rows={10} className="rounded-lg border-border focus-visible:ring-accent" />
                  </div>
                  <Button type="submit" className="w-full bg-accent hover:bg-accent-500 text-white rounded-lg font-semibold" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Lưu
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )
        )}
      </div>

      {/* Tabs chuyển đổi - Cuộn ngang mượt mà trên thiết bị Mobile */}
      <div className="flex border-b border-border overflow-x-auto whitespace-nowrap scrollbar-none no-scrollbar max-w-full -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('deposits')}
          className={`flex-shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2.5 font-heading text-xs sm:text-sm border-b-2 transition-all relative ${
            activeTab === 'deposits'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-ink-muted hover:text-ink font-medium'
          }`}
        >
          Hợp đồng đặt cọc
          {activeTab === 'deposits' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
        </button>
        <button
          onClick={() => setActiveTab('rentals')}
          className={`flex-shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2.5 font-heading text-xs sm:text-sm border-b-2 transition-all relative ${
            activeTab === 'rentals'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-ink-muted hover:text-ink font-medium'
          }`}
        >
          Hợp đồng thuê chính thức
          {activeTab === 'rentals' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`flex-shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2.5 font-heading text-xs sm:text-sm border-b-2 transition-all relative ${
            activeTab === 'archived'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-ink-muted hover:text-ink font-medium'
          }`}
        >
          Hợp đồng đã thanh lý / Hết hạn
          {activeTab === 'archived' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
        </button>
        {role !== 'landlord' && (
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex-shrink-0 whitespace-nowrap px-3.5 sm:px-4 py-2.5 font-heading text-xs sm:text-sm border-b-2 transition-all relative ${
              activeTab === 'templates'
                ? 'border-accent text-accent font-bold'
                : 'border-transparent text-ink-muted hover:text-ink font-medium'
            }`}
          >
            Mẫu hợp đồng
            {activeTab === 'templates' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm font-medium">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {activeTab === 'deposits' ? (
        // TABLE HỢP ĐỒNG ĐẶT CỌC
        <Card className="border-border shadow-none rounded-lg bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input 
                placeholder="Tìm hợp đồng cọc theo tên khách, SĐT, mã hợp đồng hoặc mã phòng..." 
                value={depositSearch} 
                onChange={(e) => setDepositSearch(e.target.value)} 
                className="pl-9 rounded-lg border-border focus-visible:ring-accent" 
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {depositsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : (
              <>
                {/* Mobile Card List (Chỉ hiện trên di động < md) */}
                <div className="block md:hidden space-y-3 p-3 bg-slate-50/50">
                  {filteredDeposits.map((item) => {
                    const statusInfo = statusLabels[item.status] || { label: item.status, color: 'bg-bg-subtle text-ink-muted border-border' };
                    const agentId = item.sales_agent_id || item.created_by;
                    const saleProfile = agentId ? profilesMap.get(agentId) : null;
                    const isOverdueApproval = item.status === 'active' && item.created_at && (new Date().getTime() - new Date(item.created_at).getTime() > 20 * 60 * 1000);

                    return (
                      <div 
                        key={item.id} 
                        className="p-3.5 border border-slate-200 rounded-xl bg-white shadow-xs space-y-2.5 cursor-pointer active:bg-slate-50 transition-colors"
                        onClick={() => {
                          setViewDeposit(item);
                          setIsViewDepositOpen(true);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.contract_code}
                          </span>
                          <div className="flex items-center gap-1">
                            <Badge className={`${statusInfo.color} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                              {statusInfo.label}
                            </Badge>
                            {isOverdueApproval && (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full animate-pulse">
                                🚨 Quá 20p
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-600">
                          <div className="flex justify-between items-start">
                            <span className="text-slate-400 shrink-0">Phòng / Tòa:</span>
                            <div className="text-right">
                              <span className="font-bold text-accent block">Phòng {item.rooms?.code || '---'}</span>
                              <span className="text-[11px] text-slate-500 font-medium">{item.rooms?.buildings?.name || 'Vị trí khác'}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Khách thuê (Bên B):</span>
                            <span className="font-semibold text-slate-900">{item.party_b_name} • <span className="font-mono">{item.party_b_phone}</span></span>
                          </div>

                          {saleProfile && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Sale phụ trách:</span>
                              <span className="font-medium text-slate-800">{saleProfile.full_name || '—'}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                            <span className="text-slate-400 font-medium">Tiền đặt cọc:</span>
                            <span className="font-mono font-extrabold text-accent text-sm">{Number(item.deposit_amount).toLocaleString('vi-VN')}đ</span>
                          </div>

                          {item.deadline_sign_contract && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Hạn ký HĐ thuê:</span>
                              <span className="font-mono font-bold text-rose-600">{formatDateDisplay(item.deadline_sign_contract)}</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons footer */}
                        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                          {(role === 'company_admin' || role === 'manager') && ['signed', 'active', 'draft'].includes(item.status) && (
                            <Button variant="outline" size="sm" className="h-7 text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200" asChild>
                              <Link href={`${pathPrefix}/contracts/create-rental?deposit_id=${item.id}`}>
                                <FileSignature className="h-3.5 w-3.5 mr-1" /> Lập HĐ thuê
                              </Link>
                            </Button>
                          )}

                          {role === 'landlord' && item.status === 'active' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs font-bold bg-green-50 text-green-700 border-green-200" onClick={() => handleLandlordConfirm(item.id, false)}>
                              Nhận cọc
                            </Button>
                          )}

                          {(role === 'company_admin' || role === 'manager') && item.status === 'active' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs font-bold bg-amber-50 text-amber-800 border-amber-300" onClick={() => handleLandlordConfirm(item.id, true)}>
                              Duyệt đè
                            </Button>
                          )}

                          {role !== 'sales_agent' && role !== 'landlord' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600" asChild title="Chỉnh sửa">
                              <Link href={`${pathPrefix}/contracts/${item.id}/edit`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          )}

                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600" asChild title="In">
                            <Link href={`${pathPrefix}/contracts/${item.id}/print`}>
                              <Printer className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (Chỉ hiện trên máy tính >= md) */}
                <div className="hidden md:block overflow-x-auto w-full max-w-full touch-pan-x">
                  <table className="w-full min-w-[850px] text-sm border-collapse">
                    <thead className="bg-bg-subtle border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Mã hợp đồng</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Phòng / Tòa nhà</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Khách thuê (Bên B)</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Nhân viên Sale</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Tiền đặt cọc</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-ink-muted uppercase tracking-wider">Hạn ký HĐ thuê</th>
                        <th className="px-4 py-3 text-center text-xs font-bold text-ink-muted uppercase tracking-wider">Trạng thái</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-ink">
                      {filteredDeposits.map((item) => {
                        const statusInfo = statusLabels[item.status] || { label: item.status, color: 'bg-bg-subtle text-ink-muted border-border' };
                        return (
                          <tr 
                            key={item.id} 
                            className="hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                            onClick={(e) => {
                              if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                              setViewDeposit(item);
                              setIsViewDepositOpen(true);
                            }}
                          >
                            <td className="px-4 py-3 font-mono font-bold text-xs">{item.contract_code}</td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-accent">Phòng {item.rooms?.code || '---'}</span>
                              <p className="text-xs text-ink-muted truncate max-w-[180px] font-medium mt-0.5">
                                {item.rooms?.buildings?.name || 'Vị trí khác'}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-ink">{item.party_b_name}</span>
                              <p className="text-xs text-ink-muted font-mono mt-0.5">{item.party_b_phone}</p>
                            </td>
                            <td className="px-4 py-3">
                              {(() => {
                                const agentId = item.sales_agent_id || item.created_by;
                                const saleProfile = agentId ? profilesMap.get(agentId) : null;
                                if (!saleProfile) return <span className="font-semibold text-ink-muted text-xs">Hệ thống</span>;
                                return (
                                  <>
                                    <span className="font-semibold text-ink text-xs">{saleProfile.full_name || '—'}</span>
                                    <p className="text-xs text-ink-muted font-mono mt-0.5">{saleProfile.phone || '—'}</p>
                                  </>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-mono font-bold text-accent text-sm">
                                {Number(item.deposit_amount).toLocaleString('vi-VN')}đ
                              </span>
                              {(item.commission_rate_raw || item.rooms?.rose) && (
                                <p className="text-[10px] text-emerald-600 font-bold mt-0.5 whitespace-nowrap">
                                  Hoa hồng: {(item.commission_amount !== undefined && item.commission_amount !== null && Number(item.commission_amount) > 0
                                    ? Number(item.commission_amount)
                                    : calculateCommissionAmount(item.rooms?.price || 0, item.rooms?.rose || '', item.lease_duration_months)
                                  ).toLocaleString('vi-VN')}đ ({item.commission_rate_raw || item.rooms?.rose})
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-xs font-mono font-medium text-ink-muted">
                              {formatDateDisplay(item.deadline_sign_contract)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {(() => {
                                const isOverdueApproval = item.status === 'active' && item.created_at && (new Date().getTime() - new Date(item.created_at).getTime() > 20 * 60 * 1000);
                                return (
                                  <div className="flex flex-col items-center gap-1">
                                    <Badge className={`${statusInfo.color} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                                      {statusInfo.label}
                                    </Badge>
                                    {isOverdueApproval && (
                                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full animate-pulse">
                                        🚨 Quá 20p chưa duyệt
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                {(role === 'company_admin' || role === 'manager') && ['signed', 'active', 'draft'].includes(item.status) && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-emerald-600 hover:bg-bg-subtle" asChild title="Chuyển thành Hợp đồng thuê">
                                    <Link href={`${pathPrefix}/contracts/create-rental?deposit_id=${item.id}`}>
                                      <FileText className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                )}
                                
                                {/* Landlord Confirm Button */}
                                {role === 'landlord' && item.status === 'active' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 font-bold text-xs py-1 h-8 rounded-lg"
                                    onClick={() => handleLandlordConfirm(item.id, false)}
                                  >
                                    Nhận cọc
                                  </Button>
                                )}

                                {/* Admin / Manager Override Confirm Button */}
                                {(role === 'company_admin' || role === 'manager') && item.status === 'active' && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-800 font-bold text-xs py-1 h-8 rounded-lg shadow-none"
                                    onClick={() => handleLandlordConfirm(item.id, true)}
                                    title="Duyệt đè hợp đồng cọc thay Chủ nhà nếu xác nhận tiền cọc đã về"
                                  >
                                    Duyệt đè
                                  </Button>
                                )}
                                
                                {/* Edit contract (Admin / Manager only) */}
                                {role !== 'sales_agent' && role !== 'landlord' && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle" asChild title="Chỉnh sửa hợp đồng">
                                    <Link href={`${pathPrefix}/contracts/${item.id}/edit`}>
                                      <Pencil className="h-4 w-4" />
                                    </Link>
                                  </Button>
                                )}

                                {/* Change status (Admin / Manager only) */}
                                {role !== 'sales_agent' && role !== 'landlord' && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle" title="Thay đổi trạng thái">
                                        <RefreshCw className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-white border-border rounded-lg shadow-md text-ink text-xs font-semibold">
                                      <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'active')}>
                                        Chờ xác nhận (active)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'signed')}>
                                        Đã nhận cọc (signed)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'cancelled')}>
                                        Đã hủy cọc (cancelled)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'forfeited')}>
                                        Khách mất cọc (forfeited)
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleStatusChange(item.id, 'refunded')}>
                                        Đã trả cọc (refunded)
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}

                                {['confirmed', 'signed', 'deposited', 'active'].includes(item.status) && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 px-2.5 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 text-xs font-bold gap-1 rounded-lg shadow-none mr-1"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`${pathPrefix}/contracts/create-rental?deposit_id=${item.id}`);
                                    }}
                                    title="Chuyển cọc này thành Hợp đồng thuê chính thức"
                                  >
                                    <FileSignature className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Lập HĐ thuê</span>
                                  </Button>
                                )}

                                {['confirmed', 'signed', 'deposited', 'active', 'converted', 'refunded'].includes(item.status) && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-ink hover:text-indigo-600 hover:bg-bg-subtle"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setHandoverSourceType('deposit');
                                      setHandoverContract(item);
                                      setIsHandoverOpen(true);
                                    }}
                                    title="Biên bản bàn giao phòng"
                                  >
                                    <ClipboardCheck className="h-4 w-4" />
                                  </Button>
                                )}

                                <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle" asChild title="In hợp đồng">
                                  <Link href={`${pathPrefix}/contracts/${item.id}/print`}>
                                    <Printer className="h-4 w-4" />
                                  </Link>
                                </Button>
                                
                                {role !== 'sales_agent' && role !== 'landlord' && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10"
                                    onClick={() => {
                                      if (confirm('Bạn có chắc muốn xóa hợp đồng cọc này?')) {
                                        removeDeposit(item.id);
                                      }
                                    }} 
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
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {!depositsLoading && filteredDeposits.length === 0 && (
              <div className="text-center py-12 text-ink-muted bg-white">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-35" />
                <p className="text-sm font-semibold">Chưa có hợp đồng đặt cọc nào</p>
                <p className="text-xs text-ink-muted mt-1">Bấm nút &quot;Soạn hợp đồng cọc&quot; để bắt đầu</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : activeTab === 'rentals' ? (
        // TABLE HỢP ĐỒNG THUÊ CHÍNH THỨC
        <Card className="border-border shadow-none rounded-lg bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input 
                placeholder="Tìm hợp đồng thuê theo tên khách, SĐT, mã hợp đồng hoặc mã phòng..." 
                value={rentalSearch} 
                onChange={(e) => setRentalSearch(e.target.value)} 
                className="pl-9 rounded-lg border-border focus-visible:ring-accent" 
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {rentalsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : (
              <>
                {/* Mobile Card List Hợp Đồng Thuê (Hiện trên mobile < md) */}
                <div className="block md:hidden space-y-3 p-3 bg-slate-50/50">
                  {filteredRentals.map((item) => {
                    const rentalStatusLabels: Record<string, { label: string; color: string }> = {
                      draft: { label: 'Bản nháp', color: 'bg-bg-subtle text-ink-muted border-border' },
                      active: { label: 'Hiệu lực', color: 'bg-green-50 text-green-700 border-green-250' },
                      ended: { label: 'Đã hết hạn', color: 'bg-bg-subtle text-ink-muted border-border' },
                      terminated: { label: 'Kết thúc sớm', color: 'bg-amber-50 text-amber-700 border-amber-250' },
                      cancelled: { label: 'Đã hủy', color: 'bg-red-50 text-red-750 border-red-250' },
                    };
                    const statusInfo = rentalStatusLabels[item.status] || { label: item.status, color: 'bg-bg-subtle text-ink-muted' };
                    const agentId = item.sales_agent_id || item.created_by;
                    const saleProfile = agentId ? profilesMap.get(agentId) : null;

                    return (
                      <div 
                        key={item.id} 
                        className="p-3.5 border border-slate-200 rounded-xl bg-white shadow-xs space-y-2.5 cursor-pointer active:bg-slate-50 transition-colors"
                        onClick={() => {
                          setViewRental(item);
                          setIsViewRentalOpen(true);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.contract_code}
                          </span>
                          <Badge className={`${statusInfo.color} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-600">
                          <div className="flex justify-between items-start">
                            <span className="text-slate-400 shrink-0">Phòng / Tòa:</span>
                            <div className="text-right">
                              <span className="font-bold text-accent block">Phòng {item.rooms?.code || '---'}</span>
                              <span className="text-[11px] text-slate-500 font-medium">{item.rooms?.buildings?.name || 'Vị trí khác'}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Khách thuê (Bên B):</span>
                            <span className="font-semibold text-slate-900">{item.party_b_name} • <span className="font-mono">{item.party_b_phone}</span></span>
                          </div>

                          {saleProfile && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Sale phụ trách:</span>
                              <span className="font-medium text-slate-800">{saleProfile.full_name || '—'}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                            <span className="text-slate-400 font-medium">Tiền thuê:</span>
                            <span className="font-mono font-extrabold text-accent text-sm">{Number(item.rent_price).toLocaleString('vi-VN')}đ/tháng</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Thời hạn:</span>
                            <span className="font-mono font-semibold text-slate-800">{formatDateDisplay(item.start_date)} - {formatDateDisplay(item.end_date)}</span>
                          </div>
                        </div>

                        {/* Action buttons footer */}
                        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-indigo-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHandoverSourceType('rental');
                              setHandoverContract(item);
                              setIsHandoverOpen(true);
                            }}
                            title="Biên bản bàn giao phòng"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                          </Button>

                          {role !== 'landlord' && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" asChild title="Gia hạn">
                              <Link href={`${pathPrefix}/contracts/create-rental?renew_from_id=${item.id}`}>
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          )}

                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600" asChild title="In">
                            <Link href={`${pathPrefix}/contracts/${item.id}/print`}>
                              <Printer className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Table (Chỉ hiện trên máy tính >= md) */}
                <div className="hidden md:block overflow-x-auto w-full max-w-full touch-pan-x">
                  <table className="w-full min-w-[850px] text-sm border-collapse">
                  <thead className="bg-bg-subtle border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Mã hợp đồng</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Phòng / Tòa nhà</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Khách thuê (Bên B)</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Nhân viên Sale</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Tiền thuê</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-ink-muted uppercase tracking-wider">Thời hạn</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-ink-muted uppercase tracking-wider">Trạng thái</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-ink">
                    {filteredRentals.map((item) => {
                      const rentalStatusLabels: Record<string, { label: string; color: string }> = {
                        draft: { label: 'Bản nháp', color: 'bg-bg-subtle text-ink-muted border-border' },
                        active: { label: 'Hiệu lực', color: 'bg-green-50 text-green-700 border-green-250' },
                        ended: { label: 'Đã hết hạn', color: 'bg-bg-subtle text-ink-muted border-border' },
                        terminated: { label: 'Kết thúc sớm', color: 'bg-amber-50 text-amber-700 border-amber-250' },
                        cancelled: { label: 'Đã hủy', color: 'bg-red-50 text-red-750 border-red-250' },
                      };
                      const statusInfo = rentalStatusLabels[item.status] || { label: item.status, color: 'bg-bg-subtle text-ink-muted' };
                      return (
                        <tr 
                          key={item.id} 
                          className="hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                            setViewRental(item);
                            setIsViewRentalOpen(true);
                          }}
                        >
                          <td className="px-4 py-3 font-mono font-bold text-xs">{item.contract_code}</td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-accent">Phòng {item.rooms?.code || '---'}</span>
                            <p className="text-xs text-ink-muted truncate max-w-[180px] font-medium mt-0.5">
                              {item.rooms?.buildings?.name || 'Vị trí khác'}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-ink">{item.party_b_name}</span>
                            <p className="text-xs text-ink-muted font-mono mt-0.5">{item.party_b_phone}</p>
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const agentId = item.sales_agent_id || item.created_by;
                              const saleProfile = agentId ? profilesMap.get(agentId) : null;
                              if (!saleProfile) return <span className="font-semibold text-ink-muted text-xs">Hệ thống</span>;
                              return (
                                <>
                                  <span className="font-semibold text-ink text-xs">{saleProfile.full_name || '—'}</span>
                                  <p className="text-xs text-ink-muted font-mono mt-0.5">{saleProfile.phone || '—'}</p>
                                </>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-mono font-bold text-accent text-sm">
                              {Number(item.rent_price).toLocaleString('vi-VN')}đ/th
                            </span>
                            {(item.commission_rate_raw || item.rooms?.rose) && (
                              <p className="text-[10px] text-emerald-600 font-bold mt-0.5 whitespace-nowrap">
                                Hoa hồng: {(item.commission_amount !== undefined && item.commission_amount !== null && Number(item.commission_amount) > 0
                                  ? Number(item.commission_amount)
                                  : calculateCommissionAmount(item.rooms?.price || 0, item.rooms?.rose || '', getContractTermMonths(item.start_date, item.end_date))
                                ).toLocaleString('vi-VN')}đ ({item.commission_rate_raw || item.rooms?.rose})
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center text-xs font-mono font-medium text-ink-muted">
                            <div>{formatDateDisplay(item.start_date)} - {formatDateDisplay(item.end_date)}</div>
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-sans font-semibold mt-0.5" title="Tự động gia hạn theo điều khoản nếu không báo hủy trước 30 ngày">
                              🔄 Tự động gia hạn (30d)
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className={`${statusInfo.color} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                              {statusInfo.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-ink hover:text-indigo-600 hover:bg-bg-subtle"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHandoverSourceType('rental');
                                  setHandoverContract(item);
                                  setIsHandoverOpen(true);
                                }}
                                title="Biên bản bàn giao phòng"
                              >
                                <ClipboardCheck className="h-4 w-4" />
                              </Button>
                              {role !== 'landlord' && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle" asChild title="Gia hạn hợp đồng">
                                  <Link href={`${pathPrefix}/contracts/create-rental?renew_from_id=${item.id}`}>
                                    <RefreshCw className="h-4 w-4" />
                                  </Link>
                                </Button>
                              )}
                              {role !== 'sales_agent' && role !== 'landlord' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10"
                               onClick={async () => {
                                    if (confirm('Bạn có chắc muốn xóa hợp đồng thuê này và giải phóng phòng về trạng thái trống?')) {
                                      try {
                                        await removeRental(item.id);
                                        if (item.room_id) {
                                          await supabase
                                            .from('rooms')
                                            .update({ status: 'available' })
                                            .eq('id', item.room_id);
                                        }
                                        toast.success('Xóa hợp đồng và giải phóng phòng thành công!');
                                      } catch (err: any) {
                                        toast.error('Lỗi khi xóa hợp đồng: ' + err.message);
                                      }
                                    }
                                  }} 
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
                  </tbody>
                </table>
              </div>
            </>
          )}
            {!rentalsLoading && filteredRentals.length === 0 && (
              <div className="text-center py-12 text-ink-muted bg-white">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-35" />
                <p className="text-sm font-semibold">Chưa có hợp đồng thuê chính thức nào</p>
                <p className="text-xs text-ink-muted mt-1">Bấm nút &quot;Soạn hợp đồng thuê&quot; hoặc chuyển đổi từ Hợp đồng cọc để bắt đầu</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : activeTab === 'archived' ? (
        // TABLE HỢP ĐỒNG ĐÃ THANH LÝ / HẾT HẠN / HỦY
        <Card className="border-border shadow-none rounded-lg bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input 
                placeholder="Tìm hợp đồng đã thanh lý/hết hạn theo tên khách, SĐT, mã hợp đồng hoặc mã phòng..." 
                value={archivedSearch} 
                onChange={(e) => setArchivedSearch(e.target.value)} 
                className="pl-9 rounded-lg border-border focus-visible:ring-accent" 
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile Card List Hợp Đồng Thanh Lý (Hiện trên mobile < md) */}
            <div className="block md:hidden space-y-3 p-3 bg-slate-50/50">
              {filteredArchived.map((item: any) => {
                const archivedStatusLabels: Record<string, { label: string; color: string }> = {
                  ended: { label: 'Đã hết hạn', color: 'bg-slate-100 text-slate-700 border-slate-300' },
                  terminated: { label: 'Kết thúc sớm', color: 'bg-amber-100 text-amber-800 border-amber-300' },
                  cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-800 border-red-300' },
                  forfeited: { label: 'Mất cọc', color: 'bg-amber-100 text-amber-800 border-amber-300' },
                  refunded: { label: 'Đã trả cọc', color: 'bg-teal-100 text-teal-800 border-teal-300' },
                };
                const statusInfo = archivedStatusLabels[item.status] || { label: item.status, color: 'bg-bg-subtle text-ink-muted' };

                return (
                  <div 
                    key={item.id} 
                    className="p-3.5 border border-slate-200 rounded-xl bg-white shadow-xs space-y-2.5 cursor-pointer active:bg-slate-50 transition-colors"
                    onClick={() => {
                      if (item.contract_category === 'thuê') {
                        setViewRental(item);
                        setIsViewRentalOpen(true);
                      } else {
                        setViewDeposit(item);
                        setIsViewDepositOpen(true);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {item.contract_code} ({item.contract_category})
                      </span>
                      <Badge className={`${statusInfo.color} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between items-start">
                        <span className="text-slate-400 shrink-0">Phòng / Tòa:</span>
                        <div className="text-right">
                          <span className="font-bold text-accent block">Phòng {item.rooms?.code || '---'}</span>
                          <span className="text-[11px] text-slate-500 font-medium">{item.rooms?.buildings?.name || 'Vị trí khác'}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Khách thuê (Bên B):</span>
                        <span className="font-semibold text-slate-900">{item.party_b_name} • <span className="font-mono">{item.party_b_phone}</span></span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                        <span className="text-slate-400 font-medium">Giá tiền / Cọc:</span>
                        <span className="font-mono font-extrabold text-accent text-sm">{Number(item.rent_price || item.deposit_amount).toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600" asChild title="In">
                        <Link href={`${pathPrefix}/contracts/${item.id}/print`}>
                          <Printer className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (Chỉ hiện trên máy tính >= md) */}
            <div className="hidden md:block overflow-x-auto w-full max-w-full touch-pan-x">
              <table className="w-full min-w-[850px] text-sm border-collapse">
                <thead className="bg-bg-subtle border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Mã hợp đồng</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Loại HĐ</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Phòng / Tòa nhà</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Khách thuê (Bên B)</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Giá tiền / Cọc</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-ink-muted uppercase tracking-wider">Trạng thái</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  {filteredArchived.map((item: any) => {
                    const archivedStatusLabels: Record<string, { label: string; color: string }> = {
                      ended: { label: 'Đã hết hạn', color: 'bg-slate-100 text-slate-700 border-slate-300' },
                      terminated: { label: 'Kết thúc sớm', color: 'bg-amber-100 text-amber-800 border-amber-300' },
                      cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-800 border-red-300' },
                      forfeited: { label: 'Mất cọc', color: 'bg-amber-100 text-amber-800 border-amber-300' },
                      refunded: { label: 'Đã trả cọc', color: 'bg-teal-100 text-teal-800 border-teal-300' },
                    };
                    const statusInfo = archivedStatusLabels[item.status] || { label: item.status, color: 'bg-bg-subtle text-ink-muted' };
                    return (
                      <tr 
                        key={item.id} 
                        className="hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                        onClick={() => {
                          if (item.contract_category === 'thuê') {
                            setViewRental(item);
                            setIsViewRentalOpen(true);
                          } else {
                            setViewDeposit(item);
                            setIsViewDepositOpen(true);
                          }
                        }}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-xs">{item.contract_code}</td>
                        <td className="px-4 py-3 font-bold text-xs uppercase text-ink-muted">
                          HĐ {item.contract_category}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-accent">Phòng {item.rooms?.code || '---'}</span>
                          <p className="text-xs text-ink-muted truncate max-w-[180px] font-medium mt-0.5">
                            {item.rooms?.buildings?.name || 'Vị trí khác'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-ink">{item.party_b_name}</span>
                          <p className="text-xs text-ink-muted font-mono mt-0.5">{item.party_b_phone}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-accent text-sm">
                          {Number(item.rent_price || item.deposit_amount).toLocaleString('vi-VN')}đ
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={`${statusInfo.color} border font-bold text-[10px] rounded-full uppercase tracking-wider`} variant="outline">
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle" asChild title="Xem / In hợp đồng">
                            <Link href={`${pathPrefix}/contracts/${item.id}/print`}>
                              <Printer className="h-4 w-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredArchived.length === 0 && (
              <div className="text-center py-12 text-ink-muted bg-white">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-35" />
                <p className="text-sm font-semibold">Không có hợp đồng thanh lý hoặc hết hạn nào</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // TABLE MẪU HỢP ĐỒNG
        <Card className="border-border shadow-none rounded-lg bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
              <Input 
                placeholder="Tìm theo tên mẫu hoặc loại..." 
                value={templateSearch} 
                onChange={(e) => setTemplateSearch(e.target.value)} 
                className="pl-9 rounded-lg border-border focus-visible:ring-accent" 
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {templatesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : (
              <div className="overflow-x-auto w-full max-w-full touch-pan-x">
                <table className="w-full min-w-[700px] text-sm border-collapse">
                  <thead className="bg-bg-subtle border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Tên</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-ink-muted uppercase tracking-wider">Loại</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-ink-muted uppercase tracking-wider">Ngày tạo</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-ink-muted uppercase tracking-wider">Cập nhật</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-ink-muted uppercase tracking-wider">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-ink">
                    {filteredTemplates.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          openViewTemplate(item);
                        }}
                      >
                        <td className="px-4 py-3 font-semibold text-ink">{item.name}</td>
                        <td className="px-4 py-3 text-ink-muted font-medium">{item.type}</td>
                        <td className="px-4 py-3 text-center text-xs font-mono font-medium text-ink-muted">{item.created_at.split('T')[0]}</td>
                        <td className="px-4 py-3 text-center text-xs font-mono font-medium text-ink-muted">{item.updated_at.split('T')[0]}</td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {role !== 'sales_agent' && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-ink hover:text-accent hover:bg-bg-subtle" onClick={() => openEditTemplate(item)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-danger hover:text-danger hover:bg-danger/10" onClick={() => { if (confirm('Bạn có chắc muốn xóa mẫu này?')) removeTemplate(item.id); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!templatesLoading && filteredTemplates.length === 0 && (
              <div className="text-center py-12 text-ink-muted bg-white">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-35" />
                <p className="text-sm font-semibold">Chưa có mẫu hợp đồng nào</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog chi tiết hợp đồng cọc */}
      <Dialog open={isViewDepositOpen} onOpenChange={setIsViewDepositOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-white shadow-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ink text-lg font-bold font-heading">
              <FileText className="h-5 w-5 text-accent" />
              Chi tiết Hợp đồng Đặt cọc #{viewDeposit?.contract_code}
            </DialogTitle>
          </DialogHeader>
          {viewDeposit && (
            <div className="space-y-6 pt-4 text-sm text-ink-muted">
              {/* Thông tin chung */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-bg-subtle p-4 rounded-lg border border-border">
                <div>
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Mã hợp đồng:</span>
                  <span className="font-bold text-ink text-xs font-mono">{viewDeposit.contract_code}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Trạng thái:</span>
                  <Badge className={`${statusLabels[viewDeposit.status]?.color || ''} border font-bold text-[9px] rounded-full uppercase tracking-wider mt-1`} variant="outline">
                    {statusLabels[viewDeposit.status]?.label || viewDeposit.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Ngày lập HĐ:</span>
                  <span className="font-semibold text-ink text-xs font-mono">{formatDateDisplay(viewDeposit.agreement_date)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Nhân viên Sale:</span>
                  {(() => {
                    const agentId = viewDeposit.sales_agent_id || viewDeposit.created_by;
                    const saleProfile = agentId ? profilesMap.get(agentId) : null;
                    if (!saleProfile) return <span className="font-semibold text-ink text-xs">Hệ thống</span>;
                    return (
                      <>
                        <span className="font-semibold text-ink text-xs block truncate">{saleProfile.full_name || '—'}</span>
                        <span className="text-ink-muted text-[10px] font-mono block mt-0.5">{saleProfile.phone || '—'}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Thông tin 2 bên */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5 p-4 border rounded-lg bg-bg-subtle/20 border-border">
                  <h4 className="font-bold font-heading text-ink border-b pb-2 flex items-center gap-1.5 uppercase text-xs tracking-wider border-border">
                    <User className="h-4 w-4 text-accent" /> Bên Cho Thuê (Bên A)
                  </h4>
                  <p><span className="text-ink-muted text-xs font-medium">Họ và tên:</span> <span className="font-semibold text-ink">{viewDeposit.party_a_name}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Số điện thoại:</span> <span className="font-mono text-ink font-semibold">{viewDeposit.party_a_phone}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Ngày sinh:</span> <span className="font-mono">{formatDateDisplay(viewDeposit.party_a_dob)}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Số CCCD:</span> <span className="font-mono text-ink font-medium">{viewDeposit.party_a_id_card || '—'}</span></p>
                  {viewDeposit.party_a_id_date && <p><span className="text-ink-muted text-xs font-medium">Ngày cấp:</span> <span className="font-mono">{formatDateDisplay(viewDeposit.party_a_id_date)}</span> (Nơi cấp: {viewDeposit.party_a_id_place || '—'})</p>}
                  <p><span className="text-ink-muted text-xs font-medium">Địa chỉ:</span> <span className="text-ink">{viewDeposit.party_a_address || '—'}</span></p>
                </div>

                <div className="space-y-2.5 p-4 border rounded-lg bg-bg-subtle/20 border-border">
                  <h4 className="font-bold font-heading text-ink border-b pb-2 flex items-center gap-1.5 uppercase text-xs tracking-wider border-border">
                    <User className="h-4 w-4 text-accent" /> Bên Đặt Cọc (Bên B)
                  </h4>
                  <p><span className="text-ink-muted text-xs font-medium">Họ và tên:</span> <span className="font-semibold text-ink">{viewDeposit.party_b_name}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Số điện thoại:</span> <span className="font-mono text-ink font-semibold">{viewDeposit.party_b_phone}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Ngày sinh:</span> <span className="font-mono">{formatDateDisplay(viewDeposit.party_b_dob)}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Số CCCD:</span> <span className="font-mono text-ink font-medium">{viewDeposit.party_b_id_card || '—'}</span></p>
                  {viewDeposit.party_b_id_date && <p><span className="text-ink-muted text-xs font-medium">Ngày cấp:</span> <span className="font-mono">{formatDateDisplay(viewDeposit.party_b_id_date)}</span> (Nơi cấp: {viewDeposit.party_b_id_place || '—'})</p>}
                  <p><span className="text-ink-muted text-xs font-medium">Địa chỉ:</span> <span className="text-ink">{viewDeposit.party_b_address || '—'}</span></p>
                </div>
              </div>

              {/* Thông tin phòng & điều khoản đặt cọc */}
              <div className="space-y-4 p-4 border rounded-lg bg-white border-border">
                <h4 className="font-bold font-heading text-ink border-b pb-2 flex items-center gap-1.5 uppercase text-xs tracking-wider border-border">
                  <Building className="h-4 w-4 text-accent" /> Thông tin phòng đặt cọc & Điều khoản
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-4">
                  <p className="md:col-span-3"><span className="text-ink-muted text-xs font-medium">Phòng cọc giữ chỗ:</span> <span className="font-bold text-accent">Phòng {viewDeposit.rooms?.code || '---'} - {viewDeposit.rooms?.buildings?.name || 'Khu vực khác'}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Giá thuê thỏa thuận:</span> <span className="font-bold font-mono text-ink">{Number(viewDeposit.rent_price).toLocaleString('vi-VN')}đ/tháng</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Số tiền đặt cọc giữ chỗ:</span> <span className="font-bold font-mono text-accent">{Number(viewDeposit.deposit_amount).toLocaleString('vi-VN')}đ</span></p>
                  {viewDeposit.deposit_terms && <p><span className="text-ink-muted text-xs font-medium">Thời hạn cọc / cọc hợp đồng:</span> <span className="text-ink font-semibold">{viewDeposit.deposit_terms}</span></p>}
                  {viewDeposit.commission_rate_raw && (
                    <p>
                      <span className="text-ink-muted text-xs font-medium">Hoa hồng:</span>{' '}
                      <span className="font-semibold text-emerald-600">
                        {viewDeposit.commission_rate_raw} ({(viewDeposit.commission_amount !== undefined && viewDeposit.commission_amount !== null && Number(viewDeposit.commission_amount) > 0
                          ? Number(viewDeposit.commission_amount)
                          : calculateCommissionAmount(viewDeposit.rooms?.price || 0, viewDeposit.rooms?.rose || '', viewDeposit.lease_duration_months)
                        ).toLocaleString('vi-VN')}đ)
                      </span>
                    </p>
                  )}
                  <p><span className="text-ink-muted text-xs font-medium">Hạn ký HĐ chính thức:</span> <span className="font-semibold text-danger font-mono">{formatDateDisplay(viewDeposit.deadline_sign_contract)}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Tiền điện:</span> <span className="font-mono text-ink font-semibold">{Number(viewDeposit.electricity_price).toLocaleString('vi-VN')}đ/số</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Tiền nước:</span> <span className="text-ink font-semibold">{viewDeposit.water_price}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Phí dịch vụ:</span> <span className="text-ink font-semibold">{viewDeposit.service_price}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Mạng internet:</span> <span className="text-ink font-semibold">{viewDeposit.other_services?.internet || 'Chưa thỏa thuận'}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Phí giặt sấy:</span> <span className="text-ink font-semibold">{viewDeposit.other_services?.laundry || 'Chưa thỏa thuận'}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Số người đăng ký:</span> <span className="text-ink font-semibold">{viewDeposit.tenant_count} người</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Thời hạn dự kiến:</span> <span className="text-ink font-semibold">{viewDeposit.lease_duration_months} tháng</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Báo trước khi đòi nhà:</span> <span className="text-ink font-semibold">{viewDeposit.termination_notice_days} ngày</span></p>
                  {viewDeposit.room_repair_support_date && <p><span className="text-ink-muted text-xs font-medium">Hạn hỗ trợ sửa phòng:</span> <span className="font-mono">{formatDateDisplay(viewDeposit.room_repair_support_date)}</span></p>}
                  <p className="md:col-span-3"><span className="text-ink-muted text-xs font-medium">Phương thức thanh toán:</span> <span className="text-ink">{viewDeposit.payment_method}</span></p>
                </div>
              </div>

              {/* Thông tin thanh toán ngân hàng */}
              <div className="space-y-4 p-4 border rounded-lg bg-bg-subtle border-border">
                <h4 className="font-bold font-heading text-ink border-b pb-2 flex items-center gap-1.5 uppercase text-xs tracking-wider border-border">
                  <Landmark className="h-4 w-4 text-accent" /> Thông tin tài khoản nhận cọc
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-4">
                  <p><span className="text-ink-muted text-xs font-medium">Ngân hàng:</span> <span className="text-ink font-semibold">{viewDeposit.bank_name || '—'}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Số tài khoản:</span> <span className="text-ink font-mono font-semibold">{viewDeposit.bank_account_number || '—'}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Chủ tài khoản:</span> <span className="text-ink font-semibold uppercase">{viewDeposit.bank_account_owner || '—'}</span></p>
                  <p className="md:col-span-3"><span className="text-ink-muted text-xs font-medium">Nội dung chuyển khoản mẫu:</span> <span className="font-mono bg-white px-2 py-1 border border-border rounded text-ink text-xs block mt-1">{viewDeposit.transfer_content_template || '—'}</span></p>
                  {viewDeposit.note && <p className="md:col-span-3"><span className="text-ink-muted text-xs font-medium">Ghi chú thêm:</span> <span className="text-ink">{viewDeposit.note}</span></p>}
                </div>
              </div>

              {/* Ảnh minh chứng */}
              {(viewDeposit.lead_view_image_url || viewDeposit.transfer_proof_url) && (
                <div className="space-y-4 p-4 border rounded-lg bg-white border-border">
                  <h4 className="font-bold font-heading text-ink border-b pb-2 uppercase text-xs tracking-wider border-border">📸 Ảnh minh chứng giao dịch</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewDeposit.lead_view_image_url && (
                      <div className="space-y-1">
                        <span className="text-ink-muted block text-xs font-medium">Ảnh dẫn khách xem phòng:</span>
                        <a href={viewDeposit.lead_view_image_url} target="_blank" rel="noopener noreferrer" className="block border border-border rounded-lg overflow-hidden max-h-[300px] hover:opacity-90 transition-opacity relative w-full h-[250px]">
                          <Image src={viewDeposit.lead_view_image_url} alt="Ảnh dẫn khách" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                        </a>
                      </div>
                    )}
                    {viewDeposit.transfer_proof_url && (
                      <div className="space-y-1">
                        <span className="text-ink-muted block text-xs font-medium">Ảnh hóa đơn chuyển khoản đặt cọc:</span>
                        <a href={viewDeposit.transfer_proof_url} target="_blank" rel="noopener noreferrer" className="block border border-border rounded-lg overflow-hidden max-h-[300px] hover:opacity-90 transition-opacity relative w-full h-[250px]">
                          <Image src={viewDeposit.transfer_proof_url} alt="Ảnh chuyển khoản cọc" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Landlord Confirmation Button inside Modal */}
              {role === 'landlord' && viewDeposit.status === 'active' && (
                <div className="flex justify-end pt-4 border-t border-border mt-4">
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 h-10 flex items-center gap-2 rounded-lg"
                    onClick={() => handleLandlordConfirm(viewDeposit.id)}
                  >
                    <ShieldCheck className="h-5 w-5" />
                    Xác nhận đã nhận đặt cọc
                  </Button>
                </div>
              )}

              {/* Biên bản bàn giao phòng & Lập HĐ thuê */}
              {['confirmed', 'signed', 'deposited', 'active', 'converted', 'refunded'].includes(viewDeposit.status) && (
                <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-4">
                  {['confirmed', 'signed', 'deposited', 'active'].includes(viewDeposit.status) && (
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 h-10 flex items-center gap-2 rounded-lg shadow-sm"
                      onClick={() => {
                        setIsViewOpen(false);
                        router.push(`${pathPrefix}/contracts/create-rental?deposit_id=${viewDeposit.id}`);
                      }}
                    >
                      <FileSignature className="h-5 w-5" />
                      Lập Hợp Đồng Thuê Chính Thức
                    </Button>
                  )}
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 h-10 flex items-center gap-2 rounded-lg shadow-sm"
                    onClick={() => {
                      setHandoverSourceType('deposit');
                      setHandoverContract(viewDeposit);
                      setIsHandoverOpen(true);
                    }}
                  >
                    <ClipboardCheck className="h-5 w-5" />
                    Biên bản bàn giao phòng
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog chi tiết hợp đồng thuê */}
      <Dialog open={isViewRentalOpen} onOpenChange={setIsViewRentalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-white shadow-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ink text-lg font-bold font-heading">
              <FileText className="h-5 w-5 text-accent" />
              Chi tiết Hợp đồng Thuê chính thức #{viewRental?.contract_code}
            </DialogTitle>
          </DialogHeader>
          {viewRental && (
            <div className="space-y-6 pt-4 text-sm text-ink-muted">
              {/* Thông tin chung */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-bg-subtle p-4 rounded-lg border border-border">
                <div>
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Mã hợp đồng:</span>
                  <span className="font-bold text-ink text-xs font-mono">{viewRental.contract_code}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Trạng thái:</span>
                  <Badge className="bg-green-50 text-green-700 border-green-250 border font-bold text-[9px] rounded-full uppercase tracking-wider mt-1" variant="outline">
                    {viewRental.status === 'active' ? 'Hiệu lực' : viewRental.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Thời hạn:</span>
                  <span className="font-semibold text-ink text-xs font-mono block mt-1">
                    {formatDateDisplay(viewRental.start_date)} - {formatDateDisplay(viewRental.end_date)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Nhân viên Sale:</span>
                  {(() => {
                    const agentId = viewRental.sales_agent_id || viewRental.created_by;
                    const saleProfile = agentId ? profilesMap.get(agentId) : null;
                    if (!saleProfile) return <span className="font-semibold text-ink text-xs">Hệ thống</span>;
                    return (
                      <>
                        <span className="font-semibold text-ink text-xs block truncate">{saleProfile.full_name || '—'}</span>
                        <span className="text-ink-muted text-[10px] font-mono block mt-0.5">{saleProfile.phone || '—'}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Thông tin 2 bên */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5 p-4 border rounded-lg bg-bg-subtle/20 border-border">
                  <h4 className="font-bold font-heading text-ink border-b pb-2 flex items-center gap-1.5 uppercase text-xs tracking-wider border-border">
                    <User className="h-4 w-4 text-accent" /> Bên Cho Thuê (Bên A)
                  </h4>
                  <p><span className="text-ink-muted text-xs font-medium">Họ và tên:</span> <span className="font-semibold text-ink">{viewRental.party_a_name}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Số điện thoại:</span> <span className="font-mono text-ink font-semibold">{viewRental.party_a_phone}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Ngày sinh:</span> <span className="font-mono">{formatDateDisplay(viewRental.party_a_dob)}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Số CCCD:</span> <span className="font-mono text-ink font-medium">{viewRental.party_a_id_card || '—'}</span></p>
                  {viewRental.party_a_id_date && <p><span className="text-ink-muted text-xs font-medium">Ngày cấp:</span> <span className="font-mono">{formatDateDisplay(viewRental.party_a_id_date)}</span> (Nơi cấp: {viewRental.party_a_id_place || '—'})</p>}
                  <p><span className="text-ink-muted text-xs font-medium">Địa chỉ:</span> <span className="text-ink">{viewRental.party_a_address || '—'}</span></p>
                </div>

                <div className="space-y-2.5 p-4 border rounded-lg bg-bg-subtle/20 border-border">
                  <h4 className="font-bold font-heading text-ink border-b pb-2 flex items-center gap-1.5 uppercase text-xs tracking-wider border-border">
                    <User className="h-4 w-4 text-accent" /> Bên Thuê Phòng (Bên B)
                  </h4>
                  <p><span className="text-ink-muted text-xs font-medium">Họ và tên:</span> <span className="font-semibold text-ink">{viewRental.party_b_name}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Số điện thoại:</span> <span className="font-mono text-ink font-semibold">{viewRental.party_b_phone}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Ngày sinh:</span> <span className="font-mono">{formatDateDisplay(viewRental.party_b_dob)}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Số CCCD:</span> <span className="font-mono text-ink font-medium">{viewRental.party_b_id_card || '—'}</span></p>
                  {viewRental.party_b_id_date && <p><span className="text-ink-muted text-xs font-medium">Ngày cấp:</span> <span className="font-mono">{formatDateDisplay(viewRental.party_b_id_date)}</span> (Nơi cấp: {viewRental.party_b_id_place || '—'})</p>}
                  <p><span className="text-ink-muted text-xs font-medium">Địa chỉ:</span> <span className="text-ink">{viewRental.party_b_address || '—'}</span></p>
                </div>
              </div>

              {/* Thông tin phòng & điều khoản thuê */}
              <div className="space-y-4 p-4 border rounded-lg bg-white border-border">
                <h4 className="font-bold font-heading text-ink border-b pb-2 flex items-center gap-1.5 uppercase text-xs tracking-wider border-border">
                  <Building className="h-4 w-4 text-accent" /> Thông tin phòng & Chi tiết thuê
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-4">
                  <p className="md:col-span-3"><span className="text-ink-muted text-xs font-medium">Phòng thuê chính thức:</span> <span className="font-bold text-accent">Phòng {viewRental.rooms?.code || '---'} - {viewRental.rooms?.buildings?.name || 'Khu vực khác'}</span></p>
                  {viewRental.sign_location && <p className="md:col-span-3"><span className="text-ink-muted text-xs font-medium">Nơi ký hợp đồng:</span> <span className="text-ink">{viewRental.sign_location}</span></p>}
                  <p><span className="text-ink-muted text-xs font-medium">Giá thuê hàng tháng:</span> <span className="font-bold font-mono text-ink">{Number(viewRental.rent_price).toLocaleString('vi-VN')}đ</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Số tiền cọc đã đóng:</span> <span className="font-bold font-mono text-accent">{Number(viewRental.deposit_amount).toLocaleString('vi-VN')}đ</span></p>
                  {(viewRental.commission_rate_raw || viewRental.rooms?.rose) && (
                    <p>
                      <span className="text-ink-muted text-xs font-medium">Hoa hồng Sale:</span>{' '}
                      <span className="font-bold font-mono text-emerald-600">
                        {(viewRental.commission_amount !== undefined && viewRental.commission_amount !== null && Number(viewRental.commission_amount) > 0
                          ? Number(viewRental.commission_amount)
                          : calculateCommissionAmount(viewRental.rooms?.price || 0, viewRental.rooms?.rose || '', getContractTermMonths(viewRental.start_date, viewRental.end_date))
                        ).toLocaleString('vi-VN')}đ ({viewRental.commission_rate_raw || viewRental.rooms?.rose})
                      </span>
                    </p>
                  )}
                  <p><span className="text-ink-muted text-xs font-medium">Ngày đóng tiền:</span> <span className="text-ink font-semibold">Ngày {viewRental.payment_day_of_month} hàng tháng</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Chu kỳ đóng tiền:</span> <span className="text-ink font-semibold">{viewRental.billing_cycle_months} tháng/lần</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Ngày bắt đầu:</span> <span className="font-mono text-ink">{formatDateDisplay(viewRental.start_date)}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Ngày kết thúc:</span> <span className="font-mono text-ink">{formatDateDisplay(viewRental.end_date)}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Ngày bàn giao:</span> <span className="font-mono text-ink">{formatDateDisplay(viewRental.handover_date)}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Tiền điện:</span> <span className="font-mono text-ink font-semibold">{Number(viewRental.electricity_price).toLocaleString('vi-VN')}đ/số</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Tiền nước:</span> <span className="text-ink font-semibold">{viewRental.water_price}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Phí dịch vụ:</span> <span className="text-ink font-semibold">{viewRental.service_price}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Mạng internet:</span> <span className="text-ink font-semibold">{viewRental.other_services?.internet || 'Chưa thỏa thuận'}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Phí giặt sấy:</span> <span className="text-ink font-semibold">{viewRental.other_services?.laundry || 'Chưa thỏa thuận'}</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Số người ở thực tế:</span> <span className="text-ink font-semibold">{viewRental.tenant_count} người</span></p>
                  <p><span className="text-ink-muted text-xs font-medium">Báo trước khi hủy HĐ:</span> <span className="text-ink font-semibold">{viewRental.termination_notice_days} ngày</span></p>
                  <p className="md:col-span-3"><span className="text-ink-muted text-xs font-medium">Phương thức thanh toán:</span> <span className="text-ink">{viewRental.payment_method}</span></p>
                  {viewRental.note && <p className="md:col-span-3"><span className="text-ink-muted text-xs font-medium">Ghi chú & Thỏa thuận thêm:</span> <span className="text-ink text-xs block bg-bg-subtle/40 p-2 border border-border rounded mt-1">{viewRental.note}</span></p>}
                </div>
              </div>

              {/* Cập nhật trạng thái hợp đồng (Chỉ Admin/Manager) */}
              {role !== 'sales_agent' && role !== 'landlord' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border mt-4">
                  <span className="text-xs font-bold text-ink uppercase tracking-wider">Cập nhật trạng thái hợp đồng:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { status: 'active', label: 'Hiệu lực', color: 'bg-green-600 hover:bg-green-700 text-white' },
                      { status: 'ended', label: 'Kết thúc (Hết hạn)', color: 'bg-slate-500 hover:bg-slate-650 text-white' },
                      { status: 'terminated', label: 'Thanh lý sớm', color: 'bg-amber-600 hover:bg-amber-700 text-white' },
                      { status: 'cancelled', label: 'Hủy hợp đồng', color: 'bg-rose-600 hover:bg-rose-700 text-white' },
                    ].map((btn) => (
                      <Button
                        key={btn.status}
                        size="sm"
                        disabled={viewRental.status === btn.status}
                        className={`text-xs h-8 px-3 rounded-lg font-semibold border-none ${btn.color} ${
                          viewRental.status === btn.status ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                        onClick={() => handleRentalStatusChange(viewRental.id, btn.status)}
                      >
                        {btn.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-border mt-4">
                <Button 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold h-9 px-4 flex items-center gap-2"
                  onClick={() => {
                    setHandoverSourceType('rental');
                    setHandoverContract(viewRental);
                    setIsHandoverOpen(true);
                  }}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Biên bản bàn giao phòng
                </Button>
                {role !== 'landlord' && (
                  <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold h-9 px-4">
                    <Link href={`${pathPrefix}/contracts/create-rental?renew_from_id=${viewRental.id}`}>
                      <RefreshCw className="h-4 w-4 mr-2" /> Gia hạn hợp đồng này
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog chi tiết mẫu hợp đồng */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl rounded-lg border border-border bg-white shadow-lg p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-ink font-heading font-bold text-lg">
              <FileText className="h-5 w-5 text-accent" />Chi tiết mẫu hợp đồng
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4 text-sm bg-bg-subtle p-3 rounded-lg border border-border">
                <div><span className="text-ink-muted font-semibold text-xs">Tên mẫu:</span> <span className="font-semibold text-ink block mt-0.5">{viewItem.name}</span></div>
                <div><span className="text-ink-muted font-semibold text-xs">Loại:</span> <span className="font-semibold text-ink block mt-0.5">{viewItem.type}</span></div>
                <div><span className="text-ink-muted font-semibold text-xs">Ngày tạo:</span> <span className="font-mono text-ink block mt-0.5">{viewItem.created_at.split('T')[0]}</span></div>
                <div><span className="text-ink-muted font-semibold text-xs">Cập nhật:</span> <span className="font-mono text-ink block mt-0.5">{viewItem.updated_at.split('T')[0]}</span></div>
              </div>
              <div className="border border-border rounded-lg p-4 bg-white max-h-[350px] overflow-auto">
                <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2 border-b border-border pb-1">Nội dung mẫu</h4>
                <p className="text-xs text-ink-muted whitespace-pre-wrap leading-relaxed">{viewItem.content}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Biên bản bàn giao phòng */}
      <HandoverReportDialog
        contract={handoverContract}
        sourceType={handoverSourceType}
        isOpen={isHandoverOpen}
        onOpenChange={setIsHandoverOpen}
        onSuccess={() => {
          refetchDeposits();
          refetchRentals();
        }}
      />
    </div>
  );
}

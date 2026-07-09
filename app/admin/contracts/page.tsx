'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
  Building, Landmark, RefreshCw
} from 'lucide-react';
import { useContractTemplates, useDepositContracts, useRentalContracts, useProfiles } from '@/lib/hooks/useEntities';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBContractTemplate } from '@/lib/supabase/types';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const formatDateDisplay = (dateStr?: string | null): string => {
  if (!dateStr) return '—';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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

export default function ContractsPage() {
  const { company, role } = useAuth();
  const pathname = usePathname();
  const pathPrefix = pathname?.startsWith('/landlord') ? '/landlord' : '/admin';
  const [activeTab, setActiveTab] = useState<'deposits' | 'rentals' | 'templates'>('deposits');
  
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
  } = useRentalContracts(company?.id);
  const [rentalSearch, setRentalSearch] = useState('');

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

  const handleLandlordConfirm = async (id: string) => {
    if (!confirm('Bạn có chắc chắn đã nhận đủ tiền đặt cọc cho phòng này?')) return;
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
      toast.success('Xác nhận nhận cọc thành công!');
      
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

  const filteredDeposits = depositContracts.filter((d) =>
    d.party_b_name.toLowerCase().includes(depositSearch.toLowerCase()) ||
    d.party_b_phone.includes(depositSearch) ||
    d.contract_code.toLowerCase().includes(depositSearch.toLowerCase()) ||
    (d.rooms?.code && d.rooms.code.toLowerCase().includes(depositSearch.toLowerCase()))
  );

  const filteredRentals = rentalContracts.filter((r) =>
    r.party_b_name.toLowerCase().includes(rentalSearch.toLowerCase()) ||
    r.party_b_phone.includes(rentalSearch) ||
    r.contract_code.toLowerCase().includes(rentalSearch.toLowerCase()) ||
    (r.rooms?.code && r.rooms.code.toLowerCase().includes(rentalSearch.toLowerCase()))
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

  const error = activeTab === 'deposits' 
    ? depositsError 
    : activeTab === 'rentals' 
      ? rentalsError 
      : templatesError;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý hợp đồng</h1>
          <p className="text-slate-500">Quản lý hợp đồng đặt cọc giữ chỗ và hợp đồng thuê chính thức</p>
        </div>

        {activeTab === 'deposits' ? (
          role !== 'landlord' && (
            <Button asChild className="bg-slate-900 text-white hover:bg-slate-800">
              <Link href={`${pathPrefix}/contracts/create`}>
                <Plus className="h-4 w-4 mr-2" /> Soạn hợp đồng cọc
              </Link>
            </Button>
          )
        ) : activeTab === 'rentals' ? (
          role !== 'sales_agent' && role !== 'landlord' && (
            <Button asChild className="bg-slate-900 text-white hover:bg-slate-800">
              <Link href={`${pathPrefix}/contracts/create-rental`}>
                <Plus className="h-4 w-4 mr-2" /> Soạn hợp đồng thuê
              </Link>
            </Button>
          )
        ) : (
          role !== 'sales_agent' && role !== 'landlord' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openAddTemplate} className="bg-slate-900 text-white hover:bg-slate-800">
                  <Plus className="h-4 w-4 mr-2" /> Thêm mẫu hợp đồng
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editItem ? 'Chỉnh sửa' : 'Thêm'} mẫu hợp đồng</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveTemplate} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Tên mẫu</Label>
                    <Input id="name" name="name" defaultValue={editItem?.name} required />
                  </div>
                  <div>
                    <Label htmlFor="type">Loại hợp đồng</Label>
                    <Input id="type" name="type" defaultValue={editItem?.type} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="content">Nội dung mẫu</Label>
                  <Textarea id="content" name="content" defaultValue={editItem?.content ?? ''} rows={10} />
                </div>
                <Button type="submit" className="w-full bg-slate-900 text-white" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Lưu
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          )
        )}
      </div>

      {/* Tabs chuyển đổi */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('deposits')}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'deposits'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Hợp đồng đặt cọc
        </button>
        <button
          onClick={() => setActiveTab('rentals')}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${
            activeTab === 'rentals'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Hợp đồng thuê chính thức
        </button>
        {role !== 'landlord' && (
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-all ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Mẫu hợp đồng
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      {activeTab === 'deposits' ? (
        // TABLE HỢP ĐỒNG ĐẶT CỌC
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Tìm hợp đồng cọc theo tên khách, SĐT, mã hợp đồng hoặc mã phòng..." 
                value={depositSearch} 
                onChange={(e) => setDepositSearch(e.target.value)} 
                className="pl-9" 
              />
            </div>
          </CardHeader>
          <CardContent>
            {depositsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Mã hợp đồng</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Phòng / Tòa nhà</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Khách thuê (Bên B)</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Nhân viên Sale</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Tiền đặt cọc</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Hạn ký HĐ thuê</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Trạng thái</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredDeposits.map((item) => {
                      const statusInfo = statusLabels[item.status] || { label: item.status, color: 'bg-slate-100 text-slate-700' };
                      return (
                        <tr 
                          key={item.id} 
                          className="hover:bg-slate-50/50 cursor-pointer"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                            setViewDeposit(item);
                            setIsViewDepositOpen(true);
                          }}
                        >
                          <td className="px-4 py-3 font-medium text-slate-900">{item.contract_code}</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-indigo-600">Phòng {item.rooms?.code || '---'}</span>
                            <p className="text-xs text-slate-400 truncate max-w-[180px]">
                              {item.rooms?.buildings?.name || 'Vị trí khác'}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-800">{item.party_b_name}</span>
                            <p className="text-xs text-slate-500">{item.party_b_phone}</p>
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const saleProfile = item.created_by ? profilesMap.get(item.created_by) : null;
                              if (!saleProfile) return <span className="font-medium text-slate-800">Hệ thống</span>;
                              return (
                                <>
                                  <span className="font-medium text-slate-800">{saleProfile.full_name || '—'}</span>
                                  <p className="text-xs text-slate-500">{saleProfile.phone || '—'}</p>
                                </>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {Number(item.deposit_amount).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatDateDisplay(item.deadline_sign_contract)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {(role === 'company_admin' || role === 'manager') && ['signed', 'active', 'draft'].includes(item.status) && (
                                <Button variant="ghost" size="sm" asChild title="Chuyển thành Hợp đồng thuê">
                                  <Link href={`${pathPrefix}/contracts/create-rental?deposit_id=${item.id}`}>
                                    <FileText className="h-4 w-4 text-emerald-600" />
                                  </Link>
                                </Button>
                              )}
                              
                              {/* Landlord Confirm Button */}
                              {role === 'landlord' && item.status === 'active' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 font-semibold text-xs py-1 h-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleLandlordConfirm(item.id);
                                  }}
                                >
                                  Xác nhận nhận cọc
                                </Button>
                              )}
                              
                              {/* Edit contract (Admin / Manager only) */}
                              {role !== 'sales_agent' && role !== 'landlord' && (
                                <Button variant="ghost" size="sm" asChild title="Chỉnh sửa hợp đồng">
                                  <Link href={`${pathPrefix}/contracts/${item.id}/edit`}>
                                    <Pencil className="h-4 w-4 text-slate-600" />
                                  </Link>
                                </Button>
                              )}

                              {/* Change status (Admin / Manager only) */}
                              {role !== 'sales_agent' && role !== 'landlord' && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" title="Thay đổi trạng thái">
                                      <RefreshCw className="h-4 w-4 text-amber-600" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
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

                              <Button variant="ghost" size="sm" asChild title="In hợp đồng">
                                <Link href={`${pathPrefix}/contracts/${item.id}/print`}>
                                  <Printer className="h-4 w-4 text-indigo-600" />
                                </Link>
                              </Button>
                              
                              {role !== 'sales_agent' && role !== 'landlord' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    if (confirm('Bạn có chắc muốn xóa hợp đồng cọc này?')) {
                                      removeDeposit(item.id);
                                    }
                                  }} 
                                  title="Xóa"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredDeposits.length === 0 && (
                  <div className="text-center py-12 text-slate-400 bg-white">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-35 text-slate-600" />
                    <p className="text-sm font-medium">Chưa có hợp đồng đặt cọc nào</p>
                    <p className="text-xs text-slate-400 mt-1">Bấm nút &quot;Soạn hợp đồng cọc&quot; để bắt đầu</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : activeTab === 'rentals' ? (
        // TABLE HỢP ĐỒNG THUÊ CHÍNH THỨC
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Tìm hợp đồng thuê theo tên khách, SĐT, mã hợp đồng hoặc mã phòng..." 
                value={rentalSearch} 
                onChange={(e) => setRentalSearch(e.target.value)} 
                className="pl-9" 
              />
            </div>
          </CardHeader>
          <CardContent>
            {rentalsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Mã hợp đồng</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Phòng / Tòa nhà</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Khách thuê (Bên B)</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Nhân viên Sale</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Tiền thuê</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Thời hạn</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Trạng thái</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredRentals.map((item) => {
                      const rentalStatusLabels: Record<string, { label: string; color: string }> = {
                        draft: { label: 'Bản nháp', color: 'bg-slate-100 text-slate-700' },
                        active: { label: 'Hiệu lực', color: 'bg-green-100 text-green-700' },
                        ended: { label: 'Đã hết hạn', color: 'bg-slate-300 text-slate-650' },
                        terminated: { label: 'Kết thúc sớm', color: 'bg-amber-100 text-amber-700' },
                        cancelled: { label: 'Đã hủy', color: 'bg-red-100 text-red-700' },
                      };
                      const statusInfo = rentalStatusLabels[item.status] || { label: item.status, color: 'bg-slate-100 text-slate-700' };
                      return (
                        <tr 
                          key={item.id} 
                          className="hover:bg-slate-50/50 cursor-pointer"
                          onClick={(e) => {
                            if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                            setViewRental(item);
                            setIsViewRentalOpen(true);
                          }}
                        >
                          <td className="px-4 py-3 font-medium text-slate-900">{item.contract_code}</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-indigo-600">Phòng {item.rooms?.code || '---'}</span>
                            <p className="text-xs text-slate-400 truncate max-w-[180px]">
                              {item.rooms?.buildings?.name || 'Vị trí khác'}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-800">{item.party_b_name}</span>
                            <p className="text-xs text-slate-500">{item.party_b_phone}</p>
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const saleProfile = item.created_by ? profilesMap.get(item.created_by) : null;
                              if (!saleProfile) return <span className="font-medium text-slate-800">Hệ thống</span>;
                              return (
                                <>
                                  <span className="font-medium text-slate-800">{saleProfile.full_name || '—'}</span>
                                  <p className="text-xs text-slate-500">{saleProfile.phone || '—'}</p>
                                </>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {Number(item.rent_price).toLocaleString('vi-VN')} đ/tháng
                          </td>
                          <td className="px-4 py-3 text-slate-600 text-xs">
                            {formatDateDisplay(item.start_date)} - {formatDateDisplay(item.end_date)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {role !== 'sales_agent' && role !== 'landlord' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => {
                                    if (confirm('Bạn có chắc muốn xóa hợp đồng thuê này?')) {
                                      removeRental(item.id);
                                    }
                                  }} 
                                  title="Xóa"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredRentals.length === 0 && (
                  <div className="text-center py-12 text-slate-400 bg-white">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-35 text-slate-600" />
                    <p className="text-sm font-medium">Chưa có hợp đồng thuê chính thức nào</p>
                    <p className="text-xs text-slate-400 mt-1">Bấm nút &quot;Soạn hợp đồng thuê&quot; hoặc chuyển đổi từ Hợp đồng cọc để bắt đầu</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        // TABLE MẪU HỢP ĐỒNG
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Tìm theo tên mẫu hoặc loại..." 
                value={templateSearch} 
                onChange={(e) => setTemplateSearch(e.target.value)} 
                className="pl-9" 
              />
            </div>
          </CardHeader>
          <CardContent>
            {templatesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Tên</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Loại</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Ngày tạo</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Cập nhật</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-700">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredTemplates.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/50 cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          openViewTemplate(item);
                        }}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-slate-600">{item.type}</td>
                        <td className="px-4 py-3 text-slate-500">{item.created_at.split('T')[0]}</td>
                        <td className="px-4 py-3 text-slate-500">{item.updated_at.split('T')[0]}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {role !== 'sales_agent' && (
                              <>
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditTemplate(item); }}><Pencil className="h-4 w-4 text-slate-600" /></Button>
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); if (confirm('Bạn có chắc muốn xóa mẫu này?')) removeTemplate(item.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredTemplates.length === 0 && (
                  <div className="text-center py-12 text-slate-400 bg-white">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-35 text-slate-600" />
                    <p className="text-sm font-medium">Chưa có mẫu hợp đồng nào</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog chi tiết hợp đồng cọc */}
      <Dialog open={isViewDepositOpen} onOpenChange={setIsViewDepositOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-bold">
              <FileText className="h-5 w-5 text-indigo-650" />
              Chi tiết Hợp đồng Đặt cọc #{viewDeposit?.contract_code}
            </DialogTitle>
          </DialogHeader>
          {viewDeposit && (
            <div className="space-y-6 pt-4 text-sm text-slate-600">
              {/* Thông tin chung */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border">
                <div>
                  <span className="text-slate-400 block text-xs">Mã hợp đồng:</span>
                  <span className="font-semibold text-slate-800">{viewDeposit.contract_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Trạng thái:</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold mt-1 ${statusLabels[viewDeposit.status]?.color || ''}`}>
                    {statusLabels[viewDeposit.status]?.label || viewDeposit.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Ngày lập HĐ:</span>
                  <span className="font-medium text-slate-800">{formatDateDisplay(viewDeposit.agreement_date)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Nhân viên Sale:</span>
                  {(() => {
                    const saleProfile = viewDeposit.created_by ? profilesMap.get(viewDeposit.created_by) : null;
                    if (!saleProfile) return <span className="font-semibold text-slate-800">Hệ thống</span>;
                    return (
                      <>
                        <span className="font-semibold text-slate-800">{saleProfile.full_name || '—'}</span>
                        <span className="text-slate-500 block text-xs">{saleProfile.phone || '—'}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Thông tin 2 bên */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 p-4 border rounded-lg bg-indigo-50/20 border-indigo-100">
                  <h4 className="font-bold text-indigo-900 border-b pb-1 flex items-center gap-1.5">
                    <User className="h-4 w-4" /> Bên Cho Thuê (Bên A)
                  </h4>
                  <p><span className="text-slate-400">Họ và tên:</span> <span className="font-semibold text-slate-800">{viewDeposit.party_a_name}</span></p>
                  <p><span className="text-slate-400">Số điện thoại:</span> {viewDeposit.party_a_phone}</p>
                  <p><span className="text-slate-400">Ngày sinh:</span> {formatDateDisplay(viewDeposit.party_a_dob)}</p>
                  <p><span className="text-slate-400">Số CCCD:</span> {viewDeposit.party_a_id_card || '—'}</p>
                  {viewDeposit.party_a_id_date && <p><span className="text-slate-400">Ngày cấp:</span> {formatDateDisplay(viewDeposit.party_a_id_date)} (Nơi cấp: {viewDeposit.party_a_id_place || '—'})</p>}
                  <p><span className="text-slate-400">Địa chỉ:</span> {viewDeposit.party_a_address || '—'}</p>
                </div>

                <div className="space-y-2 p-4 border rounded-lg bg-emerald-50/20 border-emerald-100">
                  <h4 className="font-bold text-emerald-900 border-b pb-1 flex items-center gap-1.5">
                    <User className="h-4 w-4" /> Bên Đặt Cọc (Bên B)
                  </h4>
                  <p><span className="text-slate-400">Họ và tên:</span> <span className="font-semibold text-slate-800">{viewDeposit.party_b_name}</span></p>
                  <p><span className="text-slate-400">Số điện thoại:</span> <span className="font-semibold text-slate-800">{viewDeposit.party_b_phone}</span></p>
                  <p><span className="text-slate-400">Ngày sinh:</span> {formatDateDisplay(viewDeposit.party_b_dob)}</p>
                  <p><span className="text-slate-400">Số CCCD:</span> {viewDeposit.party_b_id_card || '—'}</p>
                  {viewDeposit.party_b_id_date && <p><span className="text-slate-400">Ngày cấp:</span> {formatDateDisplay(viewDeposit.party_b_id_date)} (Nơi cấp: {viewDeposit.party_b_id_place || '—'})</p>}
                  <p><span className="text-slate-400">Địa chỉ:</span> {viewDeposit.party_b_address || '—'}</p>
                </div>
              </div>

              {/* Thông tin phòng & điều khoản thuê */}
              <div className="space-y-4 p-4 border rounded-lg bg-white">
                <h4 className="font-bold text-slate-800 border-b pb-1 flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-indigo-600" /> Thông tin phòng & Thỏa thuận thuê
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-4">
                  <p className="md:col-span-3"><span className="text-slate-400">Địa điểm/Phòng đặt cọc:</span> <span className="font-bold text-indigo-600">Phòng {viewDeposit.rooms?.code || '---'} - {viewDeposit.rooms?.buildings?.name || 'Khu vực khác'}</span></p>
                  {viewDeposit.sign_location && <p className="md:col-span-3"><span className="text-slate-400">Nơi ký hợp đồng:</span> {viewDeposit.sign_location}</p>}
                  <p><span className="text-slate-400">Giá thuê dự kiến:</span> <span className="font-semibold text-slate-800">{Number(viewDeposit.rent_price).toLocaleString('vi-VN')} đ/tháng</span></p>
                  <p><span className="text-slate-400">Số tiền đặt cọc:</span> <span className="font-bold text-slate-800">{Number(viewDeposit.deposit_amount).toLocaleString('vi-VN')} đ</span></p>
                  <p><span className="text-slate-400">Hạn ký HĐ chính thức:</span> <span className="font-semibold text-red-600">{formatDateDisplay(viewDeposit.deadline_sign_contract)}</span></p>
                  <p><span className="text-slate-400">Tiền điện:</span> {Number(viewDeposit.electricity_price).toLocaleString('vi-VN')} đ/số</p>
                  <p><span className="text-slate-400">Tiền nước:</span> {viewDeposit.water_price}</p>
                  <p><span className="text-slate-400">Phí dịch vụ:</span> {viewDeposit.service_price}</p>
                  <p><span className="text-slate-400">Tiền mạng internet:</span> {viewDeposit.other_services?.internet || 'Chưa thỏa thuận'}</p>
                  <p><span className="text-slate-400">Phí giặt sấy:</span> {viewDeposit.other_services?.laundry || 'Chưa thỏa thuận'}</p>
                  <p><span className="text-slate-400">Số người đăng ký ở:</span> {viewDeposit.tenant_count} người</p>
                  <p><span className="text-slate-400">Thời hạn HĐ dự kiến:</span> {viewDeposit.lease_duration_months} tháng</p>
                  <p><span className="text-slate-400">Báo trước khi đòi nhà:</span> {viewDeposit.termination_notice_days} ngày</p>
                  {viewDeposit.room_repair_support_date && <p><span className="text-slate-400">Hạn hỗ trợ sửa phòng:</span> {formatDateDisplay(viewDeposit.room_repair_support_date)}</p>}
                  <p className="md:col-span-3"><span className="text-slate-400">Phương thức thanh toán:</span> {viewDeposit.payment_method}</p>
                </div>
              </div>

              {/* Thông tin thanh toán ngân hàng */}
              <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                <h4 className="font-bold text-slate-800 border-b pb-1 flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-indigo-650" /> Thông tin tài khoản nhận cọc
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-4">
                  <p><span className="text-slate-400">Ngân hàng:</span> {viewDeposit.bank_name || '—'}</p>
                  <p><span className="text-slate-400">Số tài khoản:</span> {viewDeposit.bank_account_number || '—'}</p>
                  <p><span className="text-slate-400">Chủ tài khoản:</span> {viewDeposit.bank_account_owner || '—'}</p>
                  <p className="md:col-span-3"><span className="text-slate-400">Nội dung chuyển khoản mẫu:</span> <span className="font-mono bg-white px-2 py-1 border rounded text-slate-700 text-xs">{viewDeposit.transfer_content_template || '—'}</span></p>
                  {viewDeposit.note && <p className="md:col-span-3"><span className="text-slate-400">Ghi chú thêm:</span> {viewDeposit.note}</p>}
                </div>
              </div>

              {/* Ảnh minh chứng */}
              {(viewDeposit.lead_view_image_url || viewDeposit.transfer_proof_url) && (
                <div className="space-y-4 p-4 border rounded-lg bg-white">
                  <h4 className="font-bold text-slate-800 border-b pb-1">📸 Ảnh minh chứng giao dịch</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewDeposit.lead_view_image_url && (
                      <div className="space-y-1">
                        <span className="text-slate-500 block text-xs">Ảnh dẫn khách xem phòng:</span>
                        <a href={viewDeposit.lead_view_image_url} target="_blank" rel="noopener noreferrer" className="block border rounded-lg overflow-hidden max-h-[300px] hover:opacity-90">
                          <img src={viewDeposit.lead_view_image_url} alt="Ảnh dẫn khách" className="w-full h-full object-cover max-h-[300px]" />
                        </a>
                      </div>
                    )}
                    {viewDeposit.transfer_proof_url && (
                      <div className="space-y-1">
                        <span className="text-slate-500 block text-xs">Ảnh hóa đơn chuyển khoản đặt cọc:</span>
                        <a href={viewDeposit.transfer_proof_url} target="_blank" rel="noopener noreferrer" className="block border rounded-lg overflow-hidden max-h-[300px] hover:opacity-90">
                          <img src={viewDeposit.transfer_proof_url} alt="Ảnh chuyển khoản cọc" className="w-full h-full object-cover max-h-[300px]" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Landlord Confirmation Button inside Modal */}
              {role === 'landlord' && viewDeposit.status === 'active' && (
                <div className="flex justify-end pt-4 border-t mt-4">
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2 h-10 flex items-center gap-2"
                    onClick={() => handleLandlordConfirm(viewDeposit.id)}
                  >
                    <ShieldCheck className="h-5 w-5" />
                    Xác nhận đã nhận đặt cọc
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog chi tiết hợp đồng thuê */}
      <Dialog open={isViewRentalOpen} onOpenChange={setIsViewRentalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 text-lg font-bold">
              <FileText className="h-5 w-5 text-emerald-650" />
              Chi tiết Hợp đồng Thuê chính thức #{viewRental?.contract_code}
            </DialogTitle>
          </DialogHeader>
          {viewRental && (
            <div className="space-y-6 pt-4 text-sm text-slate-600">
              {/* Thông tin chung */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border">
                <div>
                  <span className="text-slate-400 block text-xs">Mã hợp đồng:</span>
                  <span className="font-semibold text-slate-800">{viewRental.contract_code}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Trạng thái:</span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold mt-1 bg-green-100 text-green-700`}>
                    {viewRental.status === 'active' ? 'Hiệu lực' : viewRental.status}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Thời hạn:</span>
                  <span className="font-medium text-slate-800 block text-xs mt-1">
                    {formatDateDisplay(viewRental.start_date)} - {formatDateDisplay(viewRental.end_date)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Nhân viên Sale:</span>
                  {(() => {
                    const saleProfile = viewRental.created_by ? profilesMap.get(viewRental.created_by) : null;
                    if (!saleProfile) return <span className="font-semibold text-slate-800">Hệ thống</span>;
                    return (
                      <>
                        <span className="font-semibold text-slate-800">{saleProfile.full_name || '—'}</span>
                        <span className="text-slate-500 block text-xs">{saleProfile.phone || '—'}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Thông tin 2 bên */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 p-4 border rounded-lg bg-indigo-50/20 border-indigo-100">
                  <h4 className="font-bold text-indigo-900 border-b pb-1 flex items-center gap-1.5">
                    <User className="h-4 w-4" /> Bên Cho Thuê (Bên A)
                  </h4>
                  <p><span className="text-slate-400">Họ và tên:</span> <span className="font-semibold text-slate-800">{viewRental.party_a_name}</span></p>
                  <p><span className="text-slate-400">Số điện thoại:</span> {viewRental.party_a_phone}</p>
                  <p><span className="text-slate-400">Ngày sinh:</span> {formatDateDisplay(viewRental.party_a_dob)}</p>
                  <p><span className="text-slate-400">Số CCCD:</span> {viewRental.party_a_id_card || '—'}</p>
                  {viewRental.party_a_id_date && <p><span className="text-slate-400">Ngày cấp:</span> {formatDateDisplay(viewRental.party_a_id_date)} (Nơi cấp: {viewRental.party_a_id_place || '—'})</p>}
                  <p><span className="text-slate-400">Địa chỉ:</span> {viewRental.party_a_address || '—'}</p>
                </div>

                <div className="space-y-2 p-4 border rounded-lg bg-emerald-50/20 border-emerald-100">
                  <h4 className="font-bold text-emerald-900 border-b pb-1 flex items-center gap-1.5">
                    <User className="h-4 w-4" /> Bên Thuê Phòng (Bên B)
                  </h4>
                  <p><span className="text-slate-400">Họ và tên:</span> <span className="font-semibold text-slate-800">{viewRental.party_b_name}</span></p>
                  <p><span className="text-slate-400">Số điện thoại:</span> <span className="font-semibold text-slate-800">{viewRental.party_b_phone}</span></p>
                  <p><span className="text-slate-400">Ngày sinh:</span> {formatDateDisplay(viewRental.party_b_dob)}</p>
                  <p><span className="text-slate-400">Số CCCD:</span> {viewRental.party_b_id_card || '—'}</p>
                  {viewRental.party_b_id_date && <p><span className="text-slate-400">Ngày cấp:</span> {formatDateDisplay(viewRental.party_b_id_date)} (Nơi cấp: {viewRental.party_b_id_place || '—'})</p>}
                  <p><span className="text-slate-400">Địa chỉ:</span> {viewRental.party_b_address || '—'}</p>
                </div>
              </div>

              {/* Thông tin phòng & điều khoản thuê */}
              <div className="space-y-4 p-4 border rounded-lg bg-white">
                <h4 className="font-bold text-slate-800 border-b pb-1 flex items-center gap-1.5">
                  <Building className="h-4 w-4 text-emerald-650" /> Thông tin phòng & Chi tiết thuê
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-4">
                  <p className="md:col-span-3"><span className="text-slate-400">Phòng thuê chính thức:</span> <span className="font-bold text-emerald-600">Phòng {viewRental.rooms?.code || '---'} - {viewRental.rooms?.buildings?.name || 'Khu vực khác'}</span></p>
                  {viewRental.sign_location && <p className="md:col-span-3"><span className="text-slate-400">Nơi ký hợp đồng:</span> {viewRental.sign_location}</p>}
                  <p><span className="text-slate-400">Giá thuê hàng tháng:</span> <span className="font-bold text-slate-800">{Number(viewRental.rent_price).toLocaleString('vi-VN')} đ</span></p>
                  <p><span className="text-slate-400">Số tiền cọc đã đóng:</span> <span className="font-bold text-slate-800">{Number(viewRental.deposit_amount).toLocaleString('vi-VN')} đ</span></p>
                  <p><span className="text-slate-400">Ngày đóng tiền:</span> Ngày {viewRental.payment_day_of_month} hàng tháng</p>
                  <p><span className="text-slate-400">Chu kỳ đóng tiền:</span> {viewRental.billing_cycle_months} tháng/lần</p>
                  <p><span className="text-slate-400">Ngày bắt đầu:</span> {formatDateDisplay(viewRental.start_date)}</p>
                  <p><span className="text-slate-400">Ngày kết thúc:</span> {formatDateDisplay(viewRental.end_date)}</p>
                  <p><span className="text-slate-400">Ngày bàn giao:</span> {formatDateDisplay(viewRental.handover_date)}</p>
                  <p><span className="text-slate-400">Tiền điện:</span> {Number(viewRental.electricity_price).toLocaleString('vi-VN')} đ/số</p>
                  <p><span className="text-slate-400">Tiền nước:</span> {viewRental.water_price}</p>
                  <p><span className="text-slate-400">Phí dịch vụ:</span> {viewRental.service_price}</p>
                  <p><span className="text-slate-400">Tiền mạng internet:</span> {viewRental.other_services?.internet || 'Chưa thỏa thuận'}</p>
                  <p><span className="text-slate-400">Phí giặt sấy:</span> {viewRental.other_services?.laundry || 'Chưa thỏa thuận'}</p>
                  <p><span className="text-slate-400">Số người ở thực tế:</span> {viewRental.tenant_count} người</p>
                  <p><span className="text-slate-400">Báo trước khi hủy HĐ:</span> {viewRental.termination_notice_days} ngày</p>
                  <p className="md:col-span-3"><span className="text-slate-400">Phương thức thanh toán:</span> {viewRental.payment_method}</p>
                  {viewRental.note && <p className="md:col-span-3"><span className="text-slate-400">Ghi chú & Thỏa thuận thêm:</span> {viewRental.note}</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog chi tiết mẫu hợp đồng */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <FileText className="h-5 w-5 text-indigo-600" />Chi tiết mẫu hợp đồng
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-lg border">
                <div><span className="text-slate-500">Tên:</span> <span className="font-semibold text-slate-800">{viewItem.name}</span></div>
                <div><span className="text-slate-500">Loại:</span> <span className="font-semibold text-slate-800">{viewItem.type}</span></div>
                <div><span className="text-slate-500">Ngày tạo:</span> {viewItem.created_at.split('T')[0]}</div>
                <div><span className="text-slate-500">Cập nhật:</span> {viewItem.updated_at.split('T')[0]}</div>
              </div>
              <div className="border rounded-lg p-4 bg-white max-h-[350px] overflow-auto">
                <h4 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">Nội dung mẫu</h4>
                <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{viewItem.content}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

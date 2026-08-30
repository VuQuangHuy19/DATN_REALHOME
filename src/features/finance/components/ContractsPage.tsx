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
  Building, Landmark, RefreshCw, ClipboardCheck, FileSignature, Sparkles, Eye,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Code
} from 'lucide-react';
import { useContractTemplates, useDepositContracts, useRentalContracts } from '@/features/finance/hooks/useContracts';
import { 
  DEFAULT_DEPOSIT_TEMPLATE, 
  DEFAULT_BUILDING_DEPOSIT_TEMPLATE, 
  DEFAULT_DEPOSIT_NOTARY_TEMPLATE,
  DEFAULT_DEPOSIT_HCM_TEMPLATE,
  DEFAULT_RENTAL_TEMPLATE,
  DEFAULT_RENTAL_OFFICIAL_2024_TEMPLATE,
  DEFAULT_HANDOVER_TEMPLATE, 
  DEFAULT_INVOICE_TEMPLATE, 
  DEFAULT_MAINTENANCE_TEMPLATE,
  getDefaultTemplateContent 
} from '@/features/finance/services/contract_templates';
import { useProfiles } from '@/features/staff/hooks/useStaff';;
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBContractTemplate } from '@/lib/supabase/types';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { HandoverReportDialog } from './HandoverReportDialog';
import { getContractTermMonths, calculateCommissionAmount } from '@/features/finance/services/commission';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { DepositContractsTable } from './contracts/DepositContractsTable';
import { RentalContractsTable } from './contracts/RentalContractsTable';
import { ArchivedContractsTable } from './contracts/ArchivedContractsTable';

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

  // Template Designer States
  const [templateContent, setTemplateContent] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<DBContractTemplate['type']>('rental');
  const [editorTab, setEditorTab] = useState<'edit' | 'preview'>('edit');
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');

  const formatTemplateForPreview = (html: string) => {
    if (!html) return '';
    return html.replace(/\{[A-Z0-9_]+\}/g, '....................................');
  };

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
    if (!templateName.trim()) {
      toast.error('Vui lòng nhập tên mẫu hợp đồng');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        company_id: company?.id ?? '',
        name: templateName.trim(),
        type: templateType,
        content: templateContent || null,
      };
      if (editItem) {
        await updateTemplate(editItem.id, payload);
        toast.success('Cập nhật mẫu hợp đồng thành công!');
      } else {
        await addTemplate(payload);
        toast.success('Thêm mẫu hợp đồng mới thành công!');
      }
      setIsDialogOpen(false);
      setEditItem(null);
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi khi lưu mẫu hợp đồng');
    } finally {
      setSaving(false);
    }
  };

  const openAddTemplate = () => {
    setEditItem(null);
    setTemplateName('Mẫu hợp đồng mới');
    setTemplateType('rental');
    setTemplateContent(DEFAULT_RENTAL_TEMPLATE);
    setEditorTab('edit');
    setIsDialogOpen(true);
  };

  const openEditTemplate = (item: DBContractTemplate) => {
    setEditItem(item);
    setTemplateName(item.name);
    setTemplateType(item.type as any);
    setTemplateContent(item.content || getDefaultTemplateContent(item.type as any));
    setEditorTab('edit');
    setIsDialogOpen(true);
  };

  const insertVariableTag = (tag: string) => {
    setTemplateContent((prev) => prev + ` ${tag} `);
    toast.success(`Đã chèn ${tag}`);
  };

  const loadPreset = (presetType: 'deposit_room' | 'deposit_building' | 'deposit_notary' | 'deposit_hcm' | 'rental' | 'rental_official_2024' | 'handover' | 'invoice' | 'maintenance') => {
    switch (presetType) {
      case 'deposit_room':
        setTemplateContent(DEFAULT_DEPOSIT_TEMPLATE);
        setTemplateType('deposit');
        setTemplateName('Mẫu hợp đồng đặt cọc phòng trọ (A4 chuẩn)');
        break;
      case 'deposit_building':
        setTemplateContent(DEFAULT_BUILDING_DEPOSIT_TEMPLATE);
        setTemplateType('deposit');
        setTemplateName('Mẫu hợp đồng đặt cọc thuê cả nhà / căn hộ');
        break;
      case 'deposit_notary':
        setTemplateContent(DEFAULT_DEPOSIT_NOTARY_TEMPLATE);
        setTemplateType('deposit');
        setTemplateName('Mẫu hợp đồng đặt cọc thuê nhà (Đền cọc x2 + Phí luật sư)');
        break;
      case 'deposit_hcm':
        setTemplateContent(DEFAULT_DEPOSIT_HCM_TEMPLATE);
        setTemplateType('deposit');
        setTemplateName('Mẫu HĐ nhận tiền đặt cọc phòng trọ (Có số Sổ đỏ + Phạt cam kết)');
        break;
      case 'rental':
        setTemplateContent(DEFAULT_RENTAL_TEMPLATE);
        setTemplateType('rental');
        setTemplateName('Mẫu hợp đồng thuê căn hộ chuẩn (A4)');
        break;
      case 'rental_official_2024':
        setTemplateContent(DEFAULT_RENTAL_OFFICIAL_2024_TEMPLATE);
        setTemplateType('rental');
        setTemplateName('Mẫu HĐ thuê nhà ở (Luật BĐS 2023 - Mẫu chuẩn Nghị định)');
        break;
      case 'handover':
        setTemplateContent(DEFAULT_HANDOVER_TEMPLATE);
        setTemplateType('handover');
        setTemplateName('Biên bản bàn giao phòng & thiết bị');
        break;
      case 'invoice':
        setTemplateContent(DEFAULT_INVOICE_TEMPLATE);
        setTemplateType('invoice');
        setTemplateName('Mẫu bảng kê hóa đơn tiền nhà');
        break;
      case 'maintenance':
        setTemplateContent(DEFAULT_MAINTENANCE_TEMPLATE);
        setTemplateType('maintenance');
        setTemplateName('Phiếu tiếp nhận & sửa chữa bảo trì');
        break;
    }
    toast.success('Đã tải mẫu A4 chuẩn thành công!');
  };

  const openViewTemplate = (item: DBContractTemplate) => { setViewItem(item); setIsViewOpen(true); };

  const handlePrintTemplate = (item: DBContractTemplate) => {
    const rawContent = item.content || getDefaultTemplateContent(item.type as any);
    const printableHtml = formatTemplateForPreview(rawContent);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Vui lòng cho phép mở cửa sổ bật lên (popup) để in mẫu hợp đồng.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>${item.name} - Mẫu in A4 RealHome</title>
          <style>
            @page {
              size: A4;
              margin: 15mm 18mm 15mm 18mm;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 13pt;
              line-height: 1.6;
              color: #000;
              margin: 0;
              padding: 0;
              background-color: #fff;
            }
            p { margin: 0 0 10px 0; }
            h1, h2, h3, h4 { font-family: 'Times New Roman', Times, serif; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            th, td { border: 1px solid #000; padding: 6px 10px; font-size: 11pt; }
            .no-print-bar {
              position: fixed;
              top: 15px;
              right: 20px;
              background: #2563eb;
              color: #ffffff;
              padding: 10px 20px;
              border-radius: 10px;
              font-family: system-ui, -apple-system, sans-serif;
              font-weight: 700;
              font-size: 14px;
              cursor: pointer;
              border: none;
              box-shadow: 0 4px 14px rgba(37,99,235,0.4);
              z-index: 99999;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .no-print-bar:hover {
              background: #1d4ed8;
            }
            @media print {
              .no-print-bar { display: none !important; }
            }
          </style>
        </head>
        <body>
          <button class="no-print-bar" onclick="window.print()">
            🖨️ Nhấn vào đây để In / Tải file PDF (A4)
          </button>
          <div>
            ${printableHtml}
          </div>
          <script>
            setTimeout(() => {
              window.print();
            }, 400);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
              <DialogContent className="max-w-[90vw] w-[90vw] h-[88vh] max-h-[88vh] rounded-2xl border border-border bg-white shadow-2xl p-4 sm:p-6 flex flex-col">
                <DialogHeader className="shrink-0 pb-3 border-b border-border flex flex-row items-center justify-between">
                  <div>
                    <DialogTitle className="font-heading text-lg sm:text-xl font-bold text-ink flex items-center gap-2">
                      <FileSignature className="h-5 w-5 text-accent" />
                      {editItem ? 'Chỉnh sửa' : 'Thiết kế'} mẫu hợp đồng A4
                    </DialogTitle>
                    <p className="text-xs text-ink-muted mt-0.5">Tùy biến nội dung văn bản và chèn thẻ biến tự động cho công ty/chủ nhà</p>
                  </div>
                  <div className="flex items-center gap-2 pr-6">
                    <Button
                      type="button"
                      size="sm"
                      variant={editorTab === 'edit' ? 'default' : 'outline'}
                      onClick={() => setEditorTab('edit')}
                      className="h-8 text-xs font-semibold"
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Soạn thảo
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={editorTab === 'preview' ? 'default' : 'outline'}
                      onClick={() => setEditorTab('preview')}
                      className="h-8 text-xs font-semibold"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Xem trước A4
                    </Button>
                  </div>
                </DialogHeader>

                <form onSubmit={handleSaveTemplate} className="flex-1 flex flex-col overflow-hidden pt-3 space-y-3">
                  {/* Top settings bar */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pb-3 border-b border-border shrink-0">
                    <div className="sm:col-span-5 space-y-1">
                      <Label className="text-xs font-bold text-ink uppercase tracking-wider">Tên mẫu hợp đồng</Label>
                      <Input 
                        value={templateName} 
                        onChange={(e) => setTemplateName(e.target.value)} 
                        required 
                        placeholder="VD: Hợp đồng đặt cọc phòng trọ chuẩn A4..."
                        className="h-9 text-sm font-semibold rounded-lg border-border focus-visible:ring-accent" 
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-xs font-bold text-ink uppercase tracking-wider">Loại hợp đồng</Label>
                      <select 
                        value={templateType} 
                        onChange={(e) => setTemplateType(e.target.value as any)}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-white text-ink text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="deposit">Hợp đồng đặt cọc</option>
                        <option value="rental">Hợp đồng thuê chính thức</option>
                        <option value="handover">Biên bản bàn giao phòng</option>
                        <option value="invoice">Bảng kê hóa đơn</option>
                        <option value="maintenance">Phiếu sửa chữa bảo trì</option>
                      </select>
                    </div>
                    <div className="sm:col-span-4 space-y-1">
                      <Label className="text-xs font-bold text-ink uppercase tracking-wider">Mẫu chuẩn có sẵn</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" className="w-full h-9 text-xs font-semibold justify-between border-dashed border-accent text-accent hover:bg-accent/5">
                            <Sparkles className="h-3.5 w-3.5 mr-1" /> Nạp mẫu chuẩn A4 ▾
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                          <DropdownMenuItem onClick={() => loadPreset('deposit_room')}>📄 HĐ Cọc phòng trọ (Mẫu 1)</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => loadPreset('deposit_building')}>🏠 HĐ Cọc thuê cả nhà (Mẫu 2)</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => loadPreset('deposit_notary')}>🏛️ HĐ Cọc thuê nhà (Mẫu 3 - Đền cọc x2 + Phí luật sư)</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => loadPreset('deposit_hcm')}>📋 HĐ Nhận cọc phòng trọ (Mẫu 4 PDF - Có Sổ đỏ + Phạt cam kết)</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => loadPreset('rental')}>📜 HĐ Thuê căn hộ chuẩn A4 (Mẫu cơ bản)</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => loadPreset('rental_official_2024')}>🏛️ HĐ Thuê nhà ở (Luật BĐS 2023 - Mẫu chuẩn Nghị định)</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => loadPreset('handover')}>📋 Biên bản bàn giao thiết bị</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => loadPreset('invoice')}>💳 Bảng kê hóa đơn tiền nhà</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => loadPreset('maintenance')}>🛠️ Phiếu sửa chữa bảo trì</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Body Content */}
                  {editorTab === 'edit' ? (
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden pt-1">
                      {/* Main Editor */}
                      <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-border bg-slate-100 p-2 rounded-xl gap-2 flex-wrap shrink-0">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant={editorMode === 'visual' ? 'default' : 'outline'}
                              onClick={() => setEditorMode('visual')}
                              className="h-7 text-xs font-semibold"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> Soạn thảo trực quan (WYSIWYG)
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={editorMode === 'code' ? 'default' : 'outline'}
                              onClick={() => setEditorMode('code')}
                              className="h-7 text-xs font-semibold"
                            >
                              <Code className="h-3.5 w-3.5 mr-1" /> Mã HTML (Dev)
                            </Button>
                          </div>
                          {editorMode === 'visual' && (
                            <div className="flex items-center gap-1">
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-slate-200" onClick={() => document.execCommand('bold')} title="In đậm (Bold)">
                                <Bold className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-slate-200" onClick={() => document.execCommand('italic')} title="In nghiêng (Italic)">
                                <Italic className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-slate-200" onClick={() => document.execCommand('underline')} title="Gạch chân (Underline)">
                                <Underline className="h-3.5 w-3.5" />
                              </Button>
                              <div className="h-4 w-px bg-slate-300 mx-1" />
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-slate-200" onClick={() => document.execCommand('justifyLeft')} title="Căn trái">
                                <AlignLeft className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-slate-200" onClick={() => document.execCommand('justifyCenter')} title="Căn giữa">
                                <AlignCenter className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-slate-200" onClick={() => document.execCommand('justifyRight')} title="Căn phải">
                                <AlignRight className="h-3.5 w-3.5" />
                              </Button>
                              <div className="h-4 w-px bg-slate-300 mx-1" />
                              <Button type="button" size="sm" variant="outline" className="h-7 text-[11px] px-2 font-semibold bg-white hover:bg-slate-50" onClick={() => setTemplateContent(prev => prev + ' .................................... ')}>
                                + Thêm dấu .....
                              </Button>
                            </div>
                          )}
                        </div>

                        {editorMode === 'visual' ? (
                          <div 
                            contentEditable
                            suppressContentEditableWarning
                            onInput={(e) => setTemplateContent(e.currentTarget.innerHTML)}
                            className="flex-1 w-full bg-white p-6 sm:p-8 rounded-xl border border-slate-300 shadow-sm overflow-y-auto prose max-w-none text-sm text-black leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent min-h-[300px]"
                            dangerouslySetInnerHTML={{ __html: templateContent }}
                          />
                        ) : (
                          <Textarea 
                            value={templateContent} 
                            onChange={(e) => setTemplateContent(e.target.value)} 
                            placeholder="Nhập nội dung mã văn bản hợp đồng..."
                            className="flex-1 w-full font-mono text-xs leading-relaxed p-3.5 rounded-xl border border-border focus-visible:ring-accent bg-slate-50/50 resize-none overflow-y-auto min-h-[300px]" 
                          />
                        )}
                      </div>

                      {/* Side panel variables */}
                      <div className="lg:col-span-4 flex flex-col h-full overflow-hidden border border-border rounded-xl p-3 bg-slate-50">
                        <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-2 shrink-0 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-accent" /> Thẻ biến tự động (Click chèn)
                        </h4>
                        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                          {/* Bên A */}
                          <div>
                            <p className="text-[11px] font-bold text-accent uppercase tracking-wider mb-1">👤 Bên A (BQL / Chủ nhà)</p>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { tag: '{PARTY_A_NAME}', label: 'Tên Bên A' },
                                { tag: '{PARTY_A_DOB}', label: 'Ngày sinh' },
                                { tag: '{PARTY_A_ID_CARD}', label: 'CCCD' },
                                { tag: '{PARTY_A_ID_DATE}', label: 'Ngày cấp' },
                                { tag: '{PARTY_A_ID_PLACE}', label: 'Nơi cấp' },
                                { tag: '{PARTY_A_PHONE}', label: 'SĐT' },
                                { tag: '{PARTY_A_ADDRESS}', label: 'Địa chỉ' },
                              ].map((v) => (
                                <button
                                  key={v.tag}
                                  type="button"
                                  onClick={() => insertVariableTag(v.tag)}
                                  className="px-2 py-1 bg-white border border-border hover:border-accent hover:text-accent rounded text-[11px] font-medium text-ink transition-colors shadow-2xs"
                                >
                                  + {v.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Bên B */}
                          <div>
                            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-1">👤 Bên B (Khách thuê)</p>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { tag: '{PARTY_B_NAME}', label: 'Tên Bên B' },
                                { tag: '{PARTY_B_DOB}', label: 'Ngày sinh' },
                                { tag: '{PARTY_B_ID_CARD}', label: 'CCCD' },
                                { tag: '{PARTY_B_ID_DATE}', label: 'Ngày cấp' },
                                { tag: '{PARTY_B_ID_PLACE}', label: 'Nơi cấp' },
                                { tag: '{PARTY_B_PHONE}', label: 'SĐT' },
                                { tag: '{PARTY_B_ADDRESS}', label: 'Thường trú' },
                                { tag: '{PARTY_B_TAX_CODE}', label: 'Mã số thuế' },
                                { tag: '{PARTY_B_BANK_ACCOUNT}', label: 'STK Ngân hàng' },
                              ].map((v) => (
                                <button
                                  key={v.tag}
                                  type="button"
                                  onClick={() => insertVariableTag(v.tag)}
                                  className="px-2 py-1 bg-white border border-border hover:border-indigo-500 hover:text-indigo-600 rounded text-[11px] font-medium text-ink transition-colors shadow-2xs"
                                >
                                  + {v.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Phòng & Tòa nhà */}
                          <div>
                            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">🏠 Phòng & Tòa nhà</p>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { tag: '{ROOM_CODE}', label: 'Mã phòng' },
                                { tag: '{BUILDING_NAME}', label: 'Tên tòa' },
                                { tag: '{BUILDING_ADDRESS}', label: 'Địa chỉ tòa' },
                                { tag: '{TOTAL_AREA}', label: 'Tổng diện tích' },
                                { tag: '{BUILDING_AREA}', label: 'DT xây dựng' },
                                { tag: '{TOTAL_ROOMS}', label: 'Số phòng' },
                                { tag: '{TENANT_COUNT}', label: 'Số người ở' },
                              ].map((v) => (
                                <button
                                  key={v.tag}
                                  type="button"
                                  onClick={() => insertVariableTag(v.tag)}
                                  className="px-2 py-1 bg-white border border-border hover:border-emerald-500 hover:text-emerald-600 rounded text-[11px] font-medium text-ink transition-colors shadow-2xs"
                                >
                                  + {v.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Tài chính */}
                          <div>
                            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-1">💰 Giá cả & Cọc</p>
                            <div className="flex flex-wrap gap-1">
                              {[
                                { tag: '{RENT_PRICE}', label: 'Giá thuê' },
                                { tag: '{RENT_PRICE_WORDS}', label: 'Giá (chữ)' },
                                { tag: '{DEPOSIT_AMOUNT}', label: 'Tiền cọc' },
                                { tag: '{DEPOSIT_AMOUNT_WORDS}', label: 'Cọc (chữ)' },
                                { tag: '{DEADLINE_SIGN_DATE}', label: 'Hạn ký HĐ' },
                                { tag: '{START_DATE}', label: 'Ngày bắt đầu' },
                                { tag: '{LEASE_DURATION_MONTHS}', label: 'Số tháng' },
                              ].map((v) => (
                                <button
                                  key={v.tag}
                                  type="button"
                                  onClick={() => insertVariableTag(v.tag)}
                                  className="px-2 py-1 bg-white border border-border hover:border-amber-500 hover:text-amber-600 rounded text-[11px] font-medium text-ink transition-colors shadow-2xs"
                                >
                                  + {v.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Live Preview Tab */
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 border border-border rounded-xl shadow-inner max-h-[600px]">
                      <div className="max-w-4xl mx-auto bg-white p-6 sm:p-10 border border-slate-200 rounded-lg shadow-sm">
                        <h4 className="text-xs font-bold text-ink uppercase tracking-wider mb-4 border-b border-border pb-2 flex items-center justify-between">
                          <span>Xem trước trực quan văn bản (Khổ A4)</span>
                          <Badge variant="outline" className="text-[10px] text-accent border-accent font-mono">LIVE PREVIEW</Badge>
                        </h4>
                        <div 
                          className="prose max-w-none text-sm text-slate-900 leading-relaxed [overflow-wrap:anywhere] break-words [&_*]:!text-slate-900 [&_p]:!text-slate-900 [&_span]:!text-slate-900 [&_h1]:!text-slate-900 [&_h2]:!text-slate-900 [&_h3]:!text-slate-900 [&_h4]:!text-slate-900 [&_div]:!text-slate-900 [&_td]:!text-slate-900 [&_th]:!text-slate-900 [&_li]:!text-slate-900 [&_strong]:!text-slate-900 [&_b]:!text-slate-900"
                          dangerouslySetInnerHTML={{ __html: formatTemplateForPreview(templateContent) || '<p class="text-ink-muted italic">Chưa có nội dung mẫu...</p>' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="shrink-0 pt-3 border-t border-border flex items-center justify-between">
                    <p className="text-xs text-ink-muted hidden sm:block">Các mẫu được lưu sẽ tự động được áp dụng khi xuất Hợp đồng & In PDF cho công ty.</p>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-9 px-4 text-xs font-semibold">
                        Hủy
                      </Button>
                      <Button type="submit" className="bg-accent hover:bg-accent-500 text-white rounded-xl h-9 px-5 text-xs font-semibold shadow-sm" disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSignature className="h-4 w-4 mr-2" />} 
                        {editItem ? 'Cập nhật mẫu này' : 'Lưu mẫu mới'}
                      </Button>
                    </div>
                  </div>
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
        <DepositContractsTable
          filteredDeposits={filteredDeposits}
          depositsLoading={depositsLoading}
          depositSearch={depositSearch}
          setDepositSearch={setDepositSearch}
          statusLabels={statusLabels}
          profilesMap={profilesMap}
          role={role}
          pathPrefix={pathPrefix}
          formatDateDisplay={formatDateDisplay}
          handleLandlordConfirm={handleLandlordConfirm}
          handleStatusChange={handleStatusChange}
          removeDeposit={removeDeposit}
          setViewDeposit={setViewDeposit}
          setIsViewDepositOpen={setIsViewDepositOpen}
          setHandoverContract={setHandoverContract}
          setHandoverSourceType={setHandoverSourceType}
          setIsHandoverOpen={setIsHandoverOpen}
        />
      ) : activeTab === 'rentals' ? (
        <RentalContractsTable
          filteredRentals={filteredRentals}
          rentalsLoading={rentalsLoading}
          rentalSearch={rentalSearch}
          setRentalSearch={setRentalSearch}
          profilesMap={profilesMap}
          role={role}
          pathPrefix={pathPrefix}
          formatDateDisplay={formatDateDisplay}
          removeRental={removeRental}
          setViewRental={setViewRental}
          setIsViewRentalOpen={setIsViewRentalOpen}
          setHandoverContract={setHandoverContract}
          setHandoverSourceType={setHandoverSourceType}
          setIsHandoverOpen={setIsHandoverOpen}
        />
      ) : activeTab === 'archived' ? (
        <ArchivedContractsTable
          filteredArchived={filteredArchived}
          archivedSearch={archivedSearch}
          setArchivedSearch={setArchivedSearch}
          pathPrefix={pathPrefix}
          setViewDeposit={setViewDeposit}
          setIsViewDepositOpen={setIsViewDepositOpen}
          setViewRental={setViewRental}
          setIsViewRentalOpen={setIsViewRentalOpen}
        />
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
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs font-bold rounded-lg gap-1 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 shadow-2xs"
                              onClick={() => handlePrintTemplate(item)}
                              title="In / Export PDF mẫu hợp đồng A4"
                            >
                              <Printer className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>In mẫu A4</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              onClick={() => openViewTemplate(item)}
                              title="Xem chi tiết mẫu"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              <span>Xem</span>
                            </Button>
                            {role !== 'sales_agent' && (
                              <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => openEditTemplate(item)} title="Chỉnh sửa">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50" onClick={() => { if (confirm('Bạn có chắc muốn xóa mẫu này?')) removeTemplate(item.id); }} title="Xóa mẫu">
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
        <DialogContent className="max-w-4xl w-[94vw] sm:w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-border bg-white dark:bg-zinc-900 shadow-2xl z-50">
          <DialogHeader className="shrink-0 p-4 sm:p-5 pr-12 border-b border-border bg-white dark:bg-zinc-900 relative z-10">
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-ink text-base sm:text-lg font-bold font-heading">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent shrink-0" />
                <span>Chi tiết Hợp đồng Đặt cọc</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs text-slate-800 bg-slate-100 border-slate-300 w-fit">
                #{viewDeposit?.contract_code}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {viewDeposit && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs sm:text-sm text-ink-muted">
              {/* Thông tin chung */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-zinc-800/60 p-3.5 sm:p-4 rounded-xl border border-border">
                <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-lg border border-slate-200/80 dark:border-zinc-700">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Mã hợp đồng:</span>
                  <span className="font-bold text-ink text-xs sm:text-sm font-mono mt-0.5 block">{viewDeposit.contract_code}</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-lg border border-slate-200/80 dark:border-zinc-700">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Trạng thái:</span>
                  <Badge className={`${statusLabels[viewDeposit.status]?.color || ''} border font-bold text-[9px] rounded-full uppercase tracking-wider mt-1`} variant="outline">
                    {statusLabels[viewDeposit.status]?.label || viewDeposit.status}
                  </Badge>
                </div>
                <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-lg border border-slate-200/80 dark:border-zinc-700">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Ngày lập HĐ:</span>
                  <span className="font-semibold text-ink text-xs sm:text-sm font-mono mt-0.5 block">{formatDateDisplay(viewDeposit.agreement_date)}</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-lg border border-slate-200/80 dark:border-zinc-700">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Nhân viên Sale:</span>
                  {(() => {
                    const agentId = viewDeposit.sales_agent_id || viewDeposit.created_by;
                    const saleProfile = agentId ? profilesMap.get(agentId) : null;
                    if (!saleProfile) return <span className="font-semibold text-ink text-xs block mt-0.5">Hệ thống</span>;
                    return (
                      <>
                        <span className="font-semibold text-ink text-xs block truncate mt-0.5">{saleProfile.full_name || '—'}</span>
                        <span className="text-ink-muted text-[10px] font-mono block">{saleProfile.phone || '—'}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Thông tin 2 bên */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2 p-3.5 sm:p-4 border rounded-xl bg-slate-50/50 dark:bg-zinc-800/30 border-border">
                  <h4 className="font-bold font-heading text-ink border-b border-border pb-2 flex items-center gap-1.5 uppercase text-xs tracking-wider">
                    <User className="h-4 w-4 text-accent" /> Bên Cho Thuê (Bên A)
                  </h4>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Họ và tên:</span>
                      <span className="font-semibold text-ink">{viewDeposit.party_a_name}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Số điện thoại:</span>
                      <span className="font-mono text-ink font-semibold">{viewDeposit.party_a_phone}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Ngày sinh:</span>
                      <span className="font-mono text-ink">{formatDateDisplay(viewDeposit.party_a_dob)}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Số CCCD:</span>
                      <span className="font-mono text-ink font-semibold">{viewDeposit.party_a_id_card || '—'}</span>
                    </div>
                    {viewDeposit.party_a_id_date && (
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-ink-muted font-medium">Ngày &amp; Nơi cấp:</span>
                        <span className="font-mono text-ink text-right">{formatDateDisplay(viewDeposit.party_a_id_date)} ({viewDeposit.party_a_id_place || '—'})</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start py-0.5">
                      <span className="text-ink-muted font-medium shrink-0">Địa chỉ:</span>
                      <span className="text-ink font-medium text-right ml-2">{viewDeposit.party_a_address || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 p-3.5 sm:p-4 border rounded-xl bg-slate-50/50 dark:bg-zinc-800/30 border-border">
                  <h4 className="font-bold font-heading text-ink border-b border-border pb-2 flex items-center gap-1.5 uppercase text-xs tracking-wider">
                    <User className="h-4 w-4 text-accent" /> Bên Đặt Cọc (Bên B)
                  </h4>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Họ và tên:</span>
                      <span className="font-semibold text-ink">{viewDeposit.party_b_name}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Số điện thoại:</span>
                      <span className="font-mono text-ink font-semibold">{viewDeposit.party_b_phone}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Ngày sinh:</span>
                      <span className="font-mono text-ink">{formatDateDisplay(viewDeposit.party_b_dob)}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Số CCCD:</span>
                      <span className="font-mono text-ink font-semibold">{viewDeposit.party_b_id_card || '—'}</span>
                    </div>
                    {viewDeposit.party_b_id_date && (
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-ink-muted font-medium">Ngày &amp; Nơi cấp:</span>
                        <span className="font-mono text-ink text-right">{formatDateDisplay(viewDeposit.party_b_id_date)} ({viewDeposit.party_b_id_place || '—'})</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start py-0.5">
                      <span className="text-ink-muted font-medium shrink-0">Địa chỉ:</span>
                      <span className="text-ink font-medium text-right ml-2">{viewDeposit.party_b_address || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin phòng & điều khoản đặt cọc */}
              <div className="space-y-3 p-3.5 sm:p-4 border rounded-xl bg-white dark:bg-zinc-800/80 border-border">
                <h4 className="font-bold font-heading text-ink border-b border-border pb-2 flex items-center gap-1.5 uppercase text-xs tracking-wider">
                  <Building className="h-4 w-4 text-accent" /> Thông tin phòng đặt cọc &amp; Điều khoản
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2.5 gap-x-4">
                  <div className="sm:col-span-2 md:col-span-3">
                    <span className="text-ink-muted text-xs font-medium block">Phòng cọc giữ chỗ:</span>
                    <span className="font-bold text-accent text-sm">Phòng {viewDeposit.rooms?.code || '---'} - {viewDeposit.rooms?.buildings?.name || 'Khu vực khác'}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Giá thuê thỏa thuận:</span>
                    <span className="font-bold font-mono text-ink">{Number(viewDeposit.rent_price).toLocaleString('vi-VN')}đ/tháng</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Số tiền đặt cọc giữ chỗ:</span>
                    <span className="font-bold font-mono text-accent">{Number(viewDeposit.deposit_amount).toLocaleString('vi-VN')}đ</span>
                  </div>
                  {viewDeposit.deposit_terms && (
                    <div>
                      <span className="text-ink-muted text-xs font-medium block">Thời hạn cọc / cọc hợp đồng:</span>
                      <span className="text-ink font-semibold">{viewDeposit.deposit_terms}</span>
                    </div>
                  )}
                  {viewDeposit.commission_rate_raw && (
                    <div>
                      <span className="text-ink-muted text-xs font-medium block">Hoa hồng:</span>
                      <span className="font-semibold text-emerald-600">
                        {viewDeposit.commission_rate_raw} ({(viewDeposit.commission_amount !== undefined && viewDeposit.commission_amount !== null && Number(viewDeposit.commission_amount) > 0
                          ? Number(viewDeposit.commission_amount)
                          : calculateCommissionAmount(viewDeposit.rooms?.price || 0, viewDeposit.rooms?.rose || '', viewDeposit.lease_duration_months)
                        ).toLocaleString('vi-VN')}đ)
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Hạn ký HĐ chính thức:</span>
                    <span className="font-semibold text-danger font-mono">{formatDateDisplay(viewDeposit.deadline_sign_contract)}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Tiền điện:</span>
                    <span className="font-mono text-ink font-semibold">{Number(viewDeposit.electricity_price).toLocaleString('vi-VN')}đ/số</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Tiền nước:</span>
                    <span className="text-ink font-semibold">{viewDeposit.water_price}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Phí dịch vụ:</span>
                    <span className="text-ink font-semibold">{viewDeposit.service_price}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Mạng internet:</span>
                    <span className="text-ink font-semibold">{viewDeposit.other_services?.internet || 'Chưa thỏa thuận'}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Phí giặt sấy:</span>
                    <span className="text-ink font-semibold">{viewDeposit.other_services?.laundry || 'Chưa thỏa thuận'}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Số người đăng ký:</span>
                    <span className="text-ink font-semibold">{viewDeposit.tenant_count} người</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Thời hạn dự kiến:</span>
                    <span className="text-ink font-semibold">{viewDeposit.lease_duration_months} tháng</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Báo trước khi đòi nhà:</span>
                    <span className="text-ink font-semibold">{viewDeposit.termination_notice_days} ngày</span>
                  </div>
                  {viewDeposit.room_repair_support_date && (
                    <div>
                      <span className="text-ink-muted text-xs font-medium block">Hạn hỗ trợ sửa phòng:</span>
                      <span className="font-mono">{formatDateDisplay(viewDeposit.room_repair_support_date)}</span>
                    </div>
                  )}
                  <div className="sm:col-span-2 md:col-span-3">
                    <span className="text-ink-muted text-xs font-medium block">Phương thức thanh toán:</span>
                    <span className="text-ink">{viewDeposit.payment_method}</span>
                  </div>
                </div>
              </div>

              {/* Thông tin thanh toán ngân hàng */}
              <div className="space-y-3 p-3.5 sm:p-4 border rounded-xl bg-slate-50 dark:bg-zinc-800/40 border-border">
                <h4 className="font-bold font-heading text-ink border-b border-border pb-2 flex items-center gap-1.5 uppercase text-xs tracking-wider">
                  <Landmark className="h-4 w-4 text-accent" /> Thông tin tài khoản nhận cọc
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2.5 gap-x-4">
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Ngân hàng:</span>
                    <span className="text-ink font-semibold">{viewDeposit.bank_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Số tài khoản:</span>
                    <span className="text-ink font-mono font-semibold">{viewDeposit.bank_account_number || '—'}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Chủ tài khoản:</span>
                    <span className="text-ink font-semibold uppercase">{viewDeposit.bank_account_owner || '—'}</span>
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <span className="text-ink-muted text-xs font-medium block">Nội dung chuyển khoản mẫu:</span>
                    <span className="font-mono bg-white dark:bg-zinc-800 px-2.5 py-1 border border-border rounded-lg text-ink text-xs block mt-1 break-all">
                      {viewDeposit.transfer_content_template || '—'}
                    </span>
                  </div>
                  {viewDeposit.note && (
                    <div className="sm:col-span-2 md:col-span-3">
                      <span className="text-ink-muted text-xs font-medium block">Ghi chú thêm:</span>
                      <span className="text-ink">{viewDeposit.note}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ảnh minh chứng */}
              {(viewDeposit.lead_view_image_url || viewDeposit.transfer_proof_url) && (
                <div className="space-y-3 p-3.5 sm:p-4 border rounded-xl bg-white dark:bg-zinc-800/80 border-border">
                  <h4 className="font-bold font-heading text-ink border-b border-border pb-2 uppercase text-xs tracking-wider">📸 Ảnh minh chứng giao dịch</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {viewDeposit.lead_view_image_url && (
                      <div className="space-y-1">
                        <span className="text-ink-muted block text-xs font-medium">Ảnh dẫn khách xem phòng:</span>
                        <a href={viewDeposit.lead_view_image_url} target="_blank" rel="noopener noreferrer" className="block border border-border rounded-xl overflow-hidden hover:opacity-90 transition-opacity relative w-full h-48 sm:h-56">
                          <Image src={viewDeposit.lead_view_image_url} alt="Ảnh dẫn khách" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                        </a>
                      </div>
                    )}
                    {viewDeposit.transfer_proof_url && (
                      <div className="space-y-1">
                        <span className="text-ink-muted block text-xs font-medium">Ảnh hóa đơn chuyển khoản đặt cọc:</span>
                        <a href={viewDeposit.transfer_proof_url} target="_blank" rel="noopener noreferrer" className="block border border-border rounded-xl overflow-hidden hover:opacity-90 transition-opacity relative w-full h-48 sm:h-56">
                          <Image src={viewDeposit.transfer_proof_url} alt="Ảnh chuyển khoản cọc" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Landlord Confirmation Button inside Modal */}
              {role === 'landlord' && viewDeposit.status === 'active' && (
                <div className="flex justify-end pt-3 border-t border-border mt-3">
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2 h-10 flex items-center gap-2 rounded-xl text-xs sm:text-sm w-full sm:w-auto"
                    onClick={() => handleLandlordConfirm(viewDeposit.id)}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Xác nhận đã nhận đặt cọc
                  </Button>
                </div>
              )}

              {/* Biên bản bàn giao phòng & Lập HĐ thuê (Chỉ Admin/Manager/Landlord mới thao tác) */}
              <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-3 border-t border-border mt-3">
                <Button 
                  variant="outline"
                  className="border-slate-300 dark:border-zinc-700 text-ink font-semibold h-10 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm w-full sm:w-auto"
                  asChild
                >
                  <Link href={`${pathPrefix}/contracts/${viewDeposit.id}/print`} target="_blank">
                    <Printer className="h-4 w-4 text-slate-600" />
                    In / Tải PDF Hợp đồng
                  </Link>
                </Button>
                {role !== 'sales_agent' && ['confirmed', 'signed', 'deposited', 'active'].includes(viewDeposit.status) && (
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 h-10 flex items-center justify-center gap-2 rounded-xl shadow-xs text-xs sm:text-sm w-full sm:w-auto"
                    onClick={() => {
                      setIsViewDepositOpen(false);
                      router.push(`${pathPrefix}/contracts/create-rental?deposit_id=${viewDeposit.id}`);
                    }}
                  >
                    <FileSignature className="h-4 w-4" />
                    Lập Hợp Đồng Thuê Chính Thức
                  </Button>
                )}
                {role !== 'sales_agent' && ['confirmed', 'signed', 'deposited', 'active', 'converted', 'refunded'].includes(viewDeposit.status) && (
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 h-10 flex items-center justify-center gap-2 rounded-xl shadow-xs text-xs sm:text-sm w-full sm:w-auto"
                    onClick={() => {
                      setHandoverSourceType('deposit');
                      setHandoverContract(viewDeposit);
                      setIsHandoverOpen(true);
                    }}
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Biên bản bàn giao phòng
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog chi tiết hợp đồng thuê */}
      <Dialog open={isViewRentalOpen} onOpenChange={setIsViewRentalOpen}>
        <DialogContent className="max-w-4xl w-[94vw] sm:w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-border bg-white dark:bg-zinc-900 shadow-2xl z-50">
          <DialogHeader className="shrink-0 p-4 sm:p-5 pr-12 border-b border-border bg-white dark:bg-zinc-900 relative z-10">
            <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 text-ink text-base sm:text-lg font-bold font-heading">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent shrink-0" />
                <span>Chi tiết Hợp đồng Thuê chính thức</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs text-emerald-800 bg-emerald-50 border-emerald-300 w-fit">
                #{viewRental?.contract_code}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          {viewRental && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs sm:text-sm text-ink-muted">
              {/* Thông tin chung */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-zinc-800/60 p-3.5 sm:p-4 rounded-xl border border-border">
                <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-lg border border-slate-200/80 dark:border-zinc-700">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Mã hợp đồng:</span>
                  <span className="font-bold text-ink text-xs sm:text-sm font-mono mt-0.5 block">{viewRental.contract_code}</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-lg border border-slate-200/80 dark:border-zinc-700">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Trạng thái:</span>
                  <Badge className="bg-green-50 text-green-700 border-green-250 border font-bold text-[9px] rounded-full uppercase tracking-wider mt-1" variant="outline">
                    {viewRental.status === 'active' ? 'Hiệu lực' : viewRental.status}
                  </Badge>
                </div>
                <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-lg border border-slate-200/80 dark:border-zinc-700">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Thời hạn:</span>
                  <span className="font-semibold text-ink text-xs font-mono block mt-0.5">
                    {formatDateDisplay(viewRental.start_date)} - {formatDateDisplay(viewRental.end_date)}
                  </span>
                </div>
                <div className="p-2.5 bg-white dark:bg-zinc-800 rounded-lg border border-slate-200/80 dark:border-zinc-700">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">Nhân viên Sale:</span>
                  {(() => {
                    const agentId = viewRental.sales_agent_id || viewRental.created_by;
                    const saleProfile = agentId ? profilesMap.get(agentId) : null;
                    if (!saleProfile) return <span className="font-semibold text-ink text-xs block mt-0.5">Hệ thống</span>;
                    return (
                      <>
                        <span className="font-semibold text-ink text-xs block truncate mt-0.5">{saleProfile.full_name || '—'}</span>
                        <span className="text-ink-muted text-[10px] font-mono block">{saleProfile.phone || '—'}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Thông tin 2 bên */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2 p-3.5 sm:p-4 border rounded-xl bg-slate-50/50 dark:bg-zinc-800/30 border-border">
                  <h4 className="font-bold font-heading text-ink border-b border-border pb-2 flex items-center gap-1.5 uppercase text-xs tracking-wider">
                    <User className="h-4 w-4 text-accent" /> Bên Cho Thuê (Bên A)
                  </h4>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Họ và tên:</span>
                      <span className="font-semibold text-ink">{viewRental.party_a_name}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Số điện thoại:</span>
                      <span className="font-mono text-ink font-semibold">{viewRental.party_a_phone}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Ngày sinh:</span>
                      <span className="font-mono text-ink">{formatDateDisplay(viewRental.party_a_dob)}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Số CCCD:</span>
                      <span className="font-mono text-ink font-semibold">{viewRental.party_a_id_card || '—'}</span>
                    </div>
                    {viewRental.party_a_id_date && (
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-ink-muted font-medium">Ngày &amp; Nơi cấp:</span>
                        <span className="font-mono text-ink text-right">{formatDateDisplay(viewRental.party_a_id_date)} ({viewRental.party_a_id_place || '—'})</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start py-0.5">
                      <span className="text-ink-muted font-medium shrink-0">Địa chỉ:</span>
                      <span className="text-ink font-medium text-right ml-2">{viewRental.party_a_address || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 p-3.5 sm:p-4 border rounded-xl bg-slate-50/50 dark:bg-zinc-800/30 border-border">
                  <h4 className="font-bold font-heading text-ink border-b border-border pb-2 flex items-center gap-1.5 uppercase text-xs tracking-wider">
                    <User className="h-4 w-4 text-accent" /> Bên Thuê Phòng (Bên B)
                  </h4>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Họ và tên:</span>
                      <span className="font-semibold text-ink">{viewRental.party_b_name}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Số điện thoại:</span>
                      <span className="font-mono text-ink font-semibold">{viewRental.party_b_phone}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Ngày sinh:</span>
                      <span className="font-mono text-ink">{formatDateDisplay(viewRental.party_b_dob)}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-ink-muted font-medium">Số CCCD:</span>
                      <span className="font-mono text-ink font-semibold">{viewRental.party_b_id_card || '—'}</span>
                    </div>
                    {viewRental.party_b_id_date && (
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-ink-muted font-medium">Ngày &amp; Nơi cấp:</span>
                        <span className="font-mono text-ink text-right">{formatDateDisplay(viewRental.party_b_id_date)} ({viewRental.party_b_id_place || '—'})</span>
                      </div>
                    )}
                    <div className="flex justify-between items-start py-0.5">
                      <span className="text-ink-muted font-medium shrink-0">Địa chỉ:</span>
                      <span className="text-ink font-medium text-right ml-2">{viewRental.party_b_address || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông tin phòng & điều khoản thuê */}
              <div className="space-y-3 p-3.5 sm:p-4 border rounded-xl bg-white dark:bg-zinc-800/80 border-border">
                <h4 className="font-bold font-heading text-ink border-b border-border pb-2 flex items-center gap-1.5 uppercase text-xs tracking-wider">
                  <Building className="h-4 w-4 text-accent" /> Thông tin phòng &amp; Chi tiết thuê
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-2.5 gap-x-4">
                  <div className="sm:col-span-2 md:col-span-3">
                    <span className="text-ink-muted text-xs font-medium block">Phòng thuê chính thức:</span>
                    <span className="font-bold text-accent text-sm">Phòng {viewRental.rooms?.code || '---'} - {viewRental.rooms?.buildings?.name || 'Khu vực khác'}</span>
                  </div>
                  {viewRental.sign_location && (
                    <div className="sm:col-span-2 md:col-span-3">
                      <span className="text-ink-muted text-xs font-medium block">Nơi ký hợp đồng:</span>
                      <span className="text-ink">{viewRental.sign_location}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Giá thuê hàng tháng:</span>
                    <span className="font-bold font-mono text-ink">{Number(viewRental.rent_price).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Số tiền cọc đã đóng:</span>
                    <span className="font-bold font-mono text-accent">{Number(viewRental.deposit_amount).toLocaleString('vi-VN')}đ</span>
                  </div>
                  {(viewRental.commission_rate_raw || viewRental.rooms?.rose) && (
                    <div>
                      <span className="text-ink-muted text-xs font-medium block">Hoa hồng Sale:</span>
                      <span className="font-bold font-mono text-emerald-600">
                        {(viewRental.commission_amount !== undefined && viewRental.commission_amount !== null && Number(viewRental.commission_amount) > 0
                          ? Number(viewRental.commission_amount)
                          : calculateCommissionAmount(viewRental.rooms?.price || 0, viewRental.rooms?.rose || '', getContractTermMonths(viewRental.start_date, viewRental.end_date))
                        ).toLocaleString('vi-VN')}đ ({viewRental.commission_rate_raw || viewRental.rooms?.rose})
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Ngày đóng tiền:</span>
                    <span className="text-ink font-semibold">Ngày {viewRental.payment_day_of_month} hàng tháng</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Chu kỳ đóng tiền:</span>
                    <span className="text-ink font-semibold">{viewRental.billing_cycle_months} tháng/lần</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Ngày bắt đầu:</span>
                    <span className="font-mono text-ink">{formatDateDisplay(viewRental.start_date)}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Ngày kết thúc:</span>
                    <span className="font-mono text-ink">{formatDateDisplay(viewRental.end_date)}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Ngày bàn giao:</span>
                    <span className="font-mono text-ink">{formatDateDisplay(viewRental.handover_date)}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Tiền điện:</span>
                    <span className="font-mono text-ink font-semibold">{Number(viewRental.electricity_price).toLocaleString('vi-VN')}đ/số</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Tiền nước:</span>
                    <span className="text-ink font-semibold">{viewRental.water_price}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Phí dịch vụ:</span>
                    <span className="text-ink font-semibold">{viewRental.service_price}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Mạng internet:</span>
                    <span className="text-ink font-semibold">{viewRental.other_services?.internet || 'Chưa thỏa thuận'}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Phí giặt sấy:</span>
                    <span className="text-ink font-semibold">{viewRental.other_services?.laundry || 'Chưa thỏa thuận'}</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Số người ở thực tế:</span>
                    <span className="text-ink font-semibold">{viewRental.tenant_count} người</span>
                  </div>
                  <div>
                    <span className="text-ink-muted text-xs font-medium block">Báo trước khi hủy HĐ:</span>
                    <span className="text-ink font-semibold">{viewRental.termination_notice_days} ngày</span>
                  </div>
                  <div className="sm:col-span-2 md:col-span-3">
                    <span className="text-ink-muted text-xs font-medium block">Phương thức thanh toán:</span>
                    <span className="text-ink">{viewRental.payment_method}</span>
                  </div>
                  {viewRental.note && (
                    <div className="sm:col-span-2 md:col-span-3">
                      <span className="text-ink-muted text-xs font-medium block">Ghi chú &amp; Thỏa thuận thêm:</span>
                      <span className="text-ink text-xs block bg-slate-50 dark:bg-zinc-800 p-2.5 border border-border rounded-lg mt-1 break-words">
                        {viewRental.note}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Cập nhật trạng thái hợp đồng (Chỉ Admin/Manager) */}
              {role !== 'sales_agent' && role !== 'landlord' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border mt-3">
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

              <div className="flex flex-col sm:flex-row justify-end gap-2.5 pt-3 border-t border-border mt-3">
                <Button 
                  variant="outline"
                  className="border-slate-300 dark:border-zinc-700 text-ink font-semibold h-10 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm w-full sm:w-auto"
                  asChild
                >
                  <Link href={`${pathPrefix}/contracts/${viewRental.id}/print`} target="_blank">
                    <Printer className="h-4 w-4 text-slate-600" />
                    In / Tải PDF Hợp đồng
                  </Link>
                </Button>
                {role !== 'sales_agent' && (
                  <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold h-10 px-4 flex items-center justify-center gap-2 text-xs sm:text-sm w-full sm:w-auto"
                    onClick={() => {
                      setHandoverSourceType('rental');
                      setHandoverContract(viewRental);
                      setIsHandoverOpen(true);
                    }}
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    Biên bản bàn giao phòng
                  </Button>
                )}
                {role !== 'sales_agent' && role !== 'landlord' && (
                  <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold h-10 px-4 text-xs sm:text-sm w-full sm:w-auto">
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
        <DialogContent className="max-w-4xl w-[92vw] sm:w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-5 sm:p-7 max-h-[90vh] flex flex-col text-slate-900 dark:text-slate-100">
          <DialogHeader className="shrink-0 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-heading font-bold text-lg sm:text-xl">
              <FileText className="h-5.5 w-5.5 text-indigo-600 dark:text-indigo-400" />Chi tiết mẫu hợp đồng
            </DialogTitle>
            {viewItem && (
              <Button
                onClick={() => handlePrintTemplate(viewItem)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-4 text-xs rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="h-4 w-4 text-amber-300" />
                <span>In / Tải PDF mẫu A4 này</span>
              </Button>
            )}
          </DialogHeader>
          {viewItem && (
            <div className="flex-1 overflow-y-auto space-y-4 pt-3 pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div><span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider block">Tên mẫu:</span> <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm block mt-0.5">{viewItem.name}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider block">Loại hợp đồng:</span> <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase font-mono text-xs sm:text-sm block mt-0.5">{viewItem.type}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider block">Ngày tạo:</span> <span className="font-mono text-slate-900 dark:text-slate-100 text-xs sm:text-sm block mt-0.5">{viewItem.created_at.split('T')[0]}</span></div>
                <div><span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] uppercase tracking-wider block">Cập nhật:</span> <span className="font-mono text-slate-900 dark:text-slate-100 text-xs sm:text-sm block mt-0.5">{viewItem.updated_at.split('T')[0]}</span></div>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-6 bg-slate-100 dark:bg-slate-950 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Xem trước nội dung mẫu văn bản (Định dạng A4 chuẩn)</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintTemplate(viewItem)}
                    className="h-8 text-xs font-bold rounded-lg gap-1.5 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900"
                  >
                    <Printer className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>In mẫu ngay</span>
                  </Button>
                </div>
                <div className="bg-white text-slate-900 shadow-xl rounded-lg p-6 sm:p-10 border border-slate-300 mx-auto max-w-3xl">
                  <div 
                    className="prose max-w-none text-sm text-slate-900 leading-relaxed [overflow-wrap:anywhere] break-words [&_*]:!text-slate-900 [&_p]:!text-slate-900 [&_span]:!text-slate-900 [&_h1]:!text-slate-900 [&_h2]:!text-slate-900 [&_h3]:!text-slate-900 [&_h4]:!text-slate-900 [&_div]:!text-slate-900 [&_td]:!text-slate-900 [&_th]:!text-slate-900 [&_li]:!text-slate-900 [&_strong]:!text-slate-900 [&_b]:!text-slate-900"
                    dangerouslySetInnerHTML={{ __html: formatTemplateForPreview(viewItem.content || '') }}
                  />
                </div>
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

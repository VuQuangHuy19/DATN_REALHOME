'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, Save, RotateCcw, Printer, Sparkles, CheckCircle2,
  HelpCircle, Eye, Code, FileCheck, Wrench, Receipt, ClipboardList, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  getContractTemplate,
  saveContractTemplate,
  getDefaultTemplateContent,
  type ContractTemplateItem
} from '@/src/features/finance/services/contract_templates';

const TEMPLATE_TYPES = [
  { id: 'deposit', label: 'Hợp đồng đặt cọc', icon: FileCheck, desc: 'Mẫu thỏa thuận đặt cọc giữ chỗ phòng' },
  { id: 'rental', label: 'Hợp đồng thuê chính thức', icon: FileText, desc: 'Mẫu hợp đồng thuê căn hộ / phòng trọ chính thức' },
  { id: 'handover', label: 'Biên bản bàn giao', icon: ClipboardList, desc: 'Biên bản kiểm tra thiết bị & chỉ số điện nước' },
  { id: 'invoice', label: 'Phiếu hóa đơn tháng', icon: Receipt, desc: 'Phiếu bảng kê tiền nhà & dịch vụ điện nước' },
  { id: 'maintenance', label: 'Phiếu bảo trì sửa chữa', icon: Wrench, desc: 'Mẫu phiếu tiếp nhận & nghiệm thu bảo trì' },
] as const;

const AVAILABLE_TAGS = [
  { tag: '{PARTY_A_NAME}', label: 'Tên Bên A (Chủ nhà/BQL)' },
  { tag: '{PARTY_A_PHONE}', label: 'SĐT Bên A' },
  { tag: '{PARTY_A_ADDRESS}', label: 'Địa chỉ Bên A' },
  { tag: '{PARTY_A_ID_CARD}', label: 'Số CCCD Bên A' },
  { tag: '{PARTY_B_NAME}', label: 'Tên Bên B (Khách thuê)' },
  { tag: '{PARTY_B_PHONE}', label: 'SĐT Bên B' },
  { tag: '{PARTY_B_ID_CARD}', label: 'Số CCCD Bên B' },
  { tag: '{PARTY_B_ADDRESS}', label: 'Thường trú Bên B' },
  { tag: '{ROOM_CODE}', label: 'Mã phòng' },
  { tag: '{BUILDING_NAME}', label: 'Tên tòa nhà' },
  { tag: '{BUILDING_ADDRESS}', label: 'Địa chỉ tòa nhà' },
  { tag: '{RENT_PRICE}', label: 'Giá thuê hàng tháng' },
  { tag: '{DEPOSIT_AMOUNT}', label: 'Tiền đặt cọc' },
  { tag: '{ELECTRICITY_PRICE}', label: 'Đơn giá điện' },
  { tag: '{WATER_PRICE}', label: 'Đơn giá nước' },
  { tag: '{SERVICE_PRICE}', label: 'Phí dịch vụ chung' },
  { tag: '{AGREEMENT_DATE}', label: 'Ngày ký kết' },
  { tag: '{START_DATE}', label: 'Ngày bắt đầu thuê' },
  { tag: '{END_DATE}', label: 'Ngày hết hạn hợp đồng' },
];

export default function ContractTemplatesPage() {
  const { user, profile } = useAuth();
  const [activeType, setActiveType] = useState<ContractTemplateItem['type']>('rental');
  const [templateContent, setTemplateContent] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('preview');

  // Load template content when activeType changes
  useEffect(() => {
    async function loadTemplate() {
      setLoading(true);
      const companyId = profile?.company_id;
      const content = await getContractTemplate(companyId, activeType);
      const matchedType = TEMPLATE_TYPES.find((t) => t.id === activeType);
      setTemplateName(matchedType?.label || 'Mẫu hợp đồng');
      setTemplateContent(content);
      setLoading(false);
    }
    loadTemplate();
  }, [activeType, profile]);

  // Insert tag into editor
  const handleInsertTag = (tag: string) => {
    setTemplateContent((prev) => prev + ` ${tag} `);
    toast.info(`Đã chèn thẻ biến ${tag}`);
  };

  // Reset default
  const handleResetDefault = () => {
    const defaultContent = getDefaultTemplateContent(activeType);
    setTemplateContent(defaultContent);
    toast.success('Đã khôi phục về mẫu A4 mặc định!');
  };

  // Save template
  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveContractTemplate(
      activeType,
      templateName,
      templateContent,
      profile?.company_id
    );
    setIsSaving(false);
    if (success) {
      toast.success('Đã lưu mẫu hợp đồng A4 thành công!');
    } else {
      toast.error('Lỗi khi lưu mẫu hợp đồng');
    }
  };

  // Replace sample placeholders for preview
  const getSamplePreviewHTML = () => {
    return templateContent
      .replace(/{PARTY_A_NAME}/g, profile?.full_name || 'BÙI VĂN PHÚC (BQL REALHOME)')
      .replace(/{PARTY_A_PHONE}/g, '0987.022.829')
      .replace(/{PARTY_A_ADDRESS}/g, 'Số 124 Khương Trung, Thanh Xuân, Hà Nội')
      .replace(/{PARTY_A_ID_CARD}/g, '001200012345')
      .replace(/{PARTY_A_ID_PLACE}/g, 'Cục Cảnh sát QLHC về trật tự xã hội')
      .replace(/{PARTY_B_NAME}/g, 'NGUYỄN VĂN AN')
      .replace(/{PARTY_B_PHONE}/g, '0912.345.678')
      .replace(/{PARTY_B_ID_CARD}/g, '034200098765')
      .replace(/{PARTY_B_ID_PLACE}/g, 'Công an TP. Hà Nội')
      .replace(/{PARTY_B_ADDRESS}/g, 'Số 45 Nguyễn Trãi, Thanh Xuân, Hà Nội')
      .replace(/{ROOM_CODE}/g, 'CH-202')
      .replace(/{BUILDING_NAME}/g, 'RealHome Building B')
      .replace(/{BUILDING_ADDRESS}/g, 'Số 124 Khương Trung, Q. Thanh Xuân, Hà Nội')
      .replace(/{RENT_PRICE}/g, '8.500.000')
      .replace(/{DEPOSIT_AMOUNT}/g, '17.000.000')
      .replace(/{DEPOSIT_AMOUNT_WORDS}/g, 'Mười bảy triệu đồng chẵn')
      .replace(/{ELECTRICITY_PRICE}/g, '4.000')
      .replace(/{WATER_PRICE}/g, '35.000đ/m³')
      .replace(/{SERVICE_PRICE}/g, '150.000đ/tháng')
      .replace(/{AGREEMENT_DATE}/g, new Date().toLocaleDateString('vi-VN'))
      .replace(/{START_DATE}/g, '15/01/2026')
      .replace(/{END_DATE}/g, '15/01/2027')
      .replace(/{DEADLINE_SIGN_DATE}/g, '20/01/2026')
      .replace(/{TENANT_COUNT}/g, '2')
      .replace(/{LEASE_DURATION_MONTHS}/g, '12')
      .replace(/{CONTRACT_CODE}/g, 'HD-2026-001')
      .replace(/{ELECTRICITY_START}/g, '1420')
      .replace(/{WATER_START}/g, '85')
      .replace(/{PERIOD}/g, 'Tháng 07/2026')
      .replace(/{INVOICE_CODE}/g, 'INV-2026-07-002')
      .replace(/{RENT_AMOUNT}/g, '8.500.000')
      .replace(/{ELEC_OLD}/g, '1200')
      .replace(/{ELEC_NEW}/g, '1350')
      .replace(/{ELEC_USAGE}/g, '150')
      .replace(/{ELEC_AMOUNT}/g, '600.000')
      .replace(/{WATER_OLD}/g, '80')
      .replace(/{WATER_NEW}/g, '90')
      .replace(/{WATER_USAGE}/g, '10')
      .replace(/{WATER_AMOUNT}/g, '350.000')
      .replace(/{SERVICE_AMOUNT}/g, '150.000')
      .replace(/{TOTAL_AMOUNT}/g, '9.600.000')
      .replace(/{BANK_NAME}/g, 'MB Bank (Ngân hàng Quân Đội)')
      .replace(/{BANK_ACCOUNT}/g, '999988886666')
      .replace(/{BANK_OWNER}/g, 'BUI VAN PHUC')
      .replace(/{TRANSFER_MEMO}/g, 'REALHOME CH202 THANG 7')
      .replace(/{MAINTENANCE_ID}/g, 'BT-2026-042')
      .replace(/{CREATED_AT}/g, '24/07/2026')
      .replace(/{SENDER_NAME}/g, 'Nguyễn Văn An')
      .replace(/{SENDER_PHONE}/g, '0912.345.678')
      .replace(/{ISSUE_TITLE}/g, 'Vòi nước bồn rửa bị rỉ nước liên tục')
      .replace(/{PRIORITY}/g, 'Bình thường')
      .replace(/{ISSUE_DESCRIPTION}/g, 'Vòi nước ở bồn rửa mặt bị rỉ giọt liên tục gây lãng phí nước.')
      .replace(/{SOLUTION_NOTE}/g, 'Đã thay mới gioăng cao su và van xả.');
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-ink font-heading flex items-center gap-2">
            <FileText className="h-7 w-7 text-amber-600" />
            Tùy chỉnh Mẫu Hợp đồng &amp; Văn bản A4
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Thiết kế và tùy chỉnh mẫu in A4 cho Hợp đồng cọc, Thuê chính thức, Bàn giao, Hóa đơn và Bảo trì
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleResetDefault}
            className="rounded-xl border-slate-300 font-bold text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1 text-slate-600" />
            Khôi phục mẫu gốc
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-md text-xs px-4"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Lưu mẫu A4
          </Button>
        </div>
      </div>

      {/* Tabs chọn loại mẫu hợp đồng */}
      <Tabs value={activeType} onValueChange={(val) => setActiveType(val as any)} className="space-y-4">
        <TabsList className="bg-bg-subtle border border-border-subtle rounded-xl p-1 grid grid-cols-2 md:grid-cols-5 gap-1">
          {TEMPLATE_TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="rounded-lg text-xs font-bold py-2.5 data-[state=active]:bg-amber-600 data-[state=active]:text-white transition-all flex items-center justify-center gap-1.5"
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <Card className="border border-border-subtle">
          <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border-subtle">
            <div>
              <h2 className="text-base font-bold text-ink font-heading flex items-center gap-2">
                <span>Soạn thảo: {TEMPLATE_TYPES.find((t) => t.id === activeType)?.label}</span>
                <Badge className="bg-amber-100 text-amber-950 border-amber-400 text-[10px] font-bold">Khổ A4 Chuẩn</Badge>
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                {TEMPLATE_TYPES.find((t) => t.id === activeType)?.desc}
              </p>
            </div>

            {/* Toggle Chế độ Mã HTML vs Xem trước A4 */}
            <div className="flex items-center gap-1.5 bg-bg-subtle p-1 rounded-xl border border-border-subtle">
              <Button
                variant={viewMode === 'preview' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('preview')}
                className={`rounded-lg text-xs font-extrabold ${viewMode === 'preview' ? 'bg-amber-600 text-white' : ''}`}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                Xem trước A4
              </Button>
              <Button
                variant={viewMode === 'editor' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('editor')}
                className={`rounded-lg text-xs font-extrabold ${viewMode === 'editor' ? 'bg-amber-600 text-white' : ''}`}
              >
                <Code className="h-3.5 w-3.5 mr-1" />
                Mã HTML / Chỉnh sửa
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-ink-muted">
                <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                <span className="text-sm font-medium">Đang tải mẫu văn bản...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Cột trái: Thẻ biến gợi ý (4 cột LG) */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300">
                    <p className="text-xs font-extrabold text-amber-950 dark:text-amber-100 flex items-center gap-1.5 mb-1">
                      <Sparkles className="h-4 w-4 text-amber-700" />
                      Danh sách Thẻ biến động HTML
                    </p>
                    <p className="text-[11px] text-amber-900/90 dark:text-amber-200 leading-relaxed font-medium">
                      Nhấp vào bất kỳ thẻ biến bên dưới để tự động chèn vào nội dung mẫu hợp đồng.
                    </p>
                  </div>

                  <div className="border border-border-subtle rounded-xl p-3 bg-bg-subtle max-h-[500px] overflow-y-auto space-y-1.5">
                    <p className="text-[10px] uppercase font-extrabold text-ink-muted tracking-wider mb-2">Bấm để chèn nhanh:</p>
                    {AVAILABLE_TAGS.map((t) => (
                      <button
                        key={t.tag}
                        type="button"
                        onClick={() => handleInsertTag(t.tag)}
                        className="w-full text-left p-2 rounded-lg bg-card border border-border-subtle hover:border-amber-400 hover:bg-amber-50/50 transition-all flex items-center justify-between group"
                      >
                        <span className="font-mono text-xs font-bold text-amber-800 dark:text-amber-300 group-hover:scale-105 transition-transform">{t.tag}</span>
                        <span className="text-[10px] text-ink-muted truncate pl-2">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cột phải: Vùng soạn thảo / Live Preview A4 (8 cột LG) */}
                <div className="lg:col-span-8">
                  {viewMode === 'editor' ? (
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-ink-muted block">Mã nguồn HTML mẫu văn bản A4</label>
                      <textarea
                        value={templateContent}
                        onChange={(e) => setTemplateContent(e.target.value)}
                        rows={22}
                        className="w-full font-mono text-xs p-4 rounded-xl border border-border-subtle bg-slate-950 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-amber-400 leading-relaxed resize-none shadow-inner"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink-muted flex items-center gap-1">
                          <Printer className="h-3.5 w-3.5 text-amber-600" />
                          Xem trước bản in A4 (Khổ 210mm × 297mm)
                        </span>
                        <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-400 bg-emerald-50 font-bold">
                          ✓ Chuẩn A4
                        </Badge>
                      </div>

                      {/* Khung hiển thị A4 Giả lập */}
                      <div className="w-full overflow-x-auto bg-slate-200 dark:bg-slate-900 p-4 sm:p-8 rounded-xl shadow-inner flex justify-center">
                        <div
                          className="w-[210mm] min-h-[297mm] bg-white text-black p-[20mm] shadow-2xl rounded-sm font-serif border border-slate-300 print:shadow-none print:p-0"
                          dangerouslySetInnerHTML={{ __html: getSamplePreviewHTML() }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

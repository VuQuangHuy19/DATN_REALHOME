'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SheetImportPreviewDialog } from './SheetImportPreviewDialog';
import { SheetImportResult } from '../services/googleSheetAiParser';
import { QuickCreateLandlordModal } from '@/src/features/properties/components/QuickCreateLandlordModal';
import { useLandlords } from '@/src/features/properties/hooks/useLandlords';
import { useAuth } from '@/lib/auth/AuthContext';
import type { DBLandlord } from '@/lib/supabase/types';
import { Sparkles, FileSpreadsheet, Loader2, Link2, HelpCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleSheetImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId?: string;
  landlordId?: string;
  onSuccess?: () => void;
}

export function GoogleSheetImportModal({
  open,
  onOpenChange,
  companyId,
  landlordId,
  onSuccess,
}: GoogleSheetImportModalProps) {
  const { company } = useAuth();
  const effectiveCompanyId = companyId || company?.id;
  const { items: landlordList } = useLandlords(effectiveCompanyId);

  const [sheetUrl, setSheetUrl] = useState('');
  const [selectedLandlord, setSelectedLandlord] = useState<string>(landlordId || '');
  const [newLandlords, setNewLandlords] = useState<DBLandlord[]>([]);
  const displayLandlords = [...landlordList, ...newLandlords];

  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<SheetImportResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const handleStartParse = async () => {
    if (!sheetUrl || !sheetUrl.includes('docs.google.com/spreadsheets')) {
      toast.error('Vui lòng dán đúng đường dẫn Google Sheet (https://docs.google.com/spreadsheets/d/...)');
      return;
    }

    if (!selectedLandlord) {
      toast.error('Vui lòng chọn Chủ nhà phụ trách trước khi phân tích Sheet.');
      return;
    }

    setIsParsing(true);
    try {
      const res = await fetch('/api/sync/google-sheet/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Lỗi khi bóc tách dữ liệu Google Sheet');
      }

      setParsedData(resData.result);
      setShowPreview(true);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Không thể đọc được dữ liệu từ Google Sheet này.');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-6 rounded-2xl border border-emerald-500/30 bg-slate-950 text-white shadow-2xl">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <FileSpreadsheet className="w-4 h-4" />
              Tự Động Nhập Dữ Liệu Từ Google Sheet (AI)
            </div>
            <DialogTitle className="text-xl font-bold text-white">
              Nhập dữ liệu Tòa nhà & Phòng
            </DialogTitle>
            <DialogDescription className="text-slate-300 text-xs leading-relaxed">
              AI sẽ tự động đọc mọi Tab, bóc tách Tòa nhà, Mã phòng, Giá thuê và Link Drive ảnh bất chấp định dạng Sheet của bạn!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Chọn chủ nhà phụ trách */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  CHỦ NHÀ PHỤ TRÁCH <span className="text-emerald-400">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setShowQuickCreate(true)}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Chưa có chủ nhà?
                </button>
              </div>
              <select
                value={selectedLandlord}
                onChange={(e) => setSelectedLandlord(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                required
              >
                <option value="">-- Chọn Chủ nhà cho các tòa nhà này --</option>
                {displayLandlords.map((l) => (
                  <option key={l.id} value={l.code || l.id}>
                    {l.code ? `${l.code} - ` : ''}
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Input đường dẫn Google Sheet */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>ĐƯỜNG DẪN GOOGLE SHEET (SHARE LINK) <span className="text-emerald-400">*</span></span>
                <span className="text-[11px] text-emerald-400 font-normal">Bất kỳ ai có link đều xem được</span>
              </Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1u4hoU068GqrBly..."
                  className="pl-9 bg-slate-900 border-slate-700 focus:border-emerald-400 text-white text-xs h-10 rounded-lg"
                />
              </div>
            </div>

            {/* Hướng dẫn bật quyền */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 space-y-1.5 text-xs text-slate-300">
              <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                Hướng dẫn bật quyền truy cập cho Sheet:
              </div>
              <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-300 text-[11px]">
                <li>Mở file Google Sheet của bạn ➔ Bấm nút <strong className="text-white">Chia sẻ (Share)</strong> ở góc phải trên.</li>
                <li>Ở mục &quot;Quyền truy cập chung&quot;, chọn <strong className="text-emerald-400">&quot;Bất kỳ ai có đường link&quot; (Anyone with link)</strong>.</li>
                <li>Sao chép đường link và dán vào ô bên trên.</li>
              </ol>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isParsing}
              className="text-slate-300 hover:text-white"
            >
              Hủy
            </Button>
            <Button
              onClick={handleStartParse}
              disabled={isParsing || !sheetUrl.trim() || !selectedLandlord}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl gap-2 shadow-lg shadow-emerald-600/20"
            >
              {isParsing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  AI Đang Bóc Tách Sheet...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  Bắt Đầu Bóc Tách Bằng AI
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Tạo Nhanh Chủ Nhà */}
      <QuickCreateLandlordModal
        isOpen={showQuickCreate}
        onClose={() => setShowQuickCreate(false)}
        onCreated={(newLandlord) => {
          setNewLandlords((prev) => [...prev, newLandlord]);
          setSelectedLandlord(newLandlord.code || newLandlord.id);
          toast.success(`Đã chọn chủ nhà mới: ${newLandlord.name}`);
        }}
      />

      {/* Preview Dialog */}
      <SheetImportPreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        parsedData={parsedData}
        sheetUrl={sheetUrl}
        companyId={effectiveCompanyId}
        landlordId={selectedLandlord}
        onSuccess={onSuccess}
      />
    </>
  );
}

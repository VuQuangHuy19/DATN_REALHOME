import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle2, Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { QuickCreateLandlordModal } from './QuickCreateLandlordModal';
import type { DBLandlord } from '@/lib/supabase/types';
import { useAuth } from '@/lib/auth/AuthContext';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  landlords: any[];
  onSuccess: () => void;
}

export function ExcelImportModal({ isOpen, onClose, landlords, onSuccess }: ExcelImportModalProps) {
  const { company } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [newLandlords, setNewLandlords] = useState<DBLandlord[]>([]);
  const displayLandlords = [...landlords, ...newLandlords];
  const [selectedLandlord, setSelectedLandlord] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [buildingsCount, setBuildingsCount] = useState(0);
  const [propertiesCount, setPropertiesCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetImportData = () => {
    setFile(null);
    setPreviewData([]);
    setBuildingsCount(0);
    setPropertiesCount(0);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsParsing(true);
    
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet) as any[];
      
      const buildingSet = new Set<string>();
      let validRows = 0;
      
      jsonData.forEach(row => {
        const buildingName = row['Tòa nhà (Địa chỉ) (*)'] || row['Tòa nhà'] || row['Địa chỉ'];
        const propertyCode = row['Phòng trống (*)'] || row['Mã phòng'] || row['Số phòng'];
        
        if (buildingName && propertyCode) {
          validRows++;
          buildingSet.add(buildingName.toString().trim());
        }
      });
      
      setPreviewData(jsonData);
      setBuildingsCount(buildingSet.size);
      setPropertiesCount(validRows);
    } catch (err: any) {
      toast.error('Lỗi khi đọc file: ' + err.message);
      setFile(null);
      setPreviewData([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedLandlord) {
      toast.error('Vui lòng chọn Chủ nhà');
      return;
    }
    
    if (previewData.length === 0) {
      toast.error('Không có dữ liệu hợp lệ để import');
      return;
    }
    
    setIsImporting(true);
    
    try {
      const response = await fetch('/api/import-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: company?.id,
          landlord_id: selectedLandlord,
          data: previewData
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Lỗi server khi import');
      }
      
      if (result.hasSyncTasks) {
        window.dispatchEvent(new CustomEvent('import-sync-started'));
      }
      toast.success(`Import thành công! Đã tạo ${result.buildingsCreated} tòa nhà và ${result.propertiesCreated} phòng.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Lỗi import: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl bg-white p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-heading font-bold text-ink flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Nhập dữ liệu Tòa nhà & Phòng từ File Excel
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Chủ nhà phụ trách <span className="text-red-500">*</span></Label>
              <button 
                type="button" 
                onClick={() => setShowQuickCreate(true)} 
                className="text-xs font-semibold text-accent hover:text-accent-500 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Chưa có chủ nhà?
              </button>
            </div>
            <select
              value={selectedLandlord}
              onChange={(e) => setSelectedLandlord(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              required
            >
              <option value="">-- Chọn Chủ nhà cho các tòa nhà này --</option>
              {displayLandlords.map(l => (
                <option key={l.id} value={l.code || ''}>
                  {l.code ? `${l.code} - ` : ''}{l.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-ink font-semibold text-xs uppercase tracking-wider">File dữ liệu (.xlsx, .xls, .csv)</Label>
              <a href="/templates/RealHome_Import_Template.xlsx" download className="text-xs font-semibold text-accent hover:text-accent-500 hover:underline flex items-center gap-1 transition-colors">
                <Download className="w-3.5 h-3.5" />
                Tải file mẫu
              </a>
            </div>
            
            {!file ? (
              <div 
                className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center bg-bg-subtle/30 hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="w-10 h-10 text-ink-muted mb-3" />
                <p className="text-sm font-semibold text-ink">Bấm để tải file Excel lên</p>
                <p className="text-xs text-ink-muted mt-1">Hỗ trợ định dạng chuẩn RealHome (.xlsx, .csv)</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx, .xls, .csv"
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="border border-border rounded-lg p-4 bg-white flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink">{file.name}</p>
                      <p className="text-xs text-ink-muted">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => resetImportData()} disabled={isImporting}>
                    Đổi file
                  </Button>
                </div>
              </div>
            )}
          </div>

          {isParsing && (
            <div className="flex items-center justify-center p-6 bg-bg-subtle rounded-lg text-sm text-ink-muted gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> Đang đọc file...
            </div>
          )}

          {previewData.length > 0 && !isParsing && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-md flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-900">Đọc file thành công!</p>
                  <p className="text-sm text-emerald-700 mt-0.5">
                    Tìm thấy <span className="font-bold">{buildingsCount}</span> tòa nhà và <span className="font-bold">{propertiesCount}</span> phòng hợp lệ.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-border bg-bg-subtle/50 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isImporting}>
            Hủy
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!selectedLandlord || isParsing || isImporting || propertiesCount === 0}
            className="bg-accent hover:bg-accent-500 text-white font-semibold"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Thực hiện Import ({propertiesCount} phòng)
          </Button>
        </div>
      </DialogContent>
      
      <QuickCreateLandlordModal 
        isOpen={showQuickCreate} 
        onClose={() => setShowQuickCreate(false)} 
        onCreated={(newLandlord) => {
          setNewLandlords(prev => [...prev, newLandlord]);
          setSelectedLandlord(newLandlord.code || '');
        }}
      />
    </Dialog>
  );
}

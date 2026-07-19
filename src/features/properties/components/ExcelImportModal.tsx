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
  landlords: any[]; // DBBuildingOwner[] or similar
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setIsParsing(true);
    
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      
      // Parse logic based on RealHome_Import_Chuan_Hoa format
      // headers are at row 0 (or row 1 if considering 0-index)
      if (jsonData.length < 2) {
        throw new Error('File Excel không có dữ liệu');
      }

      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];
      
      const getColIndex = (keyword: string) => headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes(keyword.toLowerCase()));
      
      const idxBuildingName = getColIndex('Tòa nhà');
      const idxArea = getColIndex('Khu vực');
      const idxRoomNumber = getColIndex('Phòng trống');
      const idxPrice = getColIndex('Giá Phòng');
      const idxRoomType = getColIndex('Loại Phòng');
      const idxAreaSize = getColIndex('Diện tích');
      
      // We will parse more thoroughly in backend or map here. For preview:
      let validRows = 0;
      const buildingSet = new Set<string>();
      
      let lastBuildingName = '';
      let lastArea = '';
      
      const parsedRows = rows.map(row => {
        const rowObj: Record<string, any> = {};
        headers.forEach((h, i) => {
          rowObj[h] = row[i];
        });
        return rowObj;
      }).filter(row => row['Phòng trống (*)']).map(row => {
        let bName = row['Tòa nhà (Địa chỉ) (*)']?.toString();
        let bArea = row['Khu vực(*)']?.toString();
        
        if (bName) bName = bName.replace(/\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
        if (bArea) bArea = bArea.replace(/\n|\r/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (!bName) {
           bName = lastBuildingName;
           bArea = lastArea;
        } else {
           lastBuildingName = bName;
           lastArea = bArea;
        }
        
        row['Tòa nhà (Địa chỉ) (*)'] = bName;
        row['Khu vực(*)'] = bArea;
        
        if (bName && row['Phòng trống (*)']) {
          validRows++;
          buildingSet.add(`${bName}-${bArea || 'Hà Nội'}`);
        }
        
        return row;
      }).filter(row => row['Tòa nhà (Địa chỉ) (*)']); // Filter out rows that still have no building name
      
      setPreviewData(parsedRows);
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
      toast.success(`Import thành công! Đã tạo ${result.buildingsCreated} tòa nhà và ${result.propertiesCreated} phòng. Ảnh đang được tải ngầm...`);
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
      <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="text-xl font-heading font-bold text-ink flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-accent" />
            Nhập dữ liệu từ Excel
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
                className="border-2 border-dashed border-border rounded-lg p-10 flex flex-col items-center justify-center bg-bg-subtle/30 hover:bg-bg-subtle/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud className="w-10 h-10 text-ink-muted mb-3" />
                <p className="text-sm font-semibold text-ink">Bấm để tải file lên</p>
                <p className="text-xs text-ink-muted mt-1">Hỗ trợ định dạng chuẩn RealHome</p>
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
                  <Button variant="outline" size="sm" onClick={() => setFile(null)} disabled={isImporting}>
                    Đổi file
                  </Button>
                </div>
                
                {isParsing ? (
                  <div className="flex items-center gap-2 text-sm text-ink-muted">
                    <Loader2 className="w-4 h-4 animate-spin" /> Đang đọc dữ liệu...
                  </div>
                ) : (
                  <div className="bg-bg-subtle p-3 rounded-md flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-ink">Đọc file thành công</p>
                      <p className="text-sm text-ink-muted mt-1">
                        Tìm thấy <span className="font-bold text-ink">{buildingsCount}</span> tòa nhà và <span className="font-bold text-ink">{propertiesCount}</span> phòng hợp lệ.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="bg-amber-50 text-amber-800 p-3 rounded-md flex items-start gap-2 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed">
                    Hệ thống sẽ tự động tạo các Tòa nhà và Phòng theo thông tin trong file. Các ảnh Google Drive sẽ được tự động tải về, nén và lưu trữ nội bộ (kiểm tra trùng lặp). Quá trình import có thể mất vài phút.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-border bg-bg-subtle/50 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isImporting}>
            Hủy
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!file || !selectedLandlord || isParsing || isImporting || previewData.length === 0}
            className="bg-accent hover:bg-accent-500 text-white"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Thực hiện Import
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

'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SheetImportResult } from '../services/googleSheetAiParser';
import { Loader2, CheckCircle, Building2, DoorOpen, ExternalLink, Sparkles, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface SheetImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedData: SheetImportResult | null;
  sheetUrl: string;
  companyId?: string;
  landlordId?: string;
  onSuccess?: () => void;
}

export function SheetImportPreviewDialog({
  open,
  onOpenChange,
  parsedData,
  sheetUrl,
  companyId,
  landlordId,
  onSuccess,
}: SheetImportPreviewDialogProps) {
  const [data, setData] = useState<SheetImportResult | null>(parsedData);
  const [isCommitting, setIsCommitting] = useState(false);

  React.useEffect(() => {
    setData(parsedData);
  }, [parsedData]);

  if (!data) return null;

  const totalBuildings = data.buildings.length;
  const totalRooms = data.buildings.reduce((sum, b) => sum + (b.rooms?.length || 0), 0);

  const handleRoomPriceChange = (bIndex: number, rIndex: number, newPriceStr: string) => {
    if (!data) return;
    const num = parseInt(newPriceStr.replace(/\D/g, ''), 10) || 0;
    const nextBuildings = [...data.buildings];
    nextBuildings[bIndex].rooms[rIndex].price = num;
    setData({ ...data, buildings: nextBuildings });
  };

  const handleRoomCodeChange = (bIndex: number, rIndex: number, newCode: string) => {
    if (!data) return;
    const nextBuildings = [...data.buildings];
    nextBuildings[bIndex].rooms[rIndex].code = newCode;
    setData({ ...data, buildings: nextBuildings });
  };

  const handleCommit = async () => {
    if (!data) return;
    setIsCommitting(true);

    try {
      const res = await fetch('/api/sync/google-sheet/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          landlord_id: landlordId,
          sheet_url: sheetUrl,
          buildings: data.buildings,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Lỗi khi lưu dữ liệu đồng bộ');
      }

      const markedMsg = resData.totalRoomsMarkedRented > 0
        ? ` • ${resData.totalRoomsMarkedRented} phòng tự động đánh dấu "Đã thuê"` : '';
      toast.success(
        `Đã nhập thành công ${resData.totalBuildings || totalBuildings} Tòa nhà và ${resData.totalRooms || totalRooms} Phòng!${markedMsg}`
      );

      if (resData.hasDriveSyncTasks) {
        toast.info('Hệ thống đang tải và nén ảnh từ Google Drive ngầm. Ảnh sẽ tự động cập nhật!');
      }

      toast.info('Sheet đã được đăng ký đồng bộ tự động. Mỗi lần chạy cron, hệ thống sẽ tự cập nhật!', { duration: 5000 });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Có lỗi xảy ra khi lưu dữ liệu.');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-950 text-white shadow-2xl">
        <DialogHeader className="pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm tracking-wide">
            <Sparkles className="w-4 h-4 animate-bounce text-emerald-400" />
            AI BÓC TÁCH GOOGLE SHEET THÀNH CÔNG
          </div>
          <DialogTitle className="text-xl font-bold text-white flex items-center justify-between pt-1">
            <span>Xác nhận dữ liệu Tòa nhà & Phòng</span>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 px-3 py-1 text-xs font-bold">
              {totalBuildings} Tòa nhà • {totalRooms} Phòng
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-xs">
            Kiểm tra và chỉnh sửa trực tiếp Mã phòng, Giá thuê (VNĐ) trước khi chính thức lưu vào hệ thống.
          </DialogDescription>
        </DialogHeader>

        {/* Dynamic Scroll Area for Buildings & Rooms */}
        <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6 custom-scrollbar">
          {data.buildings.map((building, bIdx) => (
            <div key={bIdx} className="bg-slate-900 border border-slate-800 hover:border-emerald-500/30 rounded-xl p-4 space-y-3 transition-colors shadow-lg">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <h3 className="font-bold text-white text-base tracking-wide">{building.name}</h3>
                  </div>
                  {building.address && (
                    <p className="text-xs text-slate-300 pl-7 font-medium">📍 {building.address}</p>
                  )}
                  {building.general_notes && (
                    <p className="text-xs text-emerald-300/90 pl-7 italic bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                      💡 {building.general_notes}
                    </p>
                  )}
                </div>
                <Badge className="bg-slate-800 text-emerald-300 border border-emerald-500/20 font-semibold px-2.5 py-1">
                  {building.rooms.length} phòng
                </Badge>
              </div>

              {/* Room Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {building.rooms.map((room, rIdx) => (
                  <div
                    key={rIdx}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/90 hover:border-emerald-500/40 transition-all shadow-sm"
                  >
                    {/* Mã phòng & Trạng thái */}
                    <div className="flex items-center gap-2 min-w-0">
                      <DoorOpen className="w-4 h-4 text-emerald-400 shrink-0 mt-3.5" />
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Mã phòng</span>
                        <Input
                          value={room.code}
                          onChange={(e) => handleRoomCodeChange(bIdx, rIdx, e.target.value)}
                          placeholder="Mã"
                          className="h-8 w-20 bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded-lg text-center focus:border-emerald-400"
                        />
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] uppercase font-bold shrink-0 px-2 py-0.5 mt-4 ${
                          room.status === 'available'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : room.available_date
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {room.status === 'available'
                          ? 'Trống'
                          : room.available_date
                          ? `Sắp trống ${new Date(room.available_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`
                          : 'Đã ở'}
                      </Badge>
                    </div>

                    {/* Giá thuê VNĐ & Ngày sắp trống */}
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider text-right">
                          Giá thuê (VNĐ)
                        </span>
                        <div className="relative">
                          <Input
                            value={room.price > 0 ? room.price.toLocaleString('vi-VN') : ''}
                            onChange={(e) => handleRoomPriceChange(bIdx, rIdx, e.target.value)}
                            placeholder="Nhập giá VNĐ..."
                            className="h-8 w-32 text-right pr-6 bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-400 rounded-lg focus:border-emerald-400"
                          />
                          <span className="absolute right-2.5 top-2 text-[10px] text-emerald-400/80 font-bold pointer-events-none">đ</span>
                        </div>
                        {room.available_date && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            <span className="text-[10px] text-amber-400 font-semibold">
                              Vào: {new Date(room.available_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                          </div>
                        )}
                      </div>

                      {room.drive_media_url && (
                        <a
                          href={room.drive_media_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 p-1.5 text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg border border-slate-800 transition"
                          title="Xem ảnh Drive gốc"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isCommitting}
            className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl"
          >
            Hủy bỏ
          </Button>

          <Button
            onClick={handleCommit}
            disabled={isCommitting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl gap-2 shadow-lg shadow-emerald-600/20"
          >
            {isCommitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Đang lưu & Đồng bộ...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Xác nhận Nhập & Bật Tự Động Đồng Bộ
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

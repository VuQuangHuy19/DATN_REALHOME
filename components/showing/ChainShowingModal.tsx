'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Zap, Building2, MapPin, DoorOpen, Loader2, ArrowRight } from 'lucide-react';
import { getRooms, type RoomWithBuilding } from '@/features/rooms/services/rooms';
import { toast } from 'sonner';

interface ChainShowingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentAppointmentId: string;
  customerName: string;
  companyId?: string | null;
  onSuccess: (newAppointment: any) => void;
}

export function ChainShowingModal({
  open,
  onOpenChange,
  parentAppointmentId,
  customerName,
  companyId,
  onSuccess,
}: ChainShowingModalProps) {
  const [rooms, setRooms] = useState<RoomWithBuilding[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<RoomWithBuilding | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadRooms();
    } else {
      setSearchQuery('');
      setSelectedRoom(null);
    }
  }, [open]);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const data = await getRooms(companyId || undefined);
      // Only show available rooms
      const availableRooms = data.filter((r) => r.status === 'available');
      setRooms(availableRooms);
    } catch (err) {
      console.error('Lỗi tải danh sách phòng:', err);
      toast.error('Không thể tải danh sách phòng trống.');
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter((r) => {
    const q = searchQuery.toLowerCase();
    const roomCodeMatch = r.code.toLowerCase().includes(q);
    const buildingNameMatch = (r.buildings?.name || '').toLowerCase().includes(q);
    const addressMatch = (r.buildings?.address || '').toLowerCase().includes(q);
    const roomTypeMatch = (r.room_type || '').toLowerCase().includes(q);
    return roomCodeMatch || buildingNameMatch || addressMatch || roomTypeMatch;
  });

  const handleConfirmChain = async () => {
    if (!selectedRoom) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments/chain-showing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentAppointmentId,
          roomId: selectedRoom.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể khởi tạo lịch dẫn nối tiếp.');
      }
      toast.success(`⚡ ${data.message}`);
      onSuccess(data.newAppointment);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo lịch dẫn nối tiếp');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-24px)] sm:max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden bg-white rounded-2xl">
        <DialogHeader className="p-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Zap className="h-5 w-5 fill-white text-amber-500" />
            Dẫn Tiếp Căn Khác Cấp Tốc
          </DialogTitle>
          <p className="text-xs text-amber-100 opacity-90 leading-tight">
            Tạo nhanh lịch dẫn tiếp cho <strong className="text-white underline">{customerName}</strong>. Bỏ qua 90p & báo gấp cho Chủ nhà B.
          </p>
        </DialogHeader>

        <div className="p-3 border-b border-slate-100 flex-shrink-0 bg-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Tìm theo Mã phòng, Tòa nhà, Địa chỉ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs rounded-xl bg-white border-slate-200 focus-visible:ring-amber-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[260px]">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              <DoorOpen className="h-8 w-8 mx-auto mb-1.5 opacity-40" />
              Không tìm thấy căn trống nào phù hợp
            </div>
          ) : (
            filteredRooms.map((r) => {
              const isSelected = selectedRoom?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoom(r)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800">Phòng {r.code}</span>
                      {r.room_type && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-slate-300 text-slate-600">
                          {r.room_type}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-1 font-medium truncate">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {r.buildings?.name || 'Tòa nhà'} {r.buildings?.address ? `(${r.buildings.address})` : ''}
                    </div>
                    <div className="text-[11px] text-amber-700 font-bold">
                      {r.price ? `${r.price.toLocaleString('vi-VN')} đ/tháng` : 'Chưa có giá'}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <ArrowRight className="h-3.5 w-3.5 stroke-[3px]" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 flex-shrink-0">
          <Button
            onClick={handleConfirmChain}
            disabled={!selectedRoom || submitting}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold h-11 text-xs sm:text-sm rounded-xl shadow-md gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Đang tạo lịch & Báo Chủ nhà...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 fill-white" />
                Xác nhận Dẫn Căn Phòng {selectedRoom ? selectedRoom.code : ''} Ngay
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

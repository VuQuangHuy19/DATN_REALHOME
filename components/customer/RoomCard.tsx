'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Flame, CheckCircle, ShieldCheck, DoorOpen, ArrowRight } from 'lucide-react';
import { ViewingRequestDialog } from '@/components/customer/ViewingRequestDialog';

interface RoomCardProps {
  room: {
    id: string;
    code: string;
    price: number;
    area?: number;
    floor?: number;
    status: string;
    building_id?: string;
    building_name?: string;
    building_address?: string;
    amenities?: string[];
    appointments_count?: number;
  };
  onBookingSuccess?: () => void;
}

export function RoomCard({ room, onBookingSuccess }: RoomCardProps) {
  const [isViewingDialogOpen, setIsViewingDialogOpen] = useState(false);

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const activeAppointments = room.appointments_count || 0;

  return (
    <div className="group relative bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 transition-all duration-300 hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-600 flex flex-col justify-between h-full">
      <div>
        {/* Header Title & Badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              {room.building_name || 'Căn hộ / Tòa nhà'}
            </span>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
              <DoorOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              Phòng {room.code}
            </h3>
          </div>

          <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0">
            Trống có sẵn
          </Badge>
        </div>

        {/* Dynamic HOT Badge: "🔥 Có [X] lịch xem" */}
        {activeAppointments > 0 ? (
          <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-xl text-orange-600 dark:text-orange-400 text-xs font-black shadow-2xs animate-pulse">
            <Flame className="h-4 w-4 fill-orange-500 text-orange-500 shrink-0" />
            <span>🔥 Có {activeAppointments} lịch xem phòng</span>
          </div>
        ) : (
          <div className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[11px] font-bold rounded-lg border border-blue-100 dark:border-blue-900">
            <CheckCircle className="h-3.5 w-3.5" /> Sẵn sàng nhận khách
          </div>
        )}

        {/* Attributes Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 my-3 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-100 dark:border-zinc-800">
          <div>
            <span className="text-[10px] text-slate-400 block">Diện tích</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{room.area ? `${room.area} m²` : 'Đang cập nhật'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Vị trí</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{room.floor ? `Tầng ${room.floor}` : 'Tầng trệt'}</span>
          </div>
        </div>

        {/* Amenities List */}
        {room.amenities && room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {room.amenities.slice(0, 3).map((amenity, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-md"
              >
                {amenity}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Price & Action */}
      <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3 mt-auto">
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">Giá thuê hàng tháng</span>
          <span className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 font-mono tracking-tight">
            {formatVND(room.price)}
          </span>
        </div>

        <Button
          size="sm"
          onClick={() => setIsViewingDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <CalendarDays className="h-4 w-4" />
          <span>Đặt lịch xem</span>
        </Button>
      </div>

      {/* Viewing Dialog Modal */}
      {isViewingDialogOpen && (
        <ViewingRequestDialog
          open={isViewingDialogOpen}
          onOpenChange={setIsViewingDialogOpen}
          companyId={room.building_id || ''}
          property={{
            id: room.id,
            title: `${room.building_name || 'Căn hộ'} - Phòng ${room.code}`,
            address: room.building_address || '',
          }}
        />
      )}
    </div>
  );
}

'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import type { CustomerListing } from '@/lib/customer/types';

interface FloorGroup {
  floor: number;
  rooms: CustomerListing[];
}

interface PropertyNoticeNotesProps {
  /** Các phòng cùng tòa để hiển thị phòng trống theo tầng */
  siblingRooms?: CustomerListing[];
  /** ID phòng hiện tại để bỏ qua (nếu đang ở trang chi tiết phòng) */
  currentRoomId?: string;
}

export function PropertyNoticeNotes({ siblingRooms, currentRoomId }: PropertyNoticeNotesProps) {
  // Nhóm phòng available / soon_available theo tầng
  const availableByFloor = useMemo<FloorGroup[]>(() => {
    if (!siblingRooms || siblingRooms.length === 0) return [];

    const availables = siblingRooms.filter(
      (r) => (r.status === 'available' || r.status === 'soon_available') && r.id !== currentRoomId
    );

    const floorMap = new Map<number, CustomerListing[]>();
    for (const room of availables) {
      const fl = room.floor ?? 0;
      if (!floorMap.has(fl)) floorMap.set(fl, []);
      floorMap.get(fl)!.push(room);
    }

    // Sắp xếp tầng tăng dần, trong mỗi tầng sắp xếp theo số phòng
    return Array.from(floorMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([floor, rooms]) => ({
        floor,
        rooms: rooms.sort((a, b) => {
          const codeA = a.title.split('—')[1]?.trim() || a.id;
          const codeB = b.title.split('—')[1]?.trim() || b.id;
          return codeA.localeCompare(codeB, undefined, { numeric: true });
        }),
      }));
  }, [siblingRooms, currentRoomId]);

  const totalAvailable = availableByFloor.reduce((s, g) => s + g.rooms.length, 0);

  return (
    <div className="space-y-3 my-6">
      {/* Box 0: Phòng trống theo tầng — chỉ hiển thị khi có data */}
      {availableByFloor.length > 0 && (
        <div className="border border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-emerald-950/30 rounded-xl overflow-hidden shadow-xs">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-100/80 dark:bg-emerald-900/40 border-b border-emerald-200/60 dark:border-emerald-800/40">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                Phòng đang trống — nhấn để xem ngay
              </span>
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-200/60 dark:bg-emerald-800/60 px-2 py-0.5 rounded-full">
              {totalAvailable} phòng
            </span>
          </div>

          {/* Danh sách tầng + phòng — 1 dòng ngang trên desktop, wrap trên mobile */}
          <div className="px-4 py-3">
            <div className="flex flex-wrap sm:flex-nowrap sm:overflow-x-auto sm:scrollbar-thin items-center gap-x-3 gap-y-2 pb-0.5">
              {availableByFloor.map(({ floor, rooms }, idx) => (
                <React.Fragment key={floor}>
                  {idx > 0 && (
                    <span className="hidden sm:inline text-emerald-300 dark:text-emerald-700 shrink-0 select-none">•</span>
                  )}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0 whitespace-nowrap">
                      T{floor}:
                    </span>
                    {rooms.map((room) => {
                      const code = room.title.split('—')[1]?.trim() || room.id.slice(0, 6);
                      const isSoonAvail = room.status === 'soon_available';
                      return (
                        <Link
                          key={room.id}
                          href={`/customer/properties/rooms/${room.id}`}
                          className={`
                            inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border shrink-0
                            transition-all duration-150 hover:scale-105 active:scale-95
                            ${isSoonAvail
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-100'
                              : 'bg-white dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                            }
                            cursor-pointer select-none shadow-xs font-mono
                          `}
                          title={isSoonAvail ? 'Sắp trống — nhấn để xem' : 'Còn trống — nhấn để xem ngay'}
                        >
                          {code}
                          {isSoonAvail && (
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 leading-none">sắp</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </React.Fragment>
              ))}
            </div>
            <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500/70 font-medium pt-1.5">
              👆 Nhấn vào số phòng để xem chi tiết ngay lập tức
            </p>
          </div>
        </div>
      )}

      {/* B*/}
      <div className="border-l-4 border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 p-4 rounded-r-xl space-y-1 shadow-xs">
        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
          Đặt lịch xem
        </h4>
        <div className="text-emerald-600 dark:text-emerald-400 font-bold text-xs sm:text-sm">
          Tối thiểu 30 phút trước giờ hẹn
        </div>
        <div className="text-rose-500 dark:text-rose-400 font-bold text-xs sm:text-sm">
          Hạn chế sau 21:00
        </div>
      </div>

      {/* Box 2: Quy định đàm phán & dẫn khách */}
      <div className="bg-[#fefce8] dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 p-4 rounded-xl space-y-2 text-xs sm:text-sm leading-relaxed shadow-xs">
        <div className="flex items-start gap-2">
          <span className="text-rose-500 font-bold shrink-0 text-sm">✕</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Khách chưa đi xem ➔ không mặc cả
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-rose-500 font-bold shrink-0 text-sm">✕</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Không xin fix trước
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-emerald-600 font-bold shrink-0 text-sm">✓</span>
          <span className="text-slate-700 dark:text-slate-300">
            Muốn deal được ➔ phải có khách thật
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-emerald-600 font-bold shrink-0 text-sm">✓</span>
          <span className="text-slate-700 dark:text-slate-300">
            Việc đúng: <strong className="text-blue-600 dark:text-blue-400 font-extrabold">dẫn khách đi xem trước</strong> ➔ Mới được đàm phán
          </span>
        </div>
      </div>
    </div>
  );
}

export default PropertyNoticeNotes;

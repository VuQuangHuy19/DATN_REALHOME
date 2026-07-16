'use client';

import React, { useState } from 'react';
import { useCompare } from '@/src/lib/customer/RoomCompareContext';
import type { CustomerListing } from '@/lib/customer/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Check, XCircle } from 'lucide-react';
import Image from 'next/image';

export function RoomComparisonDrawer() {
  const { rooms, removeRoom, clearRooms } = useCompare();
  const [isOpen, setIsOpen] = useState(false);

  if (rooms.length === 0) return null;

  return (
    <>
      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-full sm:w-auto px-4 sm:px-0">
        <div className="bg-white border border-border-subtle shadow-xl rounded-t-xl sm:rounded-full px-4 py-3 flex items-center justify-between gap-6 w-full max-w-[500px] mx-auto pb-safe">
          <div className="flex -space-x-2">
            {rooms.map(room => (
              <div key={room.id} className="relative w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-slate-100 shadow-sm">
                <Image src={room.thumbnailUrl || '/placeholder.jpg'} alt={room.title} fill className="object-cover" />
                <button 
                  onClick={(e) => { e.stopPropagation(); removeRoom(room.id); }}
                  className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm text-red-500 hover:text-red-700 hover:bg-slate-50"
                  title="Xóa"
                >
                  <XCircle className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex-1 flex flex-col items-center">
            <span className="text-sm font-bold text-ink">So sánh {rooms.length}/3 phòng</span>
            <button onClick={clearRooms} className="text-[10px] text-ink-muted hover:text-red-500 transition-colors">
              Xóa tất cả
            </button>
          </div>
          <Button onClick={() => setIsOpen(true)} className="bg-accent hover:bg-accent-500 text-white rounded-full px-6 font-bold shadow-sm">
            So sánh
          </Button>
        </div>
      </div>

      {/* Comparison Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-xl">
          <DialogHeader className="sticky top-0 bg-white/95 backdrop-blur z-20 px-6 py-4 border-b border-border-subtle flex flex-row items-center justify-between">
            <DialogTitle className="text-xl font-bold font-heading text-ink">So sánh phòng</DialogTitle>
          </DialogHeader>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse min-w-[600px]">
                <thead>
                  <tr>
                    <th className="p-3 w-1/4 sticky left-0 bg-white z-10 border-b border-r border-border-subtle shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Thuộc tính</th>
                    {rooms.map(room => (
                      <th key={room.id} className="p-3 w-1/4 border-b border-border-subtle align-top">
                        <div className="relative h-32 w-full rounded-md overflow-hidden bg-slate-100 mb-2 border border-border-subtle">
                          <Image src={room.imageUrl || '/placeholder.jpg'} alt={room.title} fill className="object-cover" />
                          <button 
                            onClick={() => {
                              removeRoom(room.id);
                              if (rooms.length === 1) setIsOpen(false);
                            }}
                            className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow hover:bg-red-50 hover:text-red-600 transition-colors z-10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="font-bold text-ink line-clamp-2">{room.title}</div>
                        <div className="text-xs text-ink-muted line-clamp-1 mt-1">{room.buildingName}</div>
                      </th>
                    ))}
                    {Array.from({ length: 3 - rooms.length }).map((_, i) => (
                      <th key={`empty-${i}`} className="p-3 w-1/4 border-b border-border-subtle">
                        <div className="h-32 w-full rounded-md border border-dashed border-border-subtle flex items-center justify-center bg-bg-subtle text-ink-muted text-xs font-normal mb-2">
                          Thêm phòng...
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Prices */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-ink sticky left-0 bg-white/95 z-10 border-r border-border-subtle shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Giá thuê</td>
                    {rooms.map(room => (
                      <td key={room.id} className="p-3 border-b border-border-subtle font-mono font-bold text-accent">
                        {room.price.toLocaleString('vi-VN')} đ/tháng
                      </td>
                    ))}
                    {Array.from({ length: 3 - rooms.length }).map((_, i) => (
                      <td key={`empty-${i}`} className="p-3 border-b border-border-subtle"></td>
                    ))}
                  </tr>

                  {/* Area */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-ink sticky left-0 bg-white/95 z-10 border-r border-border-subtle shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Diện tích</td>
                    {rooms.map(room => (
                      <td key={room.id} className="p-3 border-b border-border-subtle text-ink">
                        {room.size} m²
                      </td>
                    ))}
                    {Array.from({ length: 3 - rooms.length }).map((_, i) => (
                      <td key={`empty-${i}`} className="p-3 border-b border-border-subtle"></td>
                    ))}
                  </tr>

                  {/* Floor */}
                  <tr className="hover:bg-slate-50 transition-colors bg-bg-subtle/50">
                    <td className="p-3 font-semibold text-ink sticky left-0 bg-bg-subtle/95 z-10 border-r border-border-subtle shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Tầng</td>
                    {rooms.map(room => (
                      <td key={room.id} className="p-3 border-b border-border-subtle text-ink">
                        Tầng {room.floor}
                      </td>
                    ))}
                    {Array.from({ length: 3 - rooms.length }).map((_, i) => (
                      <td key={`empty-${i}`} className="p-3 border-b border-border-subtle"></td>
                    ))}
                  </tr>

                  {/* Amenities */}
                  {[
                    { key: 'hasElevator', label: 'Thang máy' },
                    { key: 'hasAirConditioner', label: 'Điều hòa' },
                    { key: 'hasWaterHeater', label: 'Nóng lạnh' },
                    { key: 'hasBed', label: 'Giường' },
                    { key: 'hasWardrobe', label: 'Tủ quần áo' },
                    { key: 'hasKitchenCabinet', label: 'Tủ bếp' },
                    { key: 'hasRefrigerator', label: 'Tủ lạnh' },
                    { key: 'allowPet', label: 'Nuôi thú cưng' },
                  ].map((amenity, index) => (
                    <tr key={amenity.key} className={`hover:bg-slate-50 transition-colors ${index % 2 === 1 ? 'bg-bg-subtle/50' : ''}`}>
                      <td className={`p-3 font-semibold text-ink sticky left-0 z-10 border-r border-border-subtle shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${index % 2 === 1 ? 'bg-bg-subtle/95' : 'bg-white/95'}`}>
                        {amenity.label}
                      </td>
                      {rooms.map(room => {
                        const val = room[amenity.key as keyof CustomerListing];
                        return (
                          <td key={room.id} className="p-3 border-b border-border-subtle text-ink">
                            {val ? <Check className="w-4 h-4 text-green-600" /> : <span className="text-ink-muted">-</span>}
                          </td>
                        );
                      })}
                      {Array.from({ length: 3 - rooms.length }).map((_, i) => (
                        <td key={`empty-${i}`} className="p-3 border-b border-border-subtle"></td>
                      ))}
                    </tr>
                  ))}
                  
                  {/* Action row */}
                  <tr>
                    <td className="p-3 sticky left-0 bg-white z-10 border-r border-border-subtle shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></td>
                    {rooms.map(room => (
                      <td key={room.id} className="p-3 pt-6 text-center">
                         <Button 
                          className="w-full bg-accent hover:bg-accent-500 text-white font-bold" 
                          onClick={() => {
                            setIsOpen(false);
                            window.location.href = `/customer/properties/${room.buildingId}#room-${room.id}`;
                          }}
                        >
                          Xem chi tiết
                        </Button>
                      </td>
                    ))}
                     {Array.from({ length: 3 - rooms.length }).map((_, i) => (
                      <td key={`empty-${i}`} className="p-3"></td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

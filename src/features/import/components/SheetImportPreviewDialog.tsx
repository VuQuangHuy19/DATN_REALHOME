'use client';

import React, { useState, useMemo } from 'react';
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
import { Loader2, CheckCircle, Building2, DoorOpen, ExternalLink, Sparkles, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';

import { useBuildings } from '@/features/properties/hooks/useBuildings';
import { useLandlords } from '@/features/properties/hooks/useLandlords';
import { useManagers } from '@/features/managers/hooks/useManagers';
import { formatDateDisplay } from '@/lib/room-status';

interface SheetImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedData: SheetImportResult | null;
  sheetUrl: string;
  companyId?: string;
  landlordId?: string;
  onSuccess?: () => void;
}

function normalizeStr(str: string): string {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

export function formatManagerDisplay(
  raw: string | null | undefined,
  phoneToNameMap?: Record<string, string>,
  defaultLandlord?: { name?: string | null; phone?: string | null } | null
): string {
  let textToParse = raw;
  if (!textToParse || !textToParse.trim()) {
    if (defaultLandlord?.name || defaultLandlord?.phone) {
      const dName = defaultLandlord.name || '';
      const dPhone = defaultLandlord.phone || '';
      return dPhone && dName ? `${dName} - ${dPhone}` : (dName || dPhone);
    }
    return '';
  }

  const entries = textToParse.split(';').map((s) => s.trim()).filter(Boolean);
  const formatted = entries
    .map((entry) => {
      const parts = entry.split('|').map((p) => p.trim());
      let name = parts[0] || '';
      const normName = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normName.includes('vi tri') || normName.includes('anh') || normName.includes('video') || normName.includes('map') || normName.includes('link')) {
        name = '';
      }
      const phone = parts[1] || (parts.length === 1 ? parts[0] : '');
      const cleanPhone = phone.replace(/[^\d]/g, '');

      const isNamePureDigits = /^\d+$/.test(name);

      if (phoneToNameMap && cleanPhone && phoneToNameMap[cleanPhone]) {
        name = phoneToNameMap[cleanPhone];
      } else if (isNamePureDigits && defaultLandlord?.name) {
        if (!defaultLandlord.phone || cleanPhone === defaultLandlord.phone.replace(/[^\d]/g, '')) {
          name = defaultLandlord.name;
        }
      }

      if (name && phone && name !== phone && !/^\d+$/.test(name)) {
        return `${name} - ${phone}`;
      } else if (name && !/^\d+$/.test(name)) {
        return name;
      } else if (phone) {
        const dPhone = (defaultLandlord?.phone || '').replace(/[^\d]/g, '');
        if (dPhone && cleanPhone === dPhone && defaultLandlord?.name) {
          return `${defaultLandlord.name} - ${phone}`;
        }
        return phone;
      }

      return phone || name;
    })
    .filter(Boolean);

  return formatted.join(', ');
}

export function isSmartBuildingMatch(name1: string, name2: string): boolean {
  if (!name1 || !name2) return false;
  const n1 = normalizeStr(name1);
  const n2 = normalizeStr(name2);

  // 1. Existing exact match or inclusion
  if (n1 === n2) return true;
  if (n1.length >= 8 && (n2.includes(n1) || n1.includes(n2))) return true;

  // 2. Wildcard 'x' matching (e.g. "4321xgiapnhat" vs "43213giapnhat")
  const pattern1 = n1.replace(/x/g, '\\d*');
  const pattern2 = n2.replace(/x/g, '\\d*');
  try {
    if (new RegExp(`^${pattern1}$`).test(n2) || new RegExp(`^${pattern2}$`).test(n1)) return true;
  } catch (e) {}

  // 3. Street name + number prefix matching
  const street1 = n1.replace(/\d+/g, '');
  const street2 = n2.replace(/\d+/g, '');
  if (street1.length >= 5 && street1 === street2) {
    const num1 = (n1.match(/\d+/) || [''])[0];
    const num2 = (n2.match(/\d+/) || [''])[0];
    if (num1 && num2 && (num1 === num2 || num1.startsWith(num2) || num2.startsWith(num1))) {
      return true;
    }
  }

  return false;
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
  const [onlyAvailableFilter, setOnlyAvailableFilter] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const { items: dbBuildingsList } = useBuildings(companyId);
  const { items: landlordList } = useLandlords(companyId);
  const { items: managerList } = useManagers(companyId);

  // Filter DB buildings strictly by landlord if selected (supports both landlord UUID and landlord Code)
  const landlordDbBuildings = React.useMemo(() => {
    if (!landlordId || landlordId === 'auto') return dbBuildingsList;
    const targetLandlord = landlordList.find((l) => l.id === landlordId || l.code === landlordId);
    const validLandlordKeys = new Set<string>(
      [landlordId, targetLandlord?.id, targetLandlord?.code].filter(Boolean) as string[]
    );

    return dbBuildingsList.filter((b) => b.landlord_id && validLandlordKeys.has(b.landlord_id));
  }, [dbBuildingsList, landlordId, landlordList]);

  React.useEffect(() => {
    if (!parsedData) {
      setData(null);
      return;
    }

    // Auto-match parsed buildings with landlord's DB buildings if not set yet
    const nextBuildings = parsedData.buildings.map((b: any) => {
      if (b.target_building_id) return b;

      const matched = landlordDbBuildings.find((dbB) => {
        return (
          isSmartBuildingMatch(b.name, dbB.name) ||
          isSmartBuildingMatch(b.name, dbB.address || '') ||
          isSmartBuildingMatch(b.address || '', dbB.name) ||
          isSmartBuildingMatch(b.address || '', dbB.address || '')
        );
      });

      return {
        ...b,
        target_building_id: matched ? matched.id : '',
      };
    });

    setData({ ...parsedData, buildings: nextBuildings });
  }, [parsedData, landlordDbBuildings]);


  const selectedLandlordObj = React.useMemo(() => {
    if (!landlordId || !landlordList) return null;
    return landlordList.find((l) => l.id === landlordId || l.code === landlordId) || null;
  }, [landlordId, landlordList]);

  const phoneToNameMap = useMemo(() => {
    const map: Record<string, string> = {};

    if (selectedLandlordObj?.phone && selectedLandlordObj?.name) {
      const cleanLPhone = selectedLandlordObj.phone.replace(/[^\d]/g, '');
      if (cleanLPhone) map[cleanLPhone] = selectedLandlordObj.name;
    }

    (landlordList || []).forEach((l) => {
      if (l.phone && l.name) {
        const p = l.phone.replace(/[^\d]/g, '');
        if (p && !map[p]) map[p] = l.name;
      }
    });

    (managerList || []).forEach((m) => {
      if (m.phone && m.name) {
        const p = m.phone.replace(/[^\d]/g, '');
        if (p && !map[p]) map[p] = m.name;
      }
    });

    if (data?.buildings) {
      for (const b of data.buildings) {
        if ((b as any).manager_raw) {
          const entries = (b as any).manager_raw.split(';').map((s: string) => s.trim()).filter(Boolean);
          for (const entry of entries) {
            const parts = entry.split('|').map((p: string) => p.trim());
            const name = parts[0] || '';
            const phone = (parts[1] || (parts.length === 1 ? parts[0] : '')).replace(/[^\d]/g, '');
            if (name && phone && phone.length >= 8 && name !== phone && !/^\d+$/.test(name)) {
              map[phone] = name;
            }
          }
        }
      }
    }
    return map;
  }, [data, selectedLandlordObj, landlordList]);

  const totalBuildings = data?.buildings.length || 0;
  const totalRooms = data?.buildings.reduce((sum, b) => sum + (b.rooms?.length || 0), 0) || 0;

  const totalAvailableRooms = useMemo(() => {
    if (!data) return 0;
    return data.buildings.reduce((sum, b) => {
      const availCount = (b.rooms || []).filter((r) => r.status === 'available' || Boolean(r.available_date)).length;
      return sum + availCount;
    }, 0);
  }, [data]);

  // Dynamic filter for displayed buildings & rooms (bao gồm cả Phòng Trống & Phòng Sắp Trống)
  const displayedBuildings = useMemo(() => {
    if (!data) return [];
    if (!onlyAvailableFilter) return data.buildings;

    return data.buildings
      .map((b) => {
        const availableRooms = (b.rooms || []).filter((r) => r.status === 'available' || Boolean(r.available_date));
        if (availableRooms.length === 0) return null;
        return {
          ...b,
          rooms: availableRooms,
        };
      })
      .filter(Boolean) as typeof data.buildings;
  }, [data, onlyAvailableFilter]);

  if (!data) return null;

  const handleBuildingTargetChange = (bIndex: number, targetId: string) => {
    if (!data) return;
    const nextBuildings = [...data.buildings];
    (nextBuildings[bIndex] as any).target_building_id = targetId;
    setData({ ...data, buildings: nextBuildings });
  };

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

  const handleCommit = async (onlyAvailable: boolean = false) => {
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
          only_available: onlyAvailable,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Lỗi khi lưu dữ liệu đồng bộ');
      }

      const markedMsg = resData.totalRoomsMarkedRented > 0
        ? ` • ${resData.totalRoomsMarkedRented} phòng tự động đánh dấu "Đã thuê"` : '';
      const modeMsg = onlyAvailable ? ' (Chỉ phòng trống)' : '';
      toast.success(
        `Đã nhập thành công ${resData.totalBuildings || totalBuildings} Tòa nhà và ${resData.totalRooms || totalRooms} Phòng!${modeMsg}${markedMsg}`
      );

      // Dispatch event để admin layout bắt đầu polling tiến độ tải ảnh
      if (resData.hasDriveSyncTasks && resData.syncJobId) {
        window.dispatchEvent(new CustomEvent('import-sync-started', {
          detail: {
            job_id: resData.syncJobId,
            total_tasks: resData.totalRooms || totalRooms,
          }
        }));
        toast.info('Hệ thống đang tải và nén ảnh từ Google Drive ngầm. Xem tiến độ ở góc màn hình!');
      }

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
      <DialogContent className="w-[96vw] max-w-4xl max-h-[92vh] sm:max-h-[85vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-950 text-white shadow-2xl">
        <DialogHeader className="pb-3 sm:pb-4 border-b border-slate-800 bg-slate-950 pr-8 sm:pr-0">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm tracking-wide">
            <Sparkles className="w-4 h-4 animate-bounce text-emerald-400 shrink-0" />
            <span>AI BÓC TÁCH GOOGLE SHEET THÀNH CÔNG</span>
          </div>
          <DialogTitle className="text-base sm:text-xl font-bold text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <span className="truncate max-w-full">Xác nhận dữ liệu Tòa nhà & Phòng</span>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setOnlyAvailableFilter(!onlyAvailableFilter)}
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                  onlyAvailableFilter
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="Bật/tắt chế độ lọc chỉ xem phòng trống & sắp trống"
              >
                <Filter className="w-3.5 h-3.5 shrink-0" />
                <span>{onlyAvailableFilter ? 'Đang lọc: Trống & Sắp trống' : 'Lọc Trống & Sắp trống'}</span>
              </button>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold whitespace-nowrap">
                {onlyAvailableFilter
                  ? `${displayedBuildings.length} Tòa • ${totalAvailableRooms} Phòng`
                  : `${totalBuildings} Tòa • ${totalRooms} Phòng`}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-xs mt-0.5">
            Kiểm tra và chỉnh sửa trực tiếp Mã phòng, Giá thuê (VNĐ) trước khi chính thức lưu vào hệ thống.
          </DialogDescription>
        </DialogHeader>

        {/* Dynamic Scroll Area for Buildings & Rooms */}
        <div className="flex-1 overflow-y-auto pr-1.5 sm:pr-2 py-3 sm:py-4 space-y-4 sm:space-y-6 custom-scrollbar">
          {/* Khối xem trước Quy định của chủ nhà */}
          {data.landlord_policies && (
            <div className="bg-indigo-950/60 border border-indigo-500/40 rounded-xl p-3.5 space-y-2 text-xs text-indigo-100 shadow-md">
              <div className="font-bold text-indigo-300 flex items-center justify-between border-b border-indigo-800/80 pb-2">
                <span className="flex items-center gap-2 text-sm font-bold">
                  🛡️ Bóc tách Quy định chủ nhà ({data.landlord_policies.closing_notes?.length || 0} lưu ý chốt khách)
                </span>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-[10px] font-bold">
                  Áp dụng toàn bộ tòa nhà
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {data.landlord_policies.commission_policy && data.landlord_policies.commission_policy.length > 0 && (
                  <div className="space-y-1 bg-indigo-900/40 p-2.5 rounded-lg border border-indigo-800/50">
                    <span className="font-bold text-amber-300 block">💰 Quy định hoa hồng:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                      {data.landlord_policies.commission_policy.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.landlord_policies.closing_notes && data.landlord_policies.closing_notes.length > 0 && (
                  <div className="space-y-1 bg-indigo-900/40 p-2.5 rounded-lg border border-indigo-800/50">
                    <span className="font-bold text-emerald-300 block">📋 Lưu ý khi chốt khách:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                      {data.landlord_policies.closing_notes.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {displayedBuildings.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <DoorOpen className="w-8 h-8 text-slate-500 mx-auto animate-pulse" />
              <p className="text-sm font-semibold">Không tìm thấy phòng trống nào trong danh sách bóc tách.</p>
              <p className="text-xs text-slate-500">Tất cả các phòng hiện tại đều có trạng thái Đã ở / Có khách.</p>
            </div>
          ) : (
            displayedBuildings.map((building, bIdx) => (
              <div key={bIdx} className="bg-slate-900 border border-slate-800 hover:border-emerald-500/30 rounded-xl p-3 sm:p-4 space-y-3 transition-colors shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <h3 className="font-bold text-white text-base tracking-wide">{building.name}</h3>
                      {(building as any).target_building_id ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                          🟢 Đã khớp Tòa nhà trên DB
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold">
                          ➕ Sẽ tạo Tòa nhà mới
                        </Badge>
                      )}
                    </div>
                    {building.address && (
                      <p className="text-xs text-slate-300 pl-0 sm:pl-7 font-medium">📍 {building.address}</p>
                    )}
                    {((building as any).latitude && (building as any).longitude) && (
                      <div className="flex items-center gap-1.5 pl-0 sm:pl-7 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-slate-400 font-medium">🗺️ Vị trí Map DB:</span>
                        <a
                          href={(building as any).map_link || `https://www.google.com/maps?q=${(building as any).latitude},${(building as any).longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-sky-300 hover:text-sky-200 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30 flex items-center gap-1 transition-colors"
                        >
                          📍 {(building as any).latitude.toFixed(5)}, {(building as any).longitude.toFixed(5)}
                          <ExternalLink className="w-3 h-3 ml-0.5" />
                        </a>
                      </div>
                    )}
                    {formatManagerDisplay((building as any).manager_raw || building.rooms.find(r => r.manager_raw)?.manager_raw, phoneToNameMap, selectedLandlordObj) && (
                      <div className="flex items-center gap-1.5 pl-0 sm:pl-7 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-slate-400 font-medium">👤 Quản lý / Số dẫn:</span>
                        <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {formatManagerDisplay((building as any).manager_raw || building.rooms.find(r => r.manager_raw)?.manager_raw, phoneToNameMap, selectedLandlordObj)}
                        </span>
                      </div>
                    )}
                    {building.general_notes && (
                      <p className="text-xs text-emerald-300/90 pl-0 sm:pl-7 italic bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                        💡 {building.general_notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0">
                    <div className="flex flex-col gap-1 items-start sm:items-end flex-1 sm:flex-initial">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Nhập vào Tòa nhà DB
                      </span>
                      <select
                        value={(building as any).target_building_id || ''}
                        onChange={(e) => handleBuildingTargetChange(bIdx, e.target.value)}
                        className="h-8 w-full sm:max-w-[260px] rounded-lg border border-slate-700 bg-slate-950 px-2.5 text-xs text-emerald-300 font-semibold focus:outline-none focus:border-emerald-400"
                      >
                        <option value="">
                          ➕ (Tạo mới Tòa nhà thuộc {selectedLandlordObj?.name ? `Chủ nhà "${selectedLandlordObj.name}"` : 'Chủ nhà'})
                        </option>
                        {landlordDbBuildings.map((dbB) => (
                          <option key={dbB.id} value={dbB.id}>
                            🏢 {dbB.name} {dbB.address ? `(${dbB.address})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Badge className="bg-slate-800 text-emerald-300 border border-emerald-500/20 font-semibold px-2.5 py-1.5 self-end shrink-0">
                      {building.rooms.length} phòng
                    </Badge>
                  </div>
                </div>

                {/* Room Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {building.rooms.map((room, rIdx) => (
                    <div
                      key={rIdx}
                      className="flex flex-col gap-2 p-3 rounded-xl border border-slate-800 bg-slate-950/90 hover:border-emerald-500/40 transition-all shadow-sm"
                    >
                      {/* Top Row: Mã phòng & Giá thuê */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Left: Mã phòng & Status Badge */}
                        <div className="flex items-center gap-2 min-w-0">
                          <DoorOpen className="w-4 h-4 text-emerald-400 shrink-0 hidden sm:block mt-3.5" />
                          <div className="flex flex-col gap-0.5">
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
                            className={`text-[10px] uppercase font-bold shrink-0 px-2 py-1 mt-3.5 ${
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
                              ? 'Sắp trống'
                              : 'Đã ở'}
                          </Badge>
                        </div>

                        {/* Right: Giá thuê & Drive Media Link */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex flex-col gap-0.5 items-end">
                            <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                              Giá thuê (VNĐ)
                            </span>
                            <div className="relative">
                              <Input
                                value={room.price > 0 ? room.price.toLocaleString('vi-VN') : ''}
                                onChange={(e) => handleRoomPriceChange(bIdx, rIdx, e.target.value)}
                                placeholder="Nhập giá..."
                                className="h-8 w-28 sm:w-32 text-right pr-6 bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-400 rounded-lg focus:border-emerald-400"
                              />
                              <span className="absolute right-2 top-2 text-[10px] text-emerald-400/80 font-bold pointer-events-none">đ</span>
                            </div>
                          </div>

                          {room.drive_media_url && (
                            <a
                              href={room.drive_media_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-3.5 p-1.5 text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg border border-slate-800 transition shrink-0"
                              title="Xem ảnh Drive gốc"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Additional Details (Date & Deposit terms) */}
                      {(room.available_date || room.deposit_terms) && (
                        <div className="flex items-center gap-2 flex-wrap pt-1.5 border-t border-slate-800/60 text-[11px]">
                          {room.available_date && (
                            <span className="flex items-center gap-1.5 text-[10.5px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30 font-semibold">
                              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              Sắp trống: {formatDateDisplay(room.available_date)}
                            </span>
                          )}
                          {room.deposit_terms && (
                            <span className="text-[10.5px] font-semibold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/30">
                              💳 {room.deposit_terms}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            ))
          )}
        </div>

        <DialogFooter className="pt-3 sm:pt-4 border-t border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isCommitting}
            className="text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl w-full sm:w-auto text-xs sm:text-sm h-10"
          >
            Hủy bỏ
          </Button>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button
              onClick={() => handleCommit(true)}
              disabled={isCommitting || totalAvailableRooms === 0}
              variant="outline"
              className="border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-emerald-200 font-bold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl gap-2 shadow-sm text-xs sm:text-sm w-full sm:w-auto h-10 justify-center"
              title="Chỉ nhập các phòng Trống & Sắp trống lên hệ thống"
            >
              {isCommitting ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="truncate">Chỉ nhập phòng trống ({totalAvailableRooms})</span>
            </Button>

            <Button
              onClick={() => handleCommit(false)}
              disabled={isCommitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl gap-2 shadow-lg shadow-emerald-600/20 text-xs sm:text-sm w-full sm:w-auto h-10 justify-center"
            >
              {isCommitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Đang lưu & Đồng bộ...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>Xác nhận Nhập & Bật Tự Động Đồng Bộ</span>
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

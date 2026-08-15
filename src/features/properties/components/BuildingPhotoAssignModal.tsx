'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import {
  Sparkles,
  Building2,
  DoorOpen,
  CheckCircle2,
  Loader2,
  LucideImage,
  Tag,
  ArrowRight,
  Filter,
  CheckSquare,
  Square,
  ShieldCheck,
  Star,
  Trash2,
  Eye,
  Maximize2,
  Play,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import type { DBRoom } from '@/lib/supabase/types';

interface BuildingPhotoAssignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildingId: string;
  buildingName: string;
  buildingCode?: string;
  companyId?: string;
  rooms: DBRoom[];
  onSuccess?: () => void;
}

interface DBPhotoItem {
  id: string;
  room_id: string | null;
  url: string;
  thumbnail_url?: string;
  is_thumbnail: boolean;
  priority: number;
  media_type: string;
  created_at?: string;
  room_code?: string;
  ai_tag?: 'FACADE' | 'INTERIOR' | 'BATHROOM' | 'HALLWAY' | 'UNKNOWN';
}

function detectAiTag(url: string, roomCode?: string): 'FACADE' | 'INTERIOR' | 'BATHROOM' | 'HALLWAY' | 'UNKNOWN' {
  const lower = (url || '').toLowerCase();
  if (lower.includes('mat_tien') || lower.includes('toa_nha') || lower.includes('facade') || lower.includes('mat_truoc') || lower.includes('ngoai_that')) {
    return 'FACADE';
  }
  if (lower.includes('wc') || lower.includes('ve_sinh') || lower.includes('bath') || lower.includes('toiet')) {
    return 'BATHROOM';
  }
  if (lower.includes('hanh_lang') || lower.includes('thang_may') || lower.includes('ban_cong') || lower.includes('hallway')) {
    return 'HALLWAY';
  }
  if (roomCode || lower.includes('gac') || lower.includes('studio') || lower.includes('nha_bep') || lower.includes('giuong')) {
    return 'INTERIOR';
  }
  return 'UNKNOWN';
}

export function BuildingPhotoAssignModal({
  open,
  onOpenChange,
  buildingId,
  buildingName,
  buildingCode,
  companyId,
  rooms,
  onSuccess,
}: BuildingPhotoAssignModalProps) {
  const [photos, setPhotos] = useState<DBPhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetRoomIds, setTargetRoomIds] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'unassigned' | 'facade' | 'assigned'>('all');
  const [isRoomDropdownOpen, setIsRoomDropdownOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<DBPhotoItem | null>(null);

  const roomMap = useMemo(() => {
    const map = new Map<string, string>();
    rooms.forEach((r) => map.set(r.id, r.code));
    return map;
  }, [rooms]);

  // Group rooms by floor
  const roomsByFloor = useMemo(() => {
    const map = new Map<number, DBRoom[]>();
    rooms.forEach((r) => {
      const floor = r.floor || 1;
      if (!map.has(floor)) map.set(floor, []);
      map.get(floor)!.push(r);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [rooms]);

  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      if (filterMode === 'unassigned') return !p.room_id;
      if (filterMode === 'assigned') return !!p.room_id;
      if (filterMode === 'facade') return p.ai_tag === 'FACADE';
      return true;
    });
  }, [photos, filterMode]);

  // Index of preview photo in filtered photos
  const previewIndex = useMemo(() => {
    if (!previewPhoto) return -1;
    return filteredPhotos.findIndex((p) => p.id === previewPhoto.id);
  }, [previewPhoto, filteredPhotos]);

  const handleNextPreview = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (previewIndex !== -1 && previewIndex < filteredPhotos.length - 1) {
      setPreviewPhoto(filteredPhotos[previewIndex + 1]);
    }
  };

  const handlePrevPreview = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (previewIndex > 0) {
      setPreviewPhoto(filteredPhotos[previewIndex - 1]);
    }
  };

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewPhoto) return;
      if (e.key === 'ArrowRight') handleNextPreview();
      if (e.key === 'ArrowLeft') handlePrevPreview();
      if (e.key === 'Escape') setPreviewPhoto(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewPhoto, previewIndex, filteredPhotos]);


  // Load photos from Database for all rooms in building + unassigned
  const fetchPhotos = async () => {
    if (!buildingId) return;
    setLoading(true);
    try {
      const roomIds = rooms.map((r) => r.id).filter(Boolean);

      let query = supabase.from('room_images').select('*');
      if (roomIds.length > 0) {
        query = query.in('room_id', roomIds);
      } else {
        query = query.eq('company_id', companyId || '');
      }

      const { data, error } = await query;
      if (error) throw error;

      const items: DBPhotoItem[] = (data || []).map((img: any) => ({
        id: img.id,
        room_id: img.room_id,
        url: img.url,
        thumbnail_url: img.thumbnail_url || img.url,
        is_thumbnail: img.is_thumbnail || false,
        priority: img.priority || 0,
        media_type: img.media_type || 'image',
        created_at: img.created_at,
        room_code: img.room_id ? roomMap.get(img.room_id) : undefined,
        ai_tag: detectAiTag(img.url, img.room_id ? roomMap.get(img.room_id) : undefined),
      }));

      setPhotos(items);
    } catch (err: any) {
      console.error('[BuildingPhotoAssignModal] Error fetching photos:', err);
      toast.error('Không thể tải danh sách ảnh tòa nhà.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPhotos();
      setSelectedIds(new Set());
      setTargetRoomIds(new Set());
    }
  }, [open, buildingId, rooms]);


  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleTargetRoom = (roomId: string) => {
    const next = new Set(targetRoomIds);
    if (roomId === 'BUILDING_FACADE') {
      // Clear room selections if facade is toggled
      if (next.has('BUILDING_FACADE')) {
        next.delete('BUILDING_FACADE');
      } else {
        next.clear();
        next.add('BUILDING_FACADE');
      }
    } else {
      next.delete('BUILDING_FACADE');
      if (next.has(roomId)) next.delete(roomId);
      else next.add(roomId);
    }
    setTargetRoomIds(next);
  };

  const selectAllRooms = () => {
    if (targetRoomIds.size === rooms.length && !targetRoomIds.has('BUILDING_FACADE')) {
      setTargetRoomIds(new Set());
    } else {
      setTargetRoomIds(new Set(rooms.map((r) => r.id)));
    }
  };

  const selectFloorRooms = (floorRooms: DBRoom[]) => {
    const next = new Set(targetRoomIds);
    next.delete('BUILDING_FACADE');
    const allFloorSelected = floorRooms.every((r) => next.has(r.id));
    floorRooms.forEach((r) => {
      if (allFloorSelected) next.delete(r.id);
      else next.add(r.id);
    });
    setTargetRoomIds(next);
  };

  const selectAllFiltered = () => {
    if (selectedIds.size === filteredPhotos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPhotos.map((p) => p.id)));
    }
  };

  const handleAssignToRoom = async () => {
    if (selectedIds.size === 0) {
      toast.error('Vui lòng chọn ít nhất 1 ảnh để gán.');
      return;
    }
    if (targetRoomIds.size === 0) {
      toast.error('Vui lòng chọn ít nhất 1 Phòng mục tiêu hoặc chọn "Đặt làm Mặt tiền Tòa nhà".');
      return;
    }

    setIsAssigning(true);
    try {
      const idsArray = Array.from(selectedIds);
      const selectedPhotoObjects = photos.filter((p) => selectedIds.has(p.id));

      if (targetRoomIds.has('BUILDING_FACADE')) {
        // Gán làm ảnh mặt tiền Tòa nhà
        const firstSelectedPhoto = selectedPhotoObjects[0];
        if (firstSelectedPhoto) {
          const { error: bErr } = await supabase
            .from('buildings')
            .update({
              image_url: firstSelectedPhoto.url,
              thumbnail_url: firstSelectedPhoto.thumbnail_url || firstSelectedPhoto.url,
              updated_at: new Date().toISOString(),
            })
            .eq('id', buildingId);

          if (bErr) throw bErr;
          toast.success('Đã cập nhật Ảnh đại diện Mặt tiền cho Tòa nhà thành công!');
        }
      } else {
        // Gán dùng chung ảnh cho Đa phòng
        const targetRoomList = Array.from(targetRoomIds);
        const firstRoomId = targetRoomList[0];
        const remainingRoomIds = targetRoomList.slice(1);

        // 1. Cập nhật room_id cho phòng đầu tiên
        const { error: imgErr } = await supabase
          .from('room_images')
          .update({
            room_id: firstRoomId,
            updated_at: new Date().toISOString(),
          })
          .in('id', idsArray);

        if (imgErr) throw imgErr;

        // 2. Với các phòng còn lại: thêm bản ghi liên kết dùng chung URL cũ
        if (remainingRoomIds.length > 0) {
          const duplicatePayloads: any[] = [];
          remainingRoomIds.forEach((roomId) => {
            selectedPhotoObjects.forEach((photo) => {
              duplicatePayloads.push({
                company_id: companyId || null,
                room_id: roomId,
                url: photo.url,
                thumbnail_url: photo.thumbnail_url || photo.url,
                is_thumbnail: photo.is_thumbnail || false,
                priority: photo.priority || 0,
                media_type: photo.media_type || 'image',
              });
            });
          });

          if (duplicatePayloads.length > 0) {
            const { error: insErr } = await supabase
              .from('room_images')
              .insert(duplicatePayloads);
            if (insErr) throw insErr;
          }
        }

        const roomCodes = targetRoomList
          .map((id) => roomMap.get(id))
          .filter(Boolean)
          .join(', ');

        toast.success(`Đã áp dụng thành công ${idsArray.length} ảnh dùng chung cho ${targetRoomList.length} phòng (${roomCodes})!`);
      }

      await fetchPhotos();
      setSelectedIds(new Set());
      setTargetRoomIds(new Set());
      setIsRoomDropdownOpen(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Lỗi khi gán ảnh.');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.size} ảnh đã chọn?`)) return;

    setIsAssigning(true);
    try {
      const idsArray = Array.from(selectedIds);
      const { error } = await supabase.from('room_images').delete().in('id', idsArray);
      if (error) throw error;

      toast.success(`Đã xóa ${idsArray.length} ảnh.`);
      await fetchPhotos();
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(`Không thể xóa ảnh: ${err.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[92vh] flex flex-col p-6 overflow-hidden rounded-2xl border border-indigo-500/30 bg-slate-950 text-white shadow-2xl">
        {/* Header */}
        <DialogHeader className="pb-3 border-b border-slate-800 space-y-1 shrink-0">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            AI Phân loại &amp; Gán Ảnh Phòng Chuẩn Hóa
          </div>
          <DialogTitle className="text-xl font-bold text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              {buildingName}
            </span>
            <Badge variant="outline" className="border-indigo-500/40 text-indigo-300 bg-indigo-500/10 px-3 py-1 text-xs font-bold">
              {photos.length} ảnh tổng cộng • {rooms.length} phòng
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-slate-300 text-xs">
            Chọn ảnh bên TRÁI ➔ Chọn các Phòng mục tiêu bên PHẢI ➔ Bấm nút Gán Ảnh để áp dụng dùng chung chuẩn xác!
          </DialogDescription>
        </DialogHeader>

        {/* Main 2-Column Studio Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden min-h-0 pt-3">
          {/* BÊN TRÁI: Thư viện Ảnh & Video (Col-span 8) */}
          <div className="lg:col-span-8 flex flex-col min-h-0 overflow-hidden pr-1">
            {/* Filter Bar & Photo Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                    filterMode === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Tất cả ({photos.length})
                </button>
                <button
                  onClick={() => setFilterMode('unassigned')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                    filterMode === 'unassigned'
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  ⚠️ Chưa phân loại ({photos.filter((p) => !p.room_id).length})
                </button>
                <button
                  onClick={() => setFilterMode('assigned')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                    filterMode === 'assigned'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  ✅ Đã gán phòng ({photos.filter((p) => p.room_id).length})
                </button>
                <button
                  onClick={() => setFilterMode('facade')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${
                    filterMode === 'facade'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  🏢 Mặt tiền tòa nhà
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllFiltered}
                  className="border-slate-700 bg-slate-900 text-slate-300 hover:text-white text-xs h-8 gap-1.5"
                >
                  {selectedIds.size === filteredPhotos.length && filteredPhotos.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  {selectedIds.size === filteredPhotos.length && filteredPhotos.length > 0 ? 'Bỏ chọn tất cả' : 'Chọn tất cả ảnh'}
                </Button>

                {selectedIds.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    className="text-xs h-8 gap-1 bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa ({selectedIds.size})
                  </Button>
                )}
              </div>
            </div>

            {/* Gallery Grid */}
            <div className="flex-1 overflow-y-auto py-3 pr-2 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                  <p className="text-xs">Đang tải danh sách ảnh tòa nhà...</p>
                </div>
              ) : filteredPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
                  <LucideImage className="w-8 h-8 opacity-40" />
                  <p className="text-xs">Không có hình ảnh nào trong danh mục này.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredPhotos.map((photo) => {
                    const isSelected = selectedIds.has(photo.id);
                    const cleanUrl = (photo.url || '').toLowerCase().split('?')[0];
                    const isVideo = photo.media_type === 'video' || (
                      cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.webm') ||
                      cleanUrl.endsWith('.m4v') || cleanUrl.endsWith('.mkv') || cleanUrl.endsWith('.avi') || cleanUrl.endsWith('.3gp')
                    );

                    return (
                      <div
                        key={photo.id}
                        onClick={() => toggleSelect(photo.id)}
                        className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all bg-slate-900 ${
                          isSelected
                            ? 'border-indigo-400 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20 scale-[1.02]'
                            : 'border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        {/* Thumbnail Image / Video */}
                        <div className="aspect-4/3 w-full relative bg-slate-950 flex items-center justify-center">
                          {isVideo ? (
                            <>
                              <video
                                src={photo.url}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                                muted
                                playsInline
                                loop
                              />
                              <div className="absolute inset-0 bg-black/25 flex items-center justify-center group-hover:bg-black/10 transition-colors pointer-events-none">
                                <div className="w-8 h-8 rounded-full bg-slate-950/80 border border-white/30 text-white flex items-center justify-center shadow-md">
                                  <span className="text-xs">▶</span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <img
                              src={photo.thumbnail_url || photo.url}
                              alt="Photo preview"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}

                          {/* Checkbox overlay (Top-Left) */}
                          <div className="absolute top-2 left-2 z-10">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center transition ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-md'
                                  : 'bg-slate-950/70 text-slate-400 border border-slate-600 backdrop-blur-xs'
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-4 h-4" />}
                            </div>
                          </div>

                          {/* Zoom / Play Fullscreen Button (Top-Right) */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewPhoto(photo);
                            }}
                            className="absolute top-2 right-2 z-20 w-7 h-7 rounded-lg bg-black/60 backdrop-blur-md text-white border border-white/20 hover:bg-indigo-600 hover:border-indigo-400 transition flex items-center justify-center shadow-lg opacity-90 hover:opacity-100 group-hover:scale-110"
                            title={isVideo ? 'Phát video phóng to (có tiếng)' : 'Phóng to xem ảnh'}
                          >
                            {isVideo ? <Play className="w-3.5 h-3.5 fill-white ml-0.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                          </button>

                          {/* AI Classification Badges */}
                          <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 z-10">
                            {isVideo && (
                              <Badge className="bg-purple-600/90 text-white text-[9px] font-bold px-1.5 py-0 shadow-xs">
                                🎬 Video
                              </Badge>
                            )}
                            {photo.ai_tag === 'FACADE' && (
                              <Badge className="bg-blue-600/90 text-white text-[9px] font-bold px-1.5 py-0 shadow-xs">
                                🏢 Mặt tiền
                              </Badge>
                            )}
                            {photo.ai_tag === 'BATHROOM' && (
                              <Badge className="bg-cyan-600/90 text-white text-[9px] font-bold px-1.5 py-0 shadow-xs">
                                🚻 Vệ sinh
                              </Badge>
                            )}
                            {photo.ai_tag === 'HALLWAY' && (
                              <Badge className="bg-purple-600/90 text-white text-[9px] font-bold px-1.5 py-0 shadow-xs">
                                🚪 Hành lang
                              </Badge>
                            )}

                            {photo.room_code ? (
                              <Badge className="bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0 shadow-xs ml-auto">
                                🚪 Phòng {photo.room_code}
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/90 text-slate-950 text-[9px] font-bold px-1.5 py-0 shadow-xs ml-auto">
                                Chưa gán
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selection info bar at left bottom */}
            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800 text-slate-400 shrink-0">
              <div className="flex items-center gap-2">
                <span>Đã chọn:</span>
                <Badge className="bg-indigo-600 text-white font-mono px-2 py-0.5 font-bold">
                  {selectedIds.size} ảnh
                </Badge>
              </div>
              <span className="text-[11px] text-slate-400">Click vào thẻ để chọn • Click nút 🔍 để xem phóng to/phát video</span>
            </div>
          </div>

          {/* BÊN PHẢI: Bảng Điều Khiển Chọn Phòng Mục Tiêu (Col-span 4) */}
          <div className="lg:col-span-4 flex flex-col min-h-0 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <DoorOpen className="w-4 h-4 text-indigo-400" />
                  CHỌN PHÒNG MỤC TIÊU
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {targetRoomIds.has('BUILDING_FACADE')
                    ? 'Đang chọn: Mặt tiền Tòa nhà'
                    : targetRoomIds.size > 0
                    ? `Đã chọn ${targetRoomIds.size} phòng`
                    : 'Chưa chọn phòng nào'}
                </p>
              </div>

              <button
                type="button"
                onClick={selectAllRooms}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition bg-emerald-950/60 border border-emerald-700/40 px-2.5 py-1 rounded-lg"
              >
                {targetRoomIds.size === rooms.length && !targetRoomIds.has('BUILDING_FACADE')
                  ? 'Bỏ tất cả'
                  : `Tất cả (${rooms.length})`}
              </button>
            </div>

            {/* Room List Scrollable Area */}
            <div className="flex-1 overflow-y-auto py-3 pr-1 space-y-3 custom-scrollbar">
              {/* Building Facade Option */}
              <div
                onClick={() => toggleTargetRoom('BUILDING_FACADE')}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-bold cursor-pointer transition border ${
                  targetRoomIds.has('BUILDING_FACADE')
                    ? 'bg-blue-600/30 text-blue-300 border-blue-500/60 shadow-md shadow-blue-500/10'
                    : 'bg-slate-950/50 text-slate-300 border-slate-800 hover:bg-slate-800/80'
                }`}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${targetRoomIds.has('BUILDING_FACADE') ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-600'}`}>
                  {targetRoomIds.has('BUILDING_FACADE') && <CheckCircle2 className="w-3 h-3" />}
                </div>
                <span>🏢 Đặt làm Ảnh Mặt Tiền Tòa Nhà</span>
              </div>

              {/* Rooms Grouped by Floor */}
              <div className="space-y-3">
                {roomsByFloor.map(([floor, floorRooms]) => {
                  const allFloorSelected = floorRooms.every((r) => targetRoomIds.has(r.id));
                  const selectedFloorCount = floorRooms.filter((r) => targetRoomIds.has(r.id)).length;

                  return (
                    <div key={floor} className="space-y-1.5 bg-slate-950/40 border border-slate-800/70 p-2.5 rounded-xl">
                      <div className="flex items-center justify-between text-xs font-bold text-indigo-300 pb-1 border-b border-slate-800/50">
                        <span>Tầng {floor} ({selectedFloorCount}/{floorRooms.length})</span>
                        <button
                          type="button"
                          onClick={() => selectFloorRooms(floorRooms)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          {allFloorSelected ? 'Bỏ chọn tầng này' : 'Chọn tầng này'}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {floorRooms.map((r) => {
                          const isRoomSelected = targetRoomIds.has(r.id);
                          return (
                            <div
                              key={r.id}
                              onClick={() => toggleTargetRoom(r.id)}
                              className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium cursor-pointer transition border ${
                                isRoomSelected
                                  ? 'bg-indigo-600/30 text-white border-indigo-500/60 font-bold shadow-xs'
                                  : 'bg-slate-900/60 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition ${isRoomSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-600'}`}>
                                {isRoomSelected && <CheckCircle2 className="w-3 h-3" />}
                              </div>
                              <div className="truncate">
                                <span className="font-bold">P.{r.code}</span>
                                {r.room_type && <span className="text-[10px] text-slate-400 block font-normal truncate">{r.room_type}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Apply Action Box */}
            <div className="pt-3 border-t border-slate-800 space-y-2 shrink-0">
              <div className="text-[11px] text-slate-400 flex items-center justify-between font-semibold">
                <span>Ảnh đã chọn: <strong className="text-white">{selectedIds.size}</strong></span>
                <span>Phòng nhận: <strong className="text-white">{targetRoomIds.has('BUILDING_FACADE') ? 'Mặt tiền' : `${targetRoomIds.size} phòng`}</strong></span>
              </div>

              <Button
                onClick={handleAssignToRoom}
                disabled={isAssigning || selectedIds.size === 0 || targetRoomIds.size === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl gap-2 shadow-lg shadow-indigo-600/30 text-xs sm:text-sm uppercase tracking-wider"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Đang áp dụng...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {targetRoomIds.has('BUILDING_FACADE')
                      ? 'Gán làm Ảnh Mặt Tiền Tòa Nhà'
                      : targetRoomIds.size > 1
                      ? `Gán ${selectedIds.size} Ảnh ➔ ${targetRoomIds.size} Phòng`
                      : targetRoomIds.size === 1
                      ? `Gán ${selectedIds.size} Ảnh Vào Phòng`
                      : 'Vui lòng chọn phòng mục tiêu'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Lightbox Media Viewer Modal */}
        {previewPhoto && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 sm:p-6"
            onClick={() => setPreviewPhoto(null)}
          >
            {/* Header info bar */}
            <div className="absolute top-4 left-6 right-6 flex items-center justify-between text-white z-10" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <Badge className="bg-indigo-600 text-white font-bold px-2.5 py-1 text-xs">
                  {previewIndex + 1} / {filteredPhotos.length}
                </Badge>
                {previewPhoto.room_code ? (
                  <Badge className="bg-emerald-600 text-white font-bold px-2.5 py-1 text-xs">
                    🚪 Phòng {previewPhoto.room_code}
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500 text-slate-950 font-bold px-2.5 py-1 text-xs">
                    Chưa gán phòng
                  </Badge>
                )}
                {previewPhoto.ai_tag && previewPhoto.ai_tag !== 'UNKNOWN' && (
                  <Badge className="bg-slate-800 text-slate-200 border border-slate-700 text-xs">
                    Tag: {previewPhoto.ai_tag}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(previewPhoto.id);
                  }}
                  variant="outline"
                  size="sm"
                  className={`text-xs font-bold gap-1.5 ${
                    selectedIds.has(previewPhoto.id)
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {selectedIds.has(previewPhoto.id) ? 'Đã chọn ảnh này' : 'Tích chọn ảnh này'}
                </Button>

                <button
                  type="button"
                  onClick={() => setPreviewPhoto(null)}
                  className="w-10 h-10 rounded-full bg-slate-900/90 text-white border border-slate-700 hover:bg-red-600 transition flex items-center justify-center shadow-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Left Prev Arrow */}
            {previewIndex > 0 && (
              <button
                type="button"
                onClick={handlePrevPreview}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-slate-900/80 border border-white/20 text-white hover:bg-indigo-600 transition flex items-center justify-center shadow-2xl"
                title="Ảnh trước (Mũi tên Trái)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Right Next Arrow */}
            {previewIndex < filteredPhotos.length - 1 && (
              <button
                type="button"
                onClick={handleNextPreview}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-slate-900/80 border border-white/20 text-white hover:bg-indigo-600 transition flex items-center justify-center shadow-2xl"
                title="Ảnh tiếp theo (Mũi tên Phải)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* Main Media Content */}
            <div
              className="max-w-[85vw] max-h-[82vh] relative flex items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {previewPhoto.media_type === 'video' ||
              (previewPhoto.url || '').toLowerCase().split('?')[0].endsWith('.mp4') ||
              (previewPhoto.url || '').toLowerCase().split('?')[0].endsWith('.mov') ||
              (previewPhoto.url || '').toLowerCase().split('?')[0].endsWith('.webm') ? (
                <video
                  src={previewPhoto.url}
                  controls
                  autoPlay
                  className="max-h-[80vh] max-w-[80vw] object-contain rounded-xl"
                />
              ) : (
                <img
                  src={previewPhoto.url}
                  alt="Full view"
                  className="max-h-[80vh] max-w-[80vw] object-contain rounded-xl"
                />
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

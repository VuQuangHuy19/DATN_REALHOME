'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import { Loader2, Search, Image as ImageIcon, CheckCircle2, Building2, Sparkles } from 'lucide-react';

interface ImagePickerFromDbModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  buildingId?: string;
  buildingCode?: string;
  buildingName?: string;
  companyId?: string;
}

interface ImageItem {
  id: string;
  url: string;
  room_id?: string;
  room_code?: string;
  is_building_photo?: boolean;
  created_at?: string;
}

export function ImagePickerFromDbModal({
  open,
  onOpenChange,
  onSelect,
  buildingId,
  buildingCode,
  buildingName,
  companyId,
}: ImagePickerFromDbModalProps) {
  const [buildingPhotos, setBuildingPhotos] = useState<ImageItem[]>([]);
  const [allPhotos, setAllPhotos] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'building' | 'all'>('building');
  const [search, setSearch] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchPhotos = async () => {
      setLoading(true);
      try {
        let roomIds: string[] = [];
        let roomCodeMap = new Map<string, string>();

        // 1. Lấy danh sách phòng thuộc tòa nhà hiện tại
        if (buildingId || buildingCode) {
          let roomQuery = supabase.from('rooms').select('id, code');
          if (buildingCode && buildingId) {
            roomQuery = roomQuery.or(`building_id.eq.${buildingCode},building_id.eq.${buildingId}`);
          } else if (buildingCode) {
            roomQuery = roomQuery.eq('building_id', buildingCode);
          } else if (buildingId) {
            roomQuery = roomQuery.eq('building_id', buildingId);
          }

          const { data: roomData } = await roomQuery;
          if (roomData && roomData.length > 0) {
            roomIds = roomData.map((r: any) => r.id);
            roomData.forEach((r: any) => roomCodeMap.set(r.id, r.code));
          }
        }

        // 2. Lấy ảnh thuộc các phòng của tòa nhà này
        let bPhotos: ImageItem[] = [];
        if (roomIds.length > 0) {
          const { data: roomImgs } = await supabase
            .from('room_images')
            .select('id, url, room_id, created_at')
            .in('room_id', roomIds)
            .order('created_at', { ascending: false });

          bPhotos = (roomImgs || []).map((img: any) => ({
            id: img.id,
            url: img.url,
            room_id: img.room_id,
            room_code: roomCodeMap.get(img.room_id),
            created_at: img.created_at,
          }));
        }

        // 3. Lấy ảnh đại diện tòa nhà nếu có
        if (buildingId) {
          const { data: bData } = await supabase
            .from('buildings')
            .select('image_url, thumbnail_url')
            .eq('id', buildingId)
            .single();

          if (bData?.image_url) {
            bPhotos.unshift({
              id: 'building_main',
              url: bData.image_url,
              is_building_photo: true,
            });
          }
        }

        // Loại bỏ trùng lặp URL cho danh sách ảnh tòa nhà
        const uniqueBMap = new Map<string, ImageItem>();
        bPhotos.forEach((item) => {
          if (item.url && !uniqueBMap.has(item.url)) {
            uniqueBMap.set(item.url, item);
          }
        });
        const finalBuildingPhotos = Array.from(uniqueBMap.values());
        setBuildingPhotos(finalBuildingPhotos);

        // Tự động chuyển tab 'all' nếu tòa nhà chưa có ảnh nào
        if (finalBuildingPhotos.length === 0) {
          setTab('all');
        } else {
          setTab('building');
        }

        // 4. Lấy danh sách ảnh tổng hợp trong công ty
        let allQuery = supabase
          .from('room_images')
          .select('id, url, room_id, created_at')
          .order('created_at', { ascending: false })
          .limit(80);

        if (companyId) {
          allQuery = allQuery.eq('company_id', companyId);
        }

        const { data: allData } = await allQuery;
        const uniqueAllMap = new Map<string, ImageItem>();
        (allData || []).forEach((item: any) => {
          if (item.url && !uniqueAllMap.has(item.url)) {
            uniqueAllMap.set(item.url, {
              id: item.id,
              url: item.url,
              room_id: item.room_id,
              created_at: item.created_at,
            });
          }
        });

        setAllPhotos(Array.from(uniqueAllMap.values()));
      } catch (err) {
        console.error('[ImagePickerFromDbModal] Error fetching photos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPhotos();
    setSelectedUrl(null);
    setSearch('');
  }, [open, buildingId, buildingCode, companyId]);

  const activePhotos = tab === 'building' ? buildingPhotos : allPhotos;
  const filteredPhotos = activePhotos.filter((p) =>
    search ? p.url.toLowerCase().includes(search.toLowerCase()) : true
  );

  const handleConfirm = () => {
    if (selectedUrl) {
      onSelect(selectedUrl);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 rounded-2xl border border-border bg-white shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border space-y-1">
          <div className="flex items-center gap-2 text-accent font-bold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4 text-accent" />
            Chọn Ảnh Trực Quan Từ Thư Viện DB
          </div>
          <DialogTitle className="text-lg font-bold text-ink flex items-center justify-between">
            <span>{buildingName ? `Ảnh của Tòa nhà: ${buildingName}` : 'Chọn ảnh đại diện có sẵn'}</span>
          </DialogTitle>
          <DialogDescription className="text-ink-muted text-xs">
            Nhấp trực tiếp vào ảnh thuộc tòa nhà này để làm ảnh đại diện mà không cần tải lại file.
          </DialogDescription>
        </DialogHeader>

        {/* Tab & Search Bar */}
        <div className="flex items-center justify-between gap-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('building')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                tab === 'building'
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'bg-bg-subtle text-ink-muted border-border hover:text-ink'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Ảnh Tòa nhà này ({buildingPhotos.length})
            </button>
            <button
              onClick={() => setTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                tab === 'all'
                  ? 'bg-accent text-white border-accent shadow-sm'
                  : 'bg-bg-subtle text-ink-muted border-border hover:text-ink'
              }`}
            >
              Tất cả ảnh hệ thống ({allPhotos.length})
            </button>
          </div>

          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted" />
            <Input
              placeholder="Lọc ảnh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs rounded-lg"
            />
          </div>
        </div>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto py-3 custom-scrollbar min-h-[280px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-ink-muted">
              <Loader2 className="w-6 h-6 animate-spin text-accent" />
              <p className="text-xs">Đang tải ảnh của tòa nhà từ DB...</p>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-ink-muted">
              <ImageIcon className="w-8 h-8 opacity-40" />
              <p className="text-xs">
                {tab === 'building'
                  ? 'Tòa nhà này chưa có ảnh nào trong DB phòng. Vui lòng chuyển tab "Tất cả ảnh" hoặc tải ảnh mới lên.'
                  : 'Không tìm thấy hình ảnh nào.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredPhotos.map((img) => {
                const isSelected = selectedUrl === img.url;
                return (
                  <div
                    key={img.id}
                    onClick={() => setSelectedUrl(img.url)}
                    className={`group relative aspect-4/3 rounded-xl border overflow-hidden cursor-pointer transition-all bg-slate-100 ${
                      isSelected
                        ? 'border-accent ring-2 ring-accent shadow-md scale-[1.02]'
                        : 'border-border hover:border-accent/60'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt="Building Photo"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />

                    {/* Room code badge if available */}
                    {img.room_code && (
                      <div className="absolute bottom-1.5 left-1.5">
                        <Badge className="bg-black/70 text-white text-[9px] font-bold px-1.5 py-0 border border-white/20">
                          P.{img.room_code}
                        </Badge>
                      </div>
                    )}

                    {img.is_building_photo && (
                      <div className="absolute bottom-1.5 left-1.5">
                        <Badge className="bg-emerald-600/90 text-white text-[9px] font-bold px-1.5 py-0">
                          Ảnh bìa hiện tại
                        </Badge>
                      </div>
                    )}

                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-accent text-white p-1 rounded-full shadow-md z-10">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-ink-muted">
            {selectedUrl ? '✓ Đã chọn 1 ảnh' : 'Nhấp vào ảnh để chọn ngay'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!selectedUrl}
              onClick={handleConfirm}
              className="bg-accent hover:bg-accent-500 text-white font-bold h-9 text-xs px-4"
            >
              Xác nhận chọn
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Upload, Trash2, Loader2, AlertCircle, Database, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { compressImage } from '@/lib/image-utils';
import { ImagePickerFromDbModal } from './ImagePickerFromDbModal';

interface ImageUploadProps {
  value?: string | string[] | null;
  onChange: (url: any, thumbnailUrl?: any, mediaType?: any) => void;
  bucket?: string;
  multiple?: boolean;
  className?: string;
  allowVideo?: boolean;
  buildingId?: string;
  buildingCode?: string;
  buildingName?: string;
}

interface InlinePhoto {
  id: string;
  url: string;
  room_code?: string;
}

export function ImageUpload({
  value,
  onChange,
  bucket = 'room_images',
  multiple = false,
  className,
  allowVideo = false,
  buildingId,
  buildingCode,
  buildingName,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDbPickerOpen, setIsDbPickerOpen] = useState(false);
  const [inlinePhotos, setInlinePhotos] = useState<InlinePhoto[]>([]);
  const [loadingInline, setLoadingInline] = useState(false);

  // Tự động load ảnh thuộc tòa nhà hiện tại để hiển thị trực quan ngay trong form
  useEffect(() => {
    if (!buildingId && !buildingCode) {
      setInlinePhotos([]);
      return;
    }

    let isMounted = true;
    const fetchBuildingPhotos = async () => {
      setLoadingInline(true);
      try {
        let roomQuery = supabase.from('rooms').select('id, code');
        if (buildingCode && buildingId) {
          roomQuery = roomQuery.or(`building_id.eq.${buildingCode},building_id.eq.${buildingId}`);
        } else if (buildingCode) {
          roomQuery = roomQuery.eq('building_id', buildingCode);
        } else if (buildingId) {
          roomQuery = roomQuery.eq('building_id', buildingId);
        }

        const { data: roomData } = await roomQuery;
        if (!roomData || roomData.length === 0) {
          if (isMounted) setInlinePhotos([]);
          return;
        }

        const roomList = (roomData || []) as { id: string; code: string }[];
        const roomIds = roomList.map((r) => r.id);
        const roomCodeMap = new Map<string, string>();
        roomList.forEach((r) => roomCodeMap.set(r.id, r.code));

        const { data: roomImgs } = await supabase
          .from('room_images')
          .select('id, url, room_id, created_at')
          .in('room_id', roomIds)
          .order('created_at', { ascending: false })
          .limit(30);

        if (isMounted) {
          const uniqueMap = new Map<string, InlinePhoto>();
          (roomImgs || []).forEach((img: any) => {
            if (img.url && !uniqueMap.has(img.url)) {
              uniqueMap.set(img.url, {
                id: img.id,
                url: img.url,
                room_code: roomCodeMap.get(img.room_id),
              });
            }
          });
          setInlinePhotos(Array.from(uniqueMap.values()));
        }
      } catch (err) {
        console.error('[ImageUpload] Error loading inline photos:', err);
      } finally {
        if (isMounted) setLoadingInline(false);
      }
    };

    fetchBuildingPhotos();
    return () => {
      isMounted = false;
    };
  }, [buildingId, buildingCode]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);

      const uploadPromises = Array.from(files).map(async (file) => {
        const isVideo = file.type.startsWith('video/');

        if (isVideo && !allowVideo) {
          throw new Error('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF).');
        }

        if (!isVideo && !file.type.startsWith('image/')) {
          throw new Error('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF).');
        }

        if (isVideo && file.size > 500 * 1024 * 1024) {
          throw new Error('Dung lượng video tối đa là 500 MB.');
        } else if (!isVideo && file.size > 11 * 1024 * 1024) {
          throw new Error('Dung lượng ảnh tối đa là 10 MB.');
        }

        let fileToUpload: File | Blob = file;
        if (!isVideo) {
          fileToUpload = await compressImage(file, 1600, 0.82);
        }

        const fileExt = (fileToUpload instanceof File ? fileToUpload.name : file.name).split('.').pop();
        const randomName = Math.random().toString(36).substring(2, 15);
        const timestamp = Date.now();
        const fileName = `${randomName}-${timestamp}.${fileExt}`;
        const filePath = `${fileName}`;

        let publicUrl = '';
        let thumbnailPublicUrl = null;

        try {
          const fd = new FormData();
          fd.append('file', fileToUpload, fileName);
          fd.append('pathPrefix', bucket);

          const r2Res = await fetch('/api/upload-r2', { method: 'POST', body: fd });
          const r2Data = await r2Res.json();

          if (r2Res.ok && r2Data.url) {
            publicUrl = r2Data.url;
            thumbnailPublicUrl = r2Data.url;
          } else {
            throw new Error(r2Data.error || 'Fallback to Supabase Storage');
          }
        } catch (r2Err) {
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, fileToUpload);

          if (uploadError) throw uploadError;

          const { data: { publicUrl: supUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

          publicUrl = supUrl;
        }

        return { publicUrl, thumbnailPublicUrl, isVideo };
      });

      const uploadedResults = await Promise.all(uploadPromises);

      if (multiple) {
        const urls = uploadedResults.map((r) => r.publicUrl);
        const thumbUrls = uploadedResults.map((r) => r.thumbnailPublicUrl);
        const mediaTypes = uploadedResults.map((r) => (r.isVideo ? 'video' : 'image'));
        onChange(urls, thumbUrls, mediaTypes);
      } else {
        onChange(
          uploadedResults[0].publicUrl,
          uploadedResults[0].thumbnailPublicUrl,
          uploadedResults[0].isVideo ? 'video' : 'image',
        );
      }
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setError(err.message || 'Lỗi khi tải ảnh lên. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!value || typeof value !== 'string') return;
    try {
      setError(null);
    } catch (err) {
      console.error('Error removing file from storage:', err);
    } finally {
      onChange(null, null);
    }
  };

  const handleSelectInlinePhoto = (photoUrl: string) => {
    if (multiple) {
      const currentArray = Array.isArray(value) ? value : value ? [value] : [];
      onChange([...currentArray, photoUrl], photoUrl);
    } else {
      onChange(photoUrl, photoUrl);
    }
  };

  return (
    <div className={`space-y-3 ${className || ''}`}>
      <div className="flex items-center gap-4">
        {!multiple && value && typeof value === 'string' ? (
          <div className="relative w-36 h-28 rounded-lg overflow-hidden border border-slate-200 group bg-slate-50 flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {value.toLowerCase().endsWith('.mp4') ||
            value.toLowerCase().endsWith('.mov') ||
            value.toLowerCase().endsWith('.webm') ? (
              <video src={value} className="object-cover w-full h-full pointer-events-none" />
            ) : (
              <img src={value} alt="Uploaded preview" className="object-cover w-full h-full" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Button type="button" variant="destructive" size="icon" onClick={handleRemove} className="h-8 w-8">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-36 h-28 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors bg-white shrink-0">
            {uploading ? (
              <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
            ) : (
              <>
                <Upload className="h-5 w-5 text-slate-400 mb-1" />
                <span className="text-xs font-medium text-slate-500">Tải ảnh lên</span>
              </>
            )}
            <input
              type="file"
              accept={allowVideo ? 'image/*,video/mp4,video/quicktime,video/webm' : 'image/*'}
              multiple={multiple}
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        )}

        <div className="flex-1 text-slate-500 text-xs space-y-1">
          <p className="font-semibold text-slate-600">Định dạng hỗ trợ</p>
          <p>PNG, JPG, WEBP, GIF (Tối đa 10 MB)</p>
          {allowVideo && <p>MP4, MOV, WEBM (Video tối đa 500 MB)</p>}
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDbPickerOpen(true)}
              className="h-7 text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 gap-1.5 font-medium"
            >
              <Database className="h-3.5 w-3.5 text-accent" />
              Mở Thư viện DB đầy đủ
            </Button>
          </div>
        </div>
      </div>

      {/* Hiển thị trực quan danh sách ảnh thuộc tòa nhà này ngay tại chỗ để bấm chọn 1-Click */}
      {(buildingId || buildingCode) && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>🖼️</span> Chọn nhanh từ ảnh thuộc Tòa nhà này:
            </span>
            {loadingInline && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          </div>

          {inlinePhotos.length === 0 && !loadingInline ? (
            <p className="text-[11px] text-slate-400 italic">
              Tòa nhà này chưa có ảnh phòng nào trong DB. Hãy tải ảnh mới hoặc mở Thư viện DB.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {inlinePhotos.map((photo) => {
                const isSelected = value === photo.url;
                return (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => handleSelectInlinePhoto(photo.url)}
                    className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all group ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-105 shadow-sm'
                        : 'border-slate-200 hover:border-emerald-400'
                    }`}
                    title={photo.room_code ? `Phòng ${photo.room_code}` : 'Ảnh tòa nhà'}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="Building inline photo" className="w-full h-full object-cover" />
                    {photo.room_code && (
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5 truncate">
                        P.{photo.room_code}
                      </span>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-150 rounded text-red-700 text-xs">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <ImagePickerFromDbModal
        open={isDbPickerOpen}
        onOpenChange={setIsDbPickerOpen}
        buildingId={buildingId}
        buildingCode={buildingCode}
        buildingName={buildingName}
        onSelect={(url) => {
          if (multiple) {
            const currentArray = Array.isArray(value) ? value : value ? [value] : [];
            onChange([...currentArray, url], url);
          } else {
            onChange(url, url);
          }
        }}
      />
    </div>
  );
}

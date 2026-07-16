'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Upload, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { compressImage } from '@/lib/image-utils';

interface ImageUploadProps {
  value?: string | string[] | null;
  onChange: (url: any, thumbnailUrl?: any, mediaType?: any) => void;
  bucket?: string;
  multiple?: boolean;
  className?: string;
  allowVideo?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  bucket = 'room_images',
  multiple = false,
  className,
  allowVideo = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setUploading(true);

      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file type
        const isVideo = file.type.startsWith('video/');

        if (isVideo && !allowVideo) {
          throw new Error('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF).');
        }

        if (!isVideo && !file.type.startsWith('image/')) {
          throw new Error('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF).');
        }

        // Validate file size (limit 10MB for image, 500MB for video)
        if (isVideo && file.size > 500 * 1024 * 1024) {
          throw new Error('Dung lượng video tối đa là 500 MB.');
        } else if (!isVideo && file.size > 11 * 1024 * 1024) {
          throw new Error('Dung lượng ảnh tối đa là 10 MB.');
        }

        let fileToUpload: File | Blob = file;
        let thumbToUpload: File | Blob | null = null;

        if (!isVideo) {
          // Nén/resize ảnh phía client trước khi upload
          fileToUpload = await compressImage(file, 1600, 0.82);
          // Tạo thêm bản thumbnail nhỏ (300px) để phục vụ trang danh sách/hiển thị nhanh
          thumbToUpload = await compressImage(file, 300, 0.80, true);
        }

        // Create unique path
        const fileExt = (fileToUpload instanceof File ? fileToUpload.name : file.name).split('.').pop();
        const randomName = Math.random().toString(36).substring(2, 15);
        const timestamp = Date.now();
        const fileName = `${randomName}-${timestamp}.${fileExt}`;
        const filePath = `${fileName}`;
        const thumbPath = `${randomName}-${timestamp}-thumb.${fileExt}`;

        // Upload main file to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, fileToUpload);

        if (uploadError) {
          throw uploadError;
        }

        let thumbnailPublicUrl = null;

        if (thumbToUpload) {
          const { error: thumbUploadError } = await supabase.storage
            .from(bucket)
            .upload(thumbPath, thumbToUpload);

          if (thumbUploadError) {
            console.warn('Could not upload thumbnail, but continuing with main file:', thumbUploadError.message);
          } else {
            const { data: thumbData } = supabase.storage
              .from(bucket)
              .getPublicUrl(thumbPath);
            thumbnailPublicUrl = thumbData.publicUrl;
          }
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        return { publicUrl, thumbnailPublicUrl, isVideo };
      });

      const uploadedResults = await Promise.all(uploadPromises);

      if (multiple) {
        const urls = uploadedResults.map(r => r.publicUrl);
        const thumbUrls = uploadedResults.map(r => r.thumbnailPublicUrl);
        const mediaTypes = uploadedResults.map(r => r.isVideo ? 'video' : 'image');
        onChange(urls, thumbUrls, mediaTypes);
      } else {
        onChange(uploadedResults[0].publicUrl, uploadedResults[0].thumbnailPublicUrl, uploadedResults[0].isVideo ? 'video' : 'image');
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
      
      // Parse file path from URL
      const urlParts = value.split(`/storage/v1/object/public/${bucket}/`);
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        const fileExt = filePath.split('.').pop();
        const baseName = filePath.replace(/\.[^/.]+$/, '');
        const thumbPath = `${baseName}-thumb.${fileExt}`;

        // Delete both main image and thumbnail from storage
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove([filePath, thumbPath]);
        
        if (deleteError) {
          console.warn('Could not delete files from storage bucket:', deleteError.message);
        }
      }
    } catch (err) {
      console.error('Error removing file from storage:', err);
    } finally {
      onChange(null, null);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        {!multiple && value && typeof value === 'string' ? (
          <div className="relative w-36 h-28 rounded-lg overflow-hidden border border-slate-200 group bg-slate-50 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {value.toLowerCase().endsWith('.mp4') || value.toLowerCase().endsWith('.mov') || value.toLowerCase().endsWith('.webm') ? (
              <video src={value} className="object-cover w-full h-full pointer-events-none" />
            ) : (
              <img
                src={value}
                alt="Uploaded preview"
                className="object-cover w-full h-full"
              />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleRemove}
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-36 h-28 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors bg-white">
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
              accept={allowVideo ? "image/*,video/mp4,video/quicktime,video/webm" : "image/*"}
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
          <p>{multiple ? 'Chọn và tải lên cùng lúc nhiều file.' : 'File sẽ được tự động tải lên.'}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-2 p-2 bg-red-50 border border-red-150 rounded text-red-700 text-xs">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}

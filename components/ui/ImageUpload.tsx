'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Upload, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  value?: string | string[] | null;
  onChange: (url: any) => void;
  bucket?: string;
  multiple?: boolean;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  bucket = 'room_images',
  multiple = false,
  className,
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
        if (!file.type.startsWith('image/')) {
          throw new Error('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF).');
        }

        // Validate file size (limit 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('Dung lượng ảnh tối đa là 10 MB.');
        }

        // Create unique path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload file to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      if (multiple) {
        onChange(uploadedUrls);
      } else {
        onChange(uploadedUrls[0]);
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
        // Delete from storage
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove([filePath]);
        
        if (deleteError) {
          console.warn('Could not delete file from storage bucket:', deleteError.message);
        }
      }
    } catch (err) {
      console.error('Error removing file from storage:', err);
    } finally {
      onChange(null);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-4">
        {!multiple && value && typeof value === 'string' ? (
          <div className="relative w-36 h-28 rounded-lg overflow-hidden border border-slate-200 group bg-slate-50 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Uploaded preview"
              className="object-cover w-full h-full"
            />
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
              accept="image/*"
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
          <p>{multiple ? 'Chọn và tải lên cùng lúc nhiều ảnh.' : 'Ảnh sẽ được tự động tải lên lưu trữ đám mây.'}</p>
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

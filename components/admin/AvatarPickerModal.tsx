'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Upload, Check, Loader2, Image as ImageIcon, Sparkles, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { compressImage, computeFileHash } from '@/src/lib/image-utils';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface AvatarPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  userId?: string;
  onSelectAvatar: (url: string) => Promise<void>;
  isEn?: boolean;
}

// Bộ ảnh gợi ý sẵn chuyên nghiệp dành cho Môi giới / Sale
const SUGGESTED_AVATARS = [
  { id: 's1', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80', label: 'Sale Nữ Chuyên Nghiệp 1' },
  { id: 's2', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80', label: 'Sale Nữ Chuyên Nghiệp 2' },
  { id: 's3', url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80', label: 'Sale Nữ Sang Trọng' },
  { id: 's4', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', label: 'Sale Nữ Năng Động' },
  { id: 's5', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80', label: 'Sale Nam Lịch Lãm 1' },
  { id: 's6', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80', label: 'Sale Nam Lịch Lãm 2' },
  { id: 's7', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', label: 'Sale Nam Thân Thiện' },
  { id: 's8', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80', label: 'Sale Nam Uy Tín' },
];

export function AvatarPickerModal({
  isOpen,
  onClose,
  currentAvatarUrl,
  userId,
  onSelectAvatar,
  isEn = false,
}: AvatarPickerModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [userUploadedPhotos, setUserUploadedPhotos] = useState<string[]>([]);
  const [pastAvatars, setPastAvatars] = useState<string[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(currentAvatarUrl || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedUrl(currentAvatarUrl || null);
  }, [currentAvatarUrl]);

  // Fetch lịch sử ảnh đã tải lên của người dùng từ Database / Storage
  useEffect(() => {
    if (!isOpen || !userId) return;

    async function fetchUserPhotoHistory() {
      try {
        setLoadingHistory(true);

        // 1. Fetch past avatars and KYC photos from Supabase
        const { data: kycData } = await supabase
          .from('kyc_verifications')
          .select('selfie_url, id_card_front_url, id_card_back_url')
          .eq('profile_id', userId);

        const historyUrls: string[] = [];
        if (kycData && kycData.length > 0) {
          kycData.forEach((item: { selfie_url?: string | null }) => {
            if (item.selfie_url) historyUrls.push(item.selfie_url);
          });
        }

        // Add current avatar if exists
        if (currentAvatarUrl) {
          historyUrls.unshift(currentAvatarUrl);
        }

        // Deduplicate URLs
        const uniqueHistory = Array.from(new Set(historyUrls.filter(Boolean)));
        setUserUploadedPhotos(uniqueHistory);
        setPastAvatars(uniqueHistory.filter(u => u === currentAvatarUrl || u.includes('avatar')));
      } catch (err) {
        console.error('Error fetching user photo history:', err);
      } finally {
        setLoadingHistory(false);
      }
    }

    fetchUserPhotoHistory();
  }, [isOpen, userId, currentAvatarUrl]);

  if (!isOpen) return null;

  // Xử lý nén ảnh + Băm SHA-256 chống lặp + Tải ảnh mới lên
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      // 1. Nén ảnh thông minh client-side
      const compressed = await compressImage(file, 800, 0.85);

      // 2. Tính mã băm SHA-256 chống lặp dung lượng & file trùng
      const fileHash = await computeFileHash(compressed);
      const fileExt = compressed.name.split('.').pop() || 'jpg';
      const fileName = `avatar_${userId}_${fileHash.slice(0, 12)}.${fileExt}`;

      // 3. Upload lên Cloudflare R2 / Supabase Storage
      const fd = new FormData();
      fd.append('file', compressed, fileName);
      fd.append('pathPrefix', 'avatars');

      let uploadedUrl = '';
      try {
        const r2Res = await fetch('/api/upload-r2', { method: 'POST', body: fd });
        const r2Data = await r2Res.json();
        if (r2Res.ok && r2Data.url) {
          uploadedUrl = r2Data.url;
        } else {
          throw new Error('Fallback storage');
        }
      } catch {
        const filePath = `${userId}/${fileName}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(filePath, compressed, { upsert: true });

        if (uploadErr) throw uploadErr;

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        uploadedUrl = publicUrlData.publicUrl;
      }

      // Thêm vào danh sách lịch sử & tự động chọn
      setUserUploadedPhotos(prev => [uploadedUrl, ...prev.filter(u => u !== uploadedUrl)]);
      setSelectedUrl(uploadedUrl);

      // Thực thi cập nhật avatar trực tiếp
      setSaving(true);
      await onSelectAvatar(uploadedUrl);
      toast.success(isEn ? 'Avatar updated successfully' : '✨ Đã tải lên và chọn ảnh đại diện mới thành công!');
      onClose();
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast.error(err.message || 'Không thể tải ảnh lên');
    } finally {
      setUploading(false);
      setSaving(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleConfirmSelect = async (url: string) => {
    try {
      setSaving(true);
      setSelectedUrl(url);
      await onSelectAvatar(url);
      toast.success(isEn ? 'Avatar updated successfully' : '✨ Đã thay đổi ảnh đại diện thành công!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu ảnh đại diện');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Facebook Style */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
            {isEn ? 'Select Profile Picture' : 'Chọn ảnh đại diện'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin">
          {/* Top Button + Tải ảnh lên */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {isEn ? 'Upload custom photo from device' : 'Tải ảnh mới từ thiết bị của bạn'}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {isEn ? 'Automatic compression & SHA-256 deduplication' : 'Tự động nén ảnh nhẹ & chống tải trùng lặp dung lượng'}
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-md cursor-pointer shrink-0"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang tải...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Tải ảnh lên</span>
                </>
              )}
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Section 1: Ảnh gợi ý sẵn (Suggested Avatars) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>{isEn ? 'Suggested Avatars' : 'Ảnh gợi ý cho Môi giới'}</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">Bộ sưu tập mẫu</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {SUGGESTED_AVATARS.map((item) => {
                const isSelected = selectedUrl === item.url;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleConfirmSelect(item.url)}
                    className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-105 ${
                      isSelected
                        ? 'border-indigo-600 ring-4 ring-indigo-500/20 shadow-lg'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                    }`}
                    title={item.label}
                  >
                    <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Ảnh đã tải lên của người dùng */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>{isEn ? 'Uploaded Photos' : 'Ảnh đã tải lên'}</span>
              </h3>
              {userUploadedPhotos.length > 0 && (
                <span className="text-xs text-slate-400 font-medium">{userUploadedPhotos.length} ảnh</span>
              )}
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mr-2" />
                <span className="text-xs text-slate-500 font-medium">Đang tải lịch sử ảnh...</span>
              </div>
            ) : userUploadedPhotos.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 font-medium">Chưa có ảnh nào được tải lên trước đây. Nhấn nút <b>&quot;+ Tải ảnh lên&quot;</b> để thêm ảnh của bạn!</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {userUploadedPhotos.map((url, idx) => {
                  const isSelected = selectedUrl === url;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleConfirmSelect(url)}
                      className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-105 ${
                        isSelected
                          ? 'border-indigo-600 ring-4 ring-indigo-500/20 shadow-lg'
                          : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                      }`}
                    >
                      <img src={url} alt={`Uploaded ${idx}`} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <span className="text-xs text-slate-400 font-medium">
            {saving ? 'Đang cập nhật ảnh đại diện...' : 'Nhấp vào bất kỳ hình ảnh nào để chọn làm Ảnh đại diện'}
          </span>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="text-xs font-bold rounded-xl px-5 py-2"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}

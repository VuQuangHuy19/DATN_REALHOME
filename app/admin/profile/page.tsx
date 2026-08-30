'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Building2, Shield, Mail, Phone, ShieldCheck, Camera, Eye, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAppPreferences } from '@/components/providers/AppPreferencesProvider';
import { compressImage } from '@/src/lib/image-utils';
import KYCForm from '@/components/kyc/KYCForm';
import { AvatarPickerModal } from '@/components/admin/AvatarPickerModal';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  company_admin: 'Quản trị viên',
  manager: 'Quản lý',
  sales_agent: 'Nhân viên Sales',
  landlord: 'Chủ nhà',
  customer: 'Khách hàng',
};

export default function AdminProfilePage() {
  const { user, profile, company, role, refreshSession } = useAuth();
  const { language } = useAppPreferences();
  const isEn = language === 'en';
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [showAvatarPreview, setShowAvatarPreview] = useState(false);
  const [showAvatarPickerModal, setShowAvatarPickerModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleSelectAvatarUrl = async (newUrl: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
    const res = await fetch('/api/auth/update-profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ avatar_url: newUrl }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Cập nhật ảnh đại diện thất bại');

    await refreshSession();
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [profile, user]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      setShowAvatarMenu(false);

      // 1. Compress Image
      const compressed = await compressImage(file, 800, 0.85);
      const fileExt = compressed.name.split('.').pop() || 'jpg';
      const fileName = `avatar_${user?.id}_${Date.now()}.${fileExt}`;

      // 2. Upload to Cloudflare R2 / Supabase Storage
      const fd = new FormData();
      fd.append('file', compressed, fileName);
      fd.append('pathPrefix', 'avatars');

      let avatarUrl = '';
      try {
        const r2Res = await fetch('/api/upload-r2', { method: 'POST', body: fd });
        const r2Data = await r2Res.json();
        if (r2Res.ok && r2Data.url) {
          avatarUrl = r2Data.url;
        } else {
          throw new Error('Fallback storage');
        }
      } catch {
        const filePath = `${user?.id}/${fileName}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(filePath, compressed, { upsert: true });

        if (uploadErr) throw uploadErr;

        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = publicUrlData.publicUrl;
      }

      // 3. Update Profile Database
      const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
      const res = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cập nhật ảnh đại diện thất bại');

      toast.success(isEn ? 'Avatar updated successfully' : '✨ Đã cập nhật ảnh đại diện mới thành công!');
      await refreshSession();
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      toast.error(err.message || 'Lỗi khi tải ảnh đại diện lên');
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // 1. Update Profile (Name & Phone)
      const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
      const res = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ full_name: fullName, phone }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isEn ? 'Failed to update profile' : 'Cập nhật hồ sơ thất bại'));

      // 2. Update Email if changed
      if (user?.email !== email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) {
          throw new Error((isEn ? 'Failed to update email: ' : 'Cập nhật email thất bại: ') + emailError.message);
        }
        toast.info(isEn ? 'Please check your new email inbox to confirm the change.' : 'Vui lòng kiểm tra hộp thư của email mới để xác nhận thay đổi.');
      }

      toast.success(isEn ? 'Profile updated successfully' : 'Đã cập nhật thông tin thành công');
      await refreshSession();
    } catch (err: any) {
      toast.error(err.message || (isEn ? 'An error occurred' : 'Có lỗi xảy ra'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      <div className="mb-6">
        <h1 className="text-3xl font-black font-heading text-slate-900 dark:text-slate-100">{isEn ? 'Personal Profile' : 'Hồ sơ cá nhân'}</h1>
        <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">{isEn ? 'Manage your personal info and account' : 'Quản lý thông tin cá nhân và tài khoản của bạn'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cột trái: Thông tin tổng quan */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-md rounded-3xl overflow-hidden">
            <CardContent className="pt-8 pb-8 px-6 flex flex-col items-center text-center">
              {/* Interactive Avatar with Camera Badge & Dropdown */}
              <div className="relative mb-5 group">
                <Avatar 
                  onClick={() => setShowAvatarMenu(prev => !prev)}
                  className="h-32 w-32 ring-4 ring-indigo-100 dark:ring-indigo-950 shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <AvatarImage src={profile?.avatar_url ?? undefined} className="object-cover" />
                  <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-3xl font-black">
                    <User className="h-14 w-14" />
                  </AvatarFallback>
                </Avatar>

                <button
                  type="button"
                  onClick={() => setShowAvatarMenu(prev => !prev)}
                  disabled={uploadingAvatar}
                  className="absolute bottom-1 right-1 p-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg border-2 border-white dark:border-slate-900 transition-all cursor-pointer hover:scale-110 active:scale-95 disabled:opacity-50"
                  title={isEn ? 'Change avatar' : 'Tùy chọn ảnh đại diện'}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <Camera className="h-4.5 w-4.5" />
                  )}
                </button>

                {/* Facebook-style Avatar Menu */}
                {showAvatarMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowAvatarMenu(false)} 
                    />
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-60 sm:w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                      {profile?.avatar_url && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAvatarMenu(false);
                            setShowAvatarPreview(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left cursor-pointer whitespace-nowrap"
                        >
                          <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>{isEn ? 'View Avatar' : 'Xem ảnh đại diện'}</span>
                        </button>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => {
                          setShowAvatarMenu(false);
                          setShowAvatarPickerModal(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-left cursor-pointer whitespace-nowrap"
                      >
                        <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <span>{isEn ? 'Select Profile Picture' : 'Chọn ảnh đại diện'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              <input
                type="file"
                ref={avatarInputRef}
                onChange={handleAvatarFileChange}
                accept="image/*"
                className="hidden"
              />
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">{profile?.full_name || (isEn ? 'Unnamed' : 'Chưa đặt tên')}</h2>
              <p className="text-sm font-mono text-slate-500 mt-1">{user?.email}</p>
              
              <div className="w-full mt-6 space-y-3">
                <div className="flex items-center gap-3.5 text-sm p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-xs text-slate-500 font-medium">{isEn ? 'Role' : 'Vai trò'}</p>
                    <p className="font-extrabold text-slate-900 dark:text-slate-100 text-base">{role ? ROLE_LABELS[role] || role : '—'}</p>
                  </div>
                </div>
                
                {company && (
                  <div className="flex items-center gap-3.5 text-sm p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-xs text-slate-500 font-medium">{isEn ? 'Company' : 'Công ty trực thuộc'}</p>
                      <p className="font-extrabold text-slate-900 dark:text-slate-100 text-base line-clamp-1">{company.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cột phải: Form chỉnh sửa */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-md rounded-3xl">
            <CardHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xl font-black text-slate-900 dark:text-slate-100">{isEn ? 'Update Information' : 'Cập nhật thông tin'}</CardTitle>
              <CardDescription className="text-sm">{isEn ? 'Edit your basic details' : 'Chỉnh sửa các thông tin cơ bản của bạn'}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-6">
              <form onSubmit={handleSave} noValidate className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name" className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{isEn ? 'Full Name' : 'Họ và tên'}</Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="full_name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={isEn ? "Ex: John Doe" : "VD: Nguyễn Văn A"}
                        className="pl-10 h-11 text-sm font-semibold rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{isEn ? 'Phone Number' : 'Số điện thoại'}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={isEn ? "Ex: 0901234567" : "VD: 0901234567"}
                        className="pl-10 h-11 text-sm font-semibold rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{isEn ? 'Email Address' : 'Địa chỉ Email'}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isEn ? "Ex: email@example.com" : "VD: email@example.com"}
                      className="pl-10 h-11 text-sm font-semibold rounded-xl"
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {isEn ? 'If you change your email, a confirmation link will be sent to the new address.' : 'Nếu bạn thay đổi email, một liên kết xác nhận sẽ được gửi đến email mới.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button type="submit" className="h-11 px-8 text-sm font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isEn ? 'Save Changes' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Thẻ Xác thực KYC & Badge Nguồn hàng sạch / Môi giới chính thức */}
          {user?.id && (role === 'landlord' || role === 'sales_agent') && (
            <KYCForm
              userId={user.id}
              userRole={role === 'landlord' ? 'landlord' : 'sale'}
              landlordId={profile?.landlord_id ?? undefined}
              companyId={profile?.company_id ?? undefined}
            />
          )}
        </div>
      </div>

      {/* Lightbox Preview Avatar Modal */}
      {showAvatarPreview && profile?.avatar_url && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowAvatarPreview(false)}
        >
          <div 
            className="relative bg-slate-900 rounded-3xl p-5 max-w-md w-full flex flex-col items-center gap-4 shadow-2xl border border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between px-1">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <User className="w-4.5 h-4.5 text-indigo-400" /> {profile.full_name || 'Ảnh đại diện'}
              </span>
              <button
                type="button"
                onClick={() => setShowAvatarPreview(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative overflow-hidden rounded-2xl border-2 border-slate-700 shadow-xl bg-slate-950 flex items-center justify-center">
              <img
                src={profile.avatar_url}
                alt="Avatar Full Preview"
                className="w-72 h-72 sm:w-80 sm:h-80 object-cover"
              />
            </div>

            <div className="w-full flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-medium">RealHome Profile Photo</span>
              <Button
                type="button"
                onClick={() => {
                  setShowAvatarPreview(false);
                  avatarInputRef.current?.click();
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl px-4 py-2 flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isEn ? 'Upload New Photo' : 'Đổi ảnh mới'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Facebook-style Avatar Selection Modal */}
      <AvatarPickerModal
        isOpen={showAvatarPickerModal}
        onClose={() => setShowAvatarPickerModal(false)}
        currentAvatarUrl={profile?.avatar_url}
        userId={user?.id}
        onSelectAvatar={handleSelectAvatarUrl}
        isEn={isEn}
      />
    </div>
  );
}

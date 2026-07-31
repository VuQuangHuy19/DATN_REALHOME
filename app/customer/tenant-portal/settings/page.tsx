'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Settings, User, Mail, Phone, Shield, Bell, Key,
  Save, Loader2, Camera, MapPin, Sun, Moon, Laptop,
  Palette, Globe, DollarSign, LayoutGrid, Type, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTheme } from 'next-themes';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { profile, user, refreshSession, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Password Dialog States
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'change' | 'forgot_step1' | 'forgot_step2'>('change');
  
  // Change Password form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Forgot Password form (Mailjet OTP)
  const [forgotEmail, setForgotEmail] = useState(profile?.email || user?.email || '');
  const [otpCode, setOtpCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const hasPassword = !!profile?.has_password;
  const isGoogleUser = user?.app_metadata?.provider === 'google';

  // Profile form state
  const [fullName, setFullName] = useState(profile?.full_name || user?.user_metadata?.full_name || 'Quang Chung');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email] = useState(profile?.email || user?.email || '');
  const [address, setAddress] = useState('Đang tải địa chỉ...');

  // Sync profile data when loaded/refetched
  useEffect(() => {
    if (profile) {
      if (profile.full_name) setFullName(profile.full_name);
      if (profile.phone) setPhone(profile.phone);
    }
  }, [profile]);

  // Fetch real active apartment address
  useEffect(() => {
    async function fetchUserAddress() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
        const res = await fetch('/api/customer/tenant-portal/contracts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const apiData = await res.json();
        const contract = apiData.contracts?.[0];
        if (contract?.rooms) {
          const roomCode = contract.rooms.code;
          const buildingName = contract.rooms.buildings?.name || 'Tòa nhà';
          setAddress(`Phòng ${roomCode} - ${buildingName}`);
        } else {
          setAddress('Chưa có căn hộ đang thuê');
        }
      } catch (err) {
        console.error('Lỗi lấy địa chỉ căn hộ:', err);
        setAddress('Chưa có thông tin căn hộ');
      }
    }
    fetchUserAddress();
  }, []);

  // Personalization state
  const [language, setLanguage] = useState('vi');
  const [currency, setCurrency] = useState('VND');
  const [viewMode, setViewMode] = useState('grid');
  const [fontSize, setFontSize] = useState('standard');
  const [autoSaveDraft, setAutoSaveDraft] = useState(true);

  // Notification preferences
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSMS, setNotifSMS] = useState(false);
  const [notifPush, setNotifPush] = useState(true);
  const [notifMention, setNotifMention] = useState(true);

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState('Nguyễn Thị B');
  const [emergencyPhone, setEmergencyPhone] = useState('0987 654 321');
  const [emergencyRelation, setEmergencyRelation] = useState('Mẹ');

  const handleSave = async () => {
    if (!user) {
      toast.error('Bạn cần đăng nhập để lưu cài đặt');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Đã lưu tất cả cài đặt cá nhân hóa thành công!');
      await refreshSession();
    } catch (err: any) {
      console.error('Error saving profile:', err);
      toast.error('Không thể lưu thông tin. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasPassword && !oldPassword) {
      toast.error('Vui lòng nhập mật khẩu cũ');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsChangingPassword(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ oldPassword: hasPassword ? oldPassword : '', password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Đổi mật khẩu thất bại');

      toast.success('Đổi mật khẩu thành công! Hệ thống đang chuyển về trang đăng nhập...');
      setPasswordDialogOpen(false);
      await refreshSession();
      
      // Chuyển về trang đăng nhập để người dùng đăng nhập bằng mật khẩu mới
      setTimeout(async () => {
        await signOut();
        router.push('/login');
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi cập nhật mật khẩu');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Gửi mã OTP khôi phục qua Mailjet
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = forgotEmail || profile?.email || user?.email;
    if (!targetEmail) {
      toast.error('Không tìm thấy địa chỉ email');
      return;
    }

    setIsSendingOtp(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', value: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Không thể gửi email OTP');

      toast.success(`Đã gửi mã xác nhận OTP 6 số qua Mailjet tới email: ${targetEmail}`);
      setDialogMode('forgot_step2');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi gửi mã OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Xác nhận OTP và Đặt lại mật khẩu mới
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      toast.error('Vui lòng nhập đủ mã OTP 6 chữ số');
      return;
    }
    if (resetPassword.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }
    if (resetPassword !== confirmResetPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsResettingPassword(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otpCode, newPassword: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Khôi phục mật khẩu thất bại');

      toast.success('Đặt lại mật khẩu thành công! Hệ thống đang chuyển về trang đăng nhập...');
      setPasswordDialogOpen(false);
      await refreshSession();

      // Chuyển về trang đăng nhập
      setTimeout(async () => {
        await signOut();
        router.push('/login');
      }, 1000);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khôi phục mật khẩu');
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-ink-muted">
        <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        <span className="text-sm font-semibold">Đang tải cài đặt...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-ink font-heading flex items-center gap-2">
          <Settings className="h-7 w-7 text-amber-600" />
          Cài đặt &amp; Hồ sơ cá nhân
        </h1>
        <p className="text-sm text-ink-muted mt-1">Quản lý thông tin cá nhân, giao diện, cài đặt thông báo và bảo mật</p>
      </div>

      {/* Hồ sơ cá nhân */}
      <Card className="border border-border-subtle">
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <User className="h-5 w-5 text-amber-600" />
          <h2 className="text-base font-bold text-ink font-heading">Thông tin cá nhân</h2>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center relative group cursor-pointer shadow-sm">
              <User className="h-7 w-7 text-amber-700 dark:text-amber-300" />
              <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <p className="text-base font-extrabold text-ink">{fullName}</p>
              <Badge className="bg-amber-100 text-amber-950 border border-amber-400 text-[10px] font-extrabold mt-1">Khách thuê</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-ink-muted mb-1.5 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-amber-600" /> Họ và tên
              </label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-muted mb-1.5 flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-amber-600" /> Số điện thoại
              </label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-muted mb-1.5 flex items-center gap-1">
                <Mail className="h-3.5 w-3.5 text-amber-600" /> Email
              </label>
              <Input value={email} disabled className="rounded-xl bg-bg-subtle cursor-not-allowed font-medium" />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-muted mb-1.5 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-amber-600" /> Địa chỉ căn hộ
              </label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 🎨 Cá nhân hóa giao diện & Ứng dụng */}
      <Card className="border border-border-subtle shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Palette className="h-5 w-5 text-amber-600" />
          <h2 className="text-base font-bold text-ink font-heading">Cá nhân hóa giao diện &amp; Ứng dụng</h2>
        </CardHeader>
        <CardContent className="pt-0 space-y-5">
          {/* Chủ đề / Theme Toggle */}
          <div>
            <label className="text-xs font-bold text-ink-muted mb-2.5 block">Chủ đề hiển thị (Theme)</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'light', label: 'Chế độ Sáng', icon: Sun },
                { value: 'dark', label: 'Chế độ Tối', icon: Moon },
                { value: 'system', label: 'Theo hệ thống', icon: Laptop },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border text-xs font-bold transition-all ${
                      active
                        ? 'border-amber-500 bg-amber-500/20 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400/50 shadow-sm'
                        : 'border-border-subtle bg-bg-subtle text-ink-muted hover:border-amber-400/60 hover:text-ink'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${active ? 'text-amber-700 dark:text-amber-400' : ''}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid Ngôn ngữ, Tiền tệ & Chế độ xem */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-border-subtle">
            <div>
              <label className="text-xs font-bold text-ink-muted mb-1.5 flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-amber-600" /> Ngôn ngữ hiển thị
              </label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vi">🇻🇳 Tiếng Việt (VN)</SelectItem>
                  <SelectItem value="en">🇺🇸 English (US)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-ink-muted mb-1.5 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-amber-600" /> Đơn vị tiền tệ
              </label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VND">VNĐ (₫) — Việt Nam Đồng</SelectItem>
                  <SelectItem value="USD">USD ($) — US Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-ink-muted mb-1.5 flex items-center gap-1">
                <LayoutGrid className="h-3.5 w-3.5 text-amber-600" /> Chế độ hiển thị danh sách
              </label>
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Bảng Lưới (Grid View)</SelectItem>
                  <SelectItem value="list">Bảng Danh sách (List View)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cỡ chữ & Tự động lưu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border-subtle">
            <div>
              <label className="text-xs font-bold text-ink-muted mb-1.5 flex items-center gap-1">
                <Type className="h-3.5 w-3.5 text-amber-600" /> Cỡ chữ giao diện
              </label>
              <Select value={fontSize} onValueChange={setFontSize}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Tiêu chuẩn (Standard 14px)</SelectItem>
                  <SelectItem value="large">Cỡ chữ lớn (Large 16px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-bg-subtle border border-border-subtle mt-1 sm:mt-0">
              <div>
                <p className="text-xs font-bold text-ink flex items-center gap-1">
                  <RefreshCw className="h-3.5 w-3.5 text-amber-600" /> Tự động lưu nháp
                </p>
                <p className="text-[10px] text-ink-muted">Tự động lưu nháp nội dung khi báo sự cố</p>
              </div>
              <Switch checked={autoSaveDraft} onCheckedChange={setAutoSaveDraft} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liên hệ khẩn cấp */}
      <Card className="border border-border-subtle">
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Phone className="h-5 w-5 text-red-500" />
          <h2 className="text-base font-bold text-ink font-heading">Liên hệ khẩn cấp</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-ink-muted mb-1.5 block">Họ tên</label>
              <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-muted mb-1.5 block">Số điện thoại</label>
              <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-muted mb-1.5 block">Quan hệ</label>
              <Input value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} className="rounded-xl" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cài đặt thông báo */}
      <Card className="border border-border-subtle">
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Bell className="h-5 w-5 text-amber-600" />
          <h2 className="text-base font-bold text-ink font-heading">Cài đặt thông báo</h2>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-semibold text-ink">Thông báo qua Email</p>
              <p className="text-xs text-ink-muted">Nhận hóa đơn, nhắc nhở thanh toán qua email</p>
            </div>
            <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border-subtle">
            <div>
              <p className="text-sm font-semibold text-ink">Thông báo qua SMS</p>
              <p className="text-xs text-ink-muted">Nhận tin nhắn SMS khi có thông báo quan trọng</p>
            </div>
            <Switch checked={notifSMS} onCheckedChange={setNotifSMS} />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border-subtle">
            <div>
              <p className="text-sm font-semibold text-ink">Push Notification</p>
              <p className="text-xs text-ink-muted">Thông báo đẩy trên trình duyệt</p>
            </div>
            <Switch checked={notifPush} onCheckedChange={setNotifPush} />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border-subtle">
            <div>
              <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
                Thông báo khi bị @Mention
                <Badge className="bg-amber-100 text-amber-950 border border-amber-400 text-[9px] font-extrabold">Mới</Badge>
              </p>
              <p className="text-xs text-ink-muted">Nhận thông báo khi BQL hoặc bộ phận gắn thẻ bạn</p>
            </div>
            <Switch checked={notifMention} onCheckedChange={setNotifMention} />
          </div>
        </CardContent>
      </Card>

      {/* Bảo mật */}
      <Card className="border border-border-subtle">
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Shield className="h-5 w-5 text-amber-600" />
          <h2 className="text-base font-bold text-ink font-heading">Bảo mật</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <Button
            onClick={() => setPasswordDialogOpen(true)}
            variant="outline"
            className="rounded-xl border-amber-500 text-amber-950 dark:text-amber-100 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 font-extrabold shadow-sm"
          >
            <Key className="h-4 w-4 mr-2 text-amber-700 dark:text-amber-400" />
            {profile?.has_password ? 'Đổi mật khẩu' : 'Tạo mật khẩu đăng nhập'}
          </Button>
        </CardContent>
      </Card>

      {/* 🔑 Dialog Đổi / Tạo / Quên mật khẩu */}
      <Dialog
        open={passwordDialogOpen}
        onOpenChange={(open) => {
          setPasswordDialogOpen(open);
          if (!open) {
            setDialogMode('change');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setOtpCode('');
            setResetPassword('');
            setConfirmResetPassword('');
          }
        }}
      >
        <DialogContent className="max-w-md p-6 rounded-2xl">
          {dialogMode === 'change' && (
            <>
              <DialogHeader className="border-b border-border-subtle pb-3">
                <DialogTitle className="text-lg font-extrabold font-heading text-ink flex items-center gap-2">
                  <Key className="h-5 w-5 text-amber-600" />
                  {hasPassword ? 'Đổi mật khẩu tài khoản' : 'Tạo mật khẩu đăng nhập trực tiếp'}
                </DialogTitle>
                <DialogDescription className="text-xs text-ink-muted mt-1">
                  {hasPassword
                    ? 'Nhập mật khẩu hiện tại và mật khẩu mới để cập nhật.'
                    : 'Tài khoản của bạn đăng nhập qua Google. Bạn có thể tạo thêm mật khẩu riêng bên dưới để đăng nhập bằng ô Email + Mật khẩu.'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                {hasPassword && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-ink-muted block">Mật khẩu hiện tại *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setDialogMode('forgot_step1');
                          setForgotEmail(profile?.email || user?.email || '');
                        }}
                        className="text-xs font-bold text-amber-700 hover:text-amber-800 hover:underline"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <Input
                      type="password"
                      placeholder="Nhập mật khẩu cũ..."
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                      className="rounded-xl"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-ink-muted mb-1 block">Mật khẩu mới *</label>
                  <Input
                    type="password"
                    placeholder="Tối thiểu 6 ký tự..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink-muted mb-1 block">Xác nhận mật khẩu mới *</label>
                  <Input
                    type="password"
                    placeholder="Nhập lại mật khẩu mới..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>

                <DialogFooter className="border-t border-border-subtle pt-4 flex justify-between gap-2">
                  <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)} className="rounded-xl font-bold">
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    disabled={isChangingPassword}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-md"
                  >
                    {isChangingPassword ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang cập nhật...</>
                    ) : (
                      <><Save className="h-4 w-4 mr-2" /> Lưu mật khẩu</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}

          {dialogMode === 'forgot_step1' && (
            <>
              <DialogHeader className="border-b border-border-subtle pb-3">
                <DialogTitle className="text-lg font-extrabold font-heading text-ink flex items-center gap-2">
                  <Mail className="h-5 w-5 text-amber-600" />
                  Quên mật khẩu — Gửi mã OTP Mailjet
                </DialogTitle>
                <DialogDescription className="text-xs text-ink-muted mt-1">
                  Mã xác nhận OTP 6 số sẽ được gửi tới Email tài khoản của bạn để khôi phục mật khẩu.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSendOtp} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-ink-muted mb-1 block">Email nhận mã OTP *</label>
                  <Input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="rounded-xl font-semibold"
                  />
                </div>

                <DialogFooter className="border-t border-border-subtle pt-4 flex justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogMode('change')}
                    className="rounded-xl font-bold text-xs"
                  >
                    Quay lại
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSendingOtp}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-md text-xs"
                  >
                    {isSendingOtp ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang gửi Mailjet...</>
                    ) : (
                      <><Mail className="h-4 w-4 mr-2" /> Gửi mã xác nhận OTP</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}

          {dialogMode === 'forgot_step2' && (
            <>
              <DialogHeader className="border-b border-border-subtle pb-3">
                <DialogTitle className="text-lg font-extrabold font-heading text-ink flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  Nhập mã OTP &amp; Đặt mật khẩu mới
                </DialogTitle>
                <DialogDescription className="text-xs text-ink-muted mt-1">
                  Nhập mã OTP 6 chữ số vừa gửi tới <strong className="text-amber-700 font-mono">{forgotEmail}</strong>
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-ink-muted mb-1 block">Mã xác nhận OTP (6 số) *</label>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="VD: 123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    className="rounded-xl font-mono text-center tracking-widest text-lg font-extrabold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink-muted mb-1 block">Mật khẩu mới *</label>
                  <Input
                    type="password"
                    placeholder="Tối thiểu 6 ký tự..."
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-ink-muted mb-1 block">Xác nhận mật khẩu mới *</label>
                  <Input
                    type="password"
                    placeholder="Nhập lại mật khẩu mới..."
                    value={confirmResetPassword}
                    onChange={(e) => setConfirmResetPassword(e.target.value)}
                    required
                    className="rounded-xl"
                  />
                </div>

                <DialogFooter className="border-t border-border-subtle pt-4 flex justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogMode('forgot_step1')}
                    className="rounded-xl font-bold text-xs"
                  >
                    Gửi lại mã
                  </Button>
                  <Button
                    type="submit"
                    disabled={isResettingPassword}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md text-xs"
                  >
                    {isResettingPassword ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang khôi phục...</>
                    ) : (
                      <><Save className="h-4 w-4 mr-2" /> Xác nhận đặt lại mật khẩu</>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Nút Lưu */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl px-8 shadow-md"
        >
          {isSaving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang lưu...</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> Lưu thay đổi</>
          )}
        </Button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Eye, EyeOff, Sun, Moon, Laptop, Mail, Smartphone } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

// ─── Tab: Bảo mật ─────────────────────────────────────────────────────────────
function SecurityTab() {
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Trạng thái cho Dialog Quên mật khẩu
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetMethod, setResetMethod] = useState<'email' | 'phone' | null>(null);
  const [contactValue, setContactValue] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Chọn method & nhập, 2: Nhập mã, 3: Đặt lại MK mới
  const [resetLoading, setResetLoading] = useState(false);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword) return toast.error('Vui lòng nhập mật khẩu cũ');
    if (password.length < 6) return toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự');
    if (password !== confirmPassword) return toast.error('Mật khẩu xác nhận không khớp');

    setLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ oldPassword, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Đổi mật khẩu thất bại');
      toast.success('Đổi mật khẩu thành công!');
      setOldPassword('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!contactValue) return toast.error('Vui lòng nhập thông tin');
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: resetMethod, value: contactValue }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Có lỗi xảy ra');
      toast.success(data.message || 'Đã gửi mã xác nhận');
      setStep(2);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyAndReset = async () => {
    if (newResetPassword.length < 6) return toast.error('Mật khẩu phải có tối thiểu 6 ký tự');
    if (newResetPassword !== confirmResetPassword) return toast.error('Mật khẩu không khớp');
    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: otp, newPassword: newResetPassword }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Có lỗi xảy ra');
      toast.success('Đã khôi phục mật khẩu thành công!');
      setForgotOpen(false);
      // Reset state
      setStep(1); setResetMethod(null); setContactValue(''); setOtp(''); setNewResetPassword(''); setConfirmResetPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
        <div className="space-y-1.5 text-left">
          <Label htmlFor="old-password">Mật khẩu cũ <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Input
              id="old-password"
              type={showPassword ? 'text' : 'password'}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5 text-left">
          <Label htmlFor="new-password">Mật khẩu mới <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5 text-left">
          <Label htmlFor="confirm-password">Xác nhận mật khẩu <span className="text-red-500">*</span></Label>
          <Input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        <div className="flex items-center justify-between pt-2">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Đổi mật khẩu
          </Button>
          <Button 
            type="button" 
            variant="link" 
            className="text-sm px-0" 
            onClick={() => {
              setForgotOpen(true);
              setStep(1);
              setResetMethod(null);
              setContactValue('');
              setOtp('');
              setNewResetPassword('');
              setConfirmResetPassword('');
            }}
          >
            Quên mật khẩu?
          </Button>
        </div>
      </form>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quên mật khẩu</DialogTitle>
            <DialogDescription>
              {step === 1 && "Chọn phương thức để lấy lại mật khẩu."}
              {step === 2 && "Nhập mã xác nhận chúng tôi vừa gửi cho bạn."}
              {step === 3 && "Đặt lại mật khẩu mới cho tài khoản của bạn."}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4 py-2">
              {!resetMethod ? (
                <div className="grid grid-cols-1 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col gap-2" onClick={() => setResetMethod('email')}>
                    <Mail className="h-6 w-6 text-primary" />
                    <span>Qua Email</span>
                  </Button>
                  {/* Tạm ẩn SMS theo yêu cầu */}
                  <Button variant="outline" className="h-20 hidden flex-col gap-2" onClick={() => setResetMethod('phone')}>
                    <Smartphone className="h-6 w-6 text-primary" />
                    <span>Qua SMS</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{resetMethod === 'email' ? 'Email của bạn' : 'Số điện thoại của bạn'}</Label>
                    <Input 
                      placeholder={resetMethod === 'email' ? 'Ví dụ: nguyenvan@gmail.com' : 'Ví dụ: 0987654321'} 
                      value={contactValue}
                      onChange={(e) => setContactValue(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setResetMethod(null)}>Quay lại</Button>
                    <Button onClick={handleSendCode} disabled={!contactValue || resetLoading}>
                      {resetLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Nhận mã
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center space-y-6 py-4">
              <InputOTP maxLength={6} value={otp} onChange={(val) => {
                setOtp(val);
                if (val.length === 6) {
                  // Chuyển sang bước nhập pass mới
                  setStep(3);
                }
              }}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <div className="text-sm text-muted-foreground flex gap-2">
                Chưa nhận được mã? <Button variant="link" className="h-auto p-0 text-sm" onClick={handleSendCode} disabled={resetLoading}>Gửi lại</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="reset-new">Mật khẩu mới <span className="text-red-500">*</span></Label>
                <Input
                  id="reset-new"
                  type={showPassword ? 'text' : 'password'}
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reset-confirm">Xác nhận mật khẩu mới <span className="text-red-500">*</span></Label>
                <Input
                  id="reset-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleVerifyAndReset} disabled={resetLoading}>
                {resetLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Xác nhận đổi mật khẩu
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab: Giao diện ───────────────────────────────────────────────────────────
function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', label: 'Sáng', icon: Sun },
    { value: 'dark', label: 'Tối', icon: Moon },
    { value: 'system', label: 'Theo hệ thống', icon: Laptop },
  ];

  return (
    <div className="space-y-4 max-w-md mx-auto text-center">
      <p className="text-sm text-ink-muted">Chọn chủ đề hiển thị cho ứng dụng.</p>
      <div className="grid grid-cols-3 gap-3 max-w-md">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors ${
                active
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border-subtle text-ink-muted hover:border-accent/40 hover:text-ink'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Thông báo ───────────────────────────────────────────────────────────
function NotificationsTab() {
  const [emailNoti, setEmailNoti] = useState(true);
  const [smsNoti, setSmsNoti] = useState(false);

  return (
    <div className="space-y-4 max-w-md mx-auto text-left">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ink">Thông báo qua Email</p>
          <p className="text-xs text-ink-muted">Nhận email khi có lịch hẹn hoặc tin nhắn tư vấn mới</p>
        </div>
        <Switch checked={emailNoti} onCheckedChange={setEmailNoti} />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ink">Thông báo qua SMS</p>
          <p className="text-xs text-ink-muted">Nhận SMS nhắc lịch xem nhà</p>
        </div>
        <Switch checked={smsNoti} onCheckedChange={setSmsNoti} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CustomerSettingsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-ink mb-6 text-center">Cài đặt</h1>

      <Card className="text-center">
        <CardHeader>
          <CardTitle>Tuỳ chỉnh tài khoản</CardTitle>
          <CardDescription>Quản lý bảo mật, giao diện và thông báo</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="security">
            <div className="flex justify-center mb-6">
              <TabsList>
                <TabsTrigger value="security">Bảo mật</TabsTrigger>
                <TabsTrigger value="appearance">Giao diện</TabsTrigger>
                <TabsTrigger value="notifications">Thông báo</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="security">
              <SecurityTab />
            </TabsContent>
            <TabsContent value="appearance">
              <AppearanceTab />
            </TabsContent>
            <TabsContent value="notifications">
              <NotificationsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

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
import { Loader2, Eye, EyeOff, Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from 'next-themes';

// ─── Tab: Bảo mật ─────────────────────────────────────────────────────────────
function SecurityTab() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Đổi mật khẩu thất bại');
      toast.success('Đổi mật khẩu thành công!');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div className="space-y-1.5">
        <Label htmlFor="new-password">Mật khẩu mới</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password">Xác nhận mật khẩu</Label>
        <Input
          id="confirm-password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Đổi mật khẩu
      </Button>
    </form>
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
    <div className="space-y-4">
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
    <div className="space-y-4 max-w-md">
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
      <h1 className="text-2xl font-bold text-ink mb-6">Cài đặt</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tuỳ chỉnh tài khoản</CardTitle>
          <CardDescription>Quản lý bảo mật, giao diện và thông báo</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="security">
            <TabsList>
              <TabsTrigger value="security">Bảo mật</TabsTrigger>
              <TabsTrigger value="appearance">Giao diện</TabsTrigger>
              <TabsTrigger value="notifications">Thông báo</TabsTrigger>
            </TabsList>
            <TabsContent value="security" className="pt-4">
              <SecurityTab />
            </TabsContent>
            <TabsContent value="appearance" className="pt-4">
              <AppearanceTab />
            </TabsContent>
            <TabsContent value="notifications" className="pt-4">
              <NotificationsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

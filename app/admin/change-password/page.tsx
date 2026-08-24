'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { role } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!oldPassword) errs.oldPassword = 'Không được để trống';
    if (!password) errs.password = 'Không được để trống';
    else if (password.length < 6) errs.password = 'Mật khẩu mới phải có tối thiểu 6 ký tự';
    if (!confirmPassword) errs.confirmPassword = 'Không được để trống';
    else if (password !== confirmPassword) errs.confirmPassword = 'Mật khẩu xác nhận không khớp';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldPassword, password }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Đổi mật khẩu thất bại');
      }

      toast.success('Đổi mật khẩu thành công!', {
        description: 'Mật khẩu mới của bạn đã được cập nhật.',
        duration: 3000,
      });

      // Chuyển hướng về trang chủ tương ứng sau 1.5 giây
      setTimeout(() => {
        if (role === 'landlord') {
          router.push('/landlord');
        } else {
          router.push('/admin');
        }
      }, 1500);

    } catch (err: any) {
      toast.error('Không thể đổi mật khẩu', {
        description: err.message || 'Có lỗi xảy ra, vui lòng thử lại.',
      });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="max-w-md mx-auto mt-10 px-4">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <Lock className="h-5 w-5 text-indigo-650" />
            Đổi mật khẩu tài khoản
          </CardTitle>
          <CardDescription>
            Đặt mật khẩu mới để bảo mật tài khoản của bạn.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="old-password">Mật khẩu hiện tại *</Label>
              <Input
                id="old-password"
                type="password"
                placeholder="Nhập mật khẩu hiện tại của bạn"
                value={oldPassword}
                onChange={(e) => {
                  setOldPassword(e.target.value);
                  if (e.target.value) setErrors(prev => ({ ...prev, oldPassword: '' }));
                }}
                className={errors.oldPassword ? 'border-rose-500 focus:ring-rose-500' : ''}
              />
              {errors.oldPassword && (
                <p className="text-xs font-bold text-rose-500 mt-1">⚠️ {errors.oldPassword}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">Mật khẩu mới *</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (e.target.value) setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  className={`pr-10 ${errors.password ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs font-bold text-rose-500 mt-1">⚠️ {errors.password}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Xác nhận mật khẩu mới *</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (e.target.value) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                }}
                className={errors.confirmPassword ? 'border-rose-500 focus:ring-rose-500' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-xs font-bold text-rose-500 mt-1">⚠️ {errors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-black text-white hover:bg-zinc-800" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                'Cập nhật mật khẩu'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

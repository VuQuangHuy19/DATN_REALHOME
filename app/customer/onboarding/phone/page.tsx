'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Loader2, ArrowRight } from 'lucide-react';

export default function PhoneOnboardingPage() {
  const router = useRouter();
  const { profile, refreshSession } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic Vietnam phone validation
    const phoneRegex = /(03|05|07|08|09)\d{8}/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      setError('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
      const res = await fetch('/api/auth/update-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ phone: phone.replace(/\s+/g, '') }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Cập nhật thất bại');
      }

      toast.success('Đã cập nhật số điện thoại thành công!');
      await refreshSession();
      router.push('/customer');
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/customer');
  };

  // Nếu người dùng đã có SĐT, không cần hiển thị trang này
  if (profile?.phone) {
    router.push('/customer');
    return null;
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border-subtle">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-accent-soft rounded-full flex items-center justify-center mb-2">
            <Phone className="w-6 h-6 text-accent" />
          </div>
          <CardTitle className="text-2xl font-bold">Chào mừng {profile?.full_name || 'bạn'}!</CardTitle>
          <CardDescription className="text-base">
            Vui lòng cung cấp số điện thoại để chúng tôi có thể liên hệ và hỗ trợ bạn đặt lịch xem phòng nhanh chóng nhất.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="09xx xxx xxx"
                  value={phone}
                  onChange={(e) => {
                    setError(null);
                    setPhone(e.target.value);
                  }}
                  className="pl-10 h-11"
                  autoFocus
                />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading || !phone}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {loading ? 'Đang lưu...' : 'Hoàn tất & Tiếp tục'}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center border-t border-slate-100 pt-4">
          <Button variant="ghost" className="text-slate-500 text-sm" onClick={handleSkip}>
            Bỏ qua bước này
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Building2, Shield, Mail, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAppPreferences } from '@/components/providers/AppPreferencesProvider';

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

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [profile, user]);

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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-ink">{isEn ? 'Personal Profile' : 'Hồ sơ cá nhân'}</h1>
        <p className="text-sm text-ink-muted mt-1">{isEn ? 'Manage your personal info and account' : 'Quản lý thông tin cá nhân và tài khoản của bạn'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cột trái: Thông tin tổng quan */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4 ring-4 ring-accent-soft">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-bg-subtle text-ink-muted text-2xl">
                  <User className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-semibold text-ink">{profile?.full_name || (isEn ? 'Unnamed' : 'Chưa đặt tên')}</h2>
              <p className="text-sm text-ink-muted mt-1">{user?.email}</p>
              
              <div className="w-full mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm p-3 bg-bg-subtle rounded-lg">
                  <Shield className="h-4 w-4 text-accent" />
                  <div className="text-left flex-1">
                    <p className="text-xs text-ink-muted font-medium">{isEn ? 'Role' : 'Vai trò'}</p>
                    <p className="font-semibold text-ink">{role ? ROLE_LABELS[role] || role : '—'}</p>
                  </div>
                </div>
                
                {company && (
                  <div className="flex items-center gap-3 text-sm p-3 bg-bg-subtle rounded-lg">
                    <Building2 className="h-4 w-4 text-accent" />
                    <div className="text-left flex-1">
                      <p className="text-xs text-ink-muted font-medium">{isEn ? 'Company' : 'Công ty trực thuộc'}</p>
                      <p className="font-semibold text-ink line-clamp-1">{company.name}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cột phải: Form chỉnh sửa */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{isEn ? 'Update Information' : 'Cập nhật thông tin'}</CardTitle>
              <CardDescription>{isEn ? 'Edit your basic details' : 'Chỉnh sửa các thông tin cơ bản của bạn'}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="full_name">{isEn ? 'Full Name' : 'Họ và tên'}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                      <Input
                        id="full_name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={isEn ? "Ex: John Doe" : "VD: Nguyễn Văn A"}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone">{isEn ? 'Phone Number' : 'Số điện thoại'}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                      <Input
                        id="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder={isEn ? "Ex: 0901234567" : "VD: 0901234567"}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">{isEn ? 'Email Address' : 'Địa chỉ Email'}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={isEn ? "Ex: email@example.com" : "VD: email@example.com"}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    {isEn ? 'If you change your email, a confirmation link will be sent to the new address.' : 'Nếu bạn thay đổi email, một liên kết xác nhận sẽ được gửi đến email mới.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-border-subtle flex justify-end">
                  <Button type="submit" className="bg-accent hover:bg-accent-500 text-white" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isEn ? 'Save Changes' : 'Lưu thay đổi'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

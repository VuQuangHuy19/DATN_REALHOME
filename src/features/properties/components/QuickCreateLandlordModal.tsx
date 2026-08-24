import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { DBLandlord } from '@/lib/supabase/types';

interface QuickCreateLandlordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newLandlord: DBLandlord) => void;
}

export function QuickCreateLandlordModal({ isOpen, onClose, onCreated }: QuickCreateLandlordModalProps) {
  const { company } = useAuth();
  const [saving, setSaving] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string || '').trim();
    const phone = (formData.get('phone') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const code = (formData.get('code') as string || '').trim();
    const system_name = (formData.get('system_name') as string || '').trim();

    const newErrors: Record<string, string> = {};
    if (!name) newErrors.name = 'Không được để trống';
    if (!phone) newErrors.phone = 'Không được để trống';
    if (!email) newErrors.email = 'Không được để trống';
    if (!code) newErrors.code = 'Không được để trống';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    const payload = {
      company_id: company?.id ?? '',
      name,
      system_name: system_name || null,
      phone: phone || null,
      email: email || null,
      code: code || null,
      address: (formData.get('address') as string || '').trim() || null,
      properties_count: 0,
      notes: (formData.get('notes') as string || '').trim() || null,
      bank_name: (formData.get('bank_name') as string || '').trim() || null,
      bank_account_number: (formData.get('bank_account_number') as string || '').trim() || null,
      bank_account_owner: (formData.get('bank_account_owner') as string || '').trim() || null,
      image_url: imageUrl,
    };
    
    try {
      const res = await fetch('/api/landlords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      const resData = await res.json();
      
      if (!res.ok) {
        toast.error(resData.error || 'Không thể tạo chủ nhà');
      } else {
        const emailAddress = payload.email;
        if (resData.emailSent) {
          toast.success('Tạo chủ nhà thành công!', {
            description: `Email kích hoạt đã gửi đến ${emailAddress}`,
            icon: <Mail className="h-4 w-4" />,
            duration: 6000,
          });
        } else if (emailAddress) {
          toast.warning('Tạo chủ nhà thành công, nhưng gửi email thất bại!', {
            description: resData.emailError || 'Có lỗi khi gửi email',
            duration: 8000,
          });
        } else {
          toast.success('Tạo chủ nhà thành công!');
        }
        
        if (resData.data) {
          onCreated(resData.data);
        }
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg rounded-lg border border-border bg-white">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg text-ink font-bold">
            Tạo nhanh Chủ nhà
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} noValidate className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quick-name" className="text-ink font-semibold text-xs uppercase tracking-wider">Họ tên <span className="text-red-500">*</span></Label>
              <Input
                id="quick-name"
                name="name"
                onChange={() => errors.name && setErrors(prev => ({ ...prev, name: '' }))}
                className={`rounded-lg border-border mt-1.5 focus-visible:ring-accent ${errors.name ? 'border-red-500 ring-1 ring-red-500' : ''}`}
              />
              {errors.name && <p className="text-xs font-semibold text-red-500 mt-1">⚠️ {errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="quick-phone" className="text-ink font-semibold text-xs uppercase tracking-wider">Số điện thoại <span className="text-red-500">*</span></Label>
              <Input 
                id="quick-phone" 
                name="phone" 
                onChange={() => errors.phone && setErrors(prev => ({ ...prev, phone: '' }))}
                className={`rounded-lg border-border mt-1.5 focus-visible:ring-accent ${errors.phone ? 'border-red-500 ring-1 ring-red-500' : ''}`}
              />
              {errors.phone && <p className="text-xs font-semibold text-red-500 mt-1">⚠️ {errors.phone}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quick-email" className="text-ink font-semibold text-xs uppercase tracking-wider">Email <span className="text-red-500">*</span></Label>
              <Input 
                id="quick-email" 
                name="email" 
                type="email" 
                onChange={() => errors.email && setErrors(prev => ({ ...prev, email: '' }))}
                className={`rounded-lg border-border mt-1.5 focus-visible:ring-accent ${errors.email ? 'border-red-500 ring-1 ring-red-500' : ''}`}
              />
              {errors.email && <p className="text-xs font-semibold text-red-500 mt-1">⚠️ {errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="quick-code" className="text-ink font-semibold text-xs uppercase tracking-wider">Mã Chủ Nhà <span className="text-red-500">*</span></Label>
              <Input
                id="quick-code"
                name="code"
                placeholder="Ví dụ: DH01"
                onChange={() => errors.code && setErrors(prev => ({ ...prev, code: '' }))}
                className={`rounded-lg border-border mt-1.5 focus-visible:ring-accent ${errors.code ? 'border-red-500 ring-1 ring-red-500' : ''}`}
              />
              {errors.code && <p className="text-xs font-semibold text-red-500 mt-1">⚠️ {errors.code}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quick-system_name" className="text-ink font-semibold text-xs uppercase tracking-wider">Tên hệ thống / Thương hiệu</Label>
              <Input
                id="quick-system_name"
                name="system_name"
                placeholder="Ví dụ: HT Home"
                className="rounded-lg border-border mt-1.5 focus-visible:ring-accent font-semibold"
              />
            </div>
            <div>
              <Label htmlFor="quick-address" className="text-ink font-semibold text-xs uppercase tracking-wider">Địa chỉ</Label>
              <Input id="quick-address" name="address" className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
            </div>
          </div>
          <div>
            <Label htmlFor="quick-notes" className="text-ink font-semibold text-xs uppercase tracking-wider">Ghi chú</Label>
            <Input id="quick-notes" name="notes" className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
          </div>

          <div className="border-t border-border pt-3 mt-3 space-y-2">
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Tài khoản Ngân hàng (Nhận doanh thu)
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <Label htmlFor="quick-bank_name" className="text-ink font-semibold text-[10px] uppercase">Ngân hàng</Label>
                <Input id="quick-bank_name" name="bank_name" placeholder="MB Bank, VCB..." className="rounded-lg border-border mt-1 text-xs" />
              </div>
              <div>
                <Label htmlFor="quick-bank_account_number" className="text-ink font-semibold text-[10px] uppercase">Số tài khoản</Label>
                <Input id="quick-bank_account_number" name="bank_account_number" placeholder="0123456789" className="rounded-lg border-border mt-1 text-xs font-mono" />
              </div>
              <div>
                <Label htmlFor="quick-bank_account_owner" className="text-ink font-semibold text-[10px] uppercase">Chủ tài khoản</Label>
                <Input id="quick-bank_account_owner" name="bank_account_owner" placeholder="NGUYEN VAN A" className="rounded-lg border-border mt-1 text-xs uppercase" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Hình ảnh chủ nhà</Label>
            <ImageUpload value={imageUrl} onChange={setImageUrl} bucket="landlords" />
          </div>

          <Button type="submit" className="w-full bg-accent hover:bg-accent-500 text-white rounded-lg mt-2" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

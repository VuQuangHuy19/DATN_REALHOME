import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Mail } from 'lucide-react';
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

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      company_id: company?.id ?? '',
      name: formData.get('name') as string,
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      code: formData.get('code') as string || null,
      address: formData.get('address') as string || null,
      properties_count: 0,
      notes: formData.get('notes') as string || null,
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
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quick-name" className="text-ink font-semibold text-xs uppercase tracking-wider">Họ tên <span className="text-red-500">*</span></Label>
              <Input id="quick-name" name="name" required className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
            </div>
            <div>
              <Label htmlFor="quick-phone" className="text-ink font-semibold text-xs uppercase tracking-wider">Số điện thoại <span className="text-red-500">*</span></Label>
              <Input 
                id="quick-phone" 
                name="phone" 
                required 
                onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Không được để trống')}
                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quick-email" className="text-ink font-semibold text-xs uppercase tracking-wider">Email <span className="text-red-500">*</span></Label>
              <Input 
                id="quick-email" 
                name="email" 
                type="email" 
                required 
                onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Không được để trống')}
                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" 
              />
            </div>
            <div>
              <Label htmlFor="quick-code" className="text-ink font-semibold text-xs uppercase tracking-wider">Mã Chủ Nhà <span className="text-red-500">*</span></Label>
              <Input id="quick-code" name="code" placeholder="Ví dụ: TH03" required className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
            </div>
          </div>
          <div>
            <Label htmlFor="quick-address" className="text-ink font-semibold text-xs uppercase tracking-wider">Địa chỉ</Label>
            <Input id="quick-address" name="address" className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
          </div>
          <div>
            <Label htmlFor="quick-notes" className="text-ink font-semibold text-xs uppercase tracking-wider">Ghi chú</Label>
            <Input id="quick-notes" name="notes" className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
          </div>
          <div className="space-y-2">
            <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Hình ảnh chủ nhà</Label>
            <ImageUpload value={imageUrl} onChange={setImageUrl} bucket="landlords" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving} className="text-ink hover:bg-bg-subtle rounded-lg">
              Hủy
            </Button>
            <Button type="submit" className="bg-accent hover:bg-accent-500 text-white rounded-lg" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Tạo Chủ nhà
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

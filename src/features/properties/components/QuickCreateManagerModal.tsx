import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { DBManager } from '@/lib/supabase/types';

interface QuickCreateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  landlordId: string;
  onCreated: (newManager: DBManager) => void;
}

export function QuickCreateManagerModal({ isOpen, onClose, landlordId, onCreated }: QuickCreateManagerModalProps) {
  const { company } = useAuth();
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [managerType, setManagerType] = useState<'individual' | 'company'>('individual');

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    
    const formData = new FormData(e.currentTarget);
    const payload = {
      company_id: company?.id ?? '',
      name: formData.get('name') as string,
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      landlord_id: landlordId,
      manager_type: managerType,
      company_name: managerType === 'company' ? formData.get('company_name') as string : null,
      avatar_url: avatarUrl,
    };
    
    try {
      const res = await fetch('/api/managers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      const resData = await res.json();
      
      if (!res.ok) {
        toast.error(resData.error || 'Không thể tạo quản lý');
      } else {
        const emailAddress = payload.email;
        if (resData.emailSent) {
          toast.success('Tạo quản lý thành công!', {
            description: `Email kích hoạt đã gửi đến ${emailAddress}`,
            icon: <Mail className="h-4 w-4" />,
            duration: 6000,
          });
        } else if (emailAddress) {
          toast.warning('Tạo quản lý thành công, nhưng gửi email thất bại!', {
            description: resData.emailError || 'Có lỗi khi gửi email',
            duration: 8000,
          });
        } else {
          toast.success('Tạo quản lý thành công!');
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
            Tạo nhanh Quản lý tòa nhà
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Loại Quản lý</Label>
            <select
              value={managerType}
              onChange={(e) => setManagerType(e.target.value as 'individual' | 'company')}
              className="flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="individual">Cá nhân</option>
              <option value="company">Pháp nhân (Công ty)</option>
            </select>
          </div>

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
              <Label htmlFor="quick-email" className="text-ink font-semibold text-xs uppercase tracking-wider">Email (Để tạo TK)</Label>
              <Input 
                id="quick-email" 
                name="email" 
                type="email" 
                className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" 
              />
            </div>
          </div>

          {managerType === 'company' && (
            <div>
              <Label htmlFor="quick-company" className="text-ink font-semibold text-xs uppercase tracking-wider">Tên công ty <span className="text-red-500">*</span></Label>
              <Input id="quick-company" name="company_name" required className="rounded-lg border-border mt-1.5 focus-visible:ring-accent" />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-ink font-semibold text-xs uppercase tracking-wider">Hình ảnh quản lý</Label>
            <ImageUpload value={avatarUrl} onChange={setAvatarUrl} bucket="managers" />
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving} className="text-ink hover:bg-bg-subtle rounded-lg">
              Hủy
            </Button>
            <Button type="submit" className="bg-accent hover:bg-accent-500 text-white rounded-lg" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Tạo Quản lý
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

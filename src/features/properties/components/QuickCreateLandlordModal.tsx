import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, CreditCard, Database } from 'lucide-react';
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
      system_name: formData.get('system_name') as string || null,
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      code: formData.get('code') as string || null,
      address: formData.get('address') as string || null,
      properties_count: 0,
      notes: formData.get('notes') as string || null,
      bank_name: formData.get('bank_name') as string || null,
      bank_account_number: formData.get('bank_account_number') as string || null,
      bank_account_owner: formData.get('bank_account_owner') as string || null,
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
      <DialogContent className="max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2 border-b border-slate-100">
          <DialogTitle className="font-heading text-lg text-slate-900 font-bold">
            Thêm chủ nhà
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 pt-3">
          {/* Row 1: Họ tên & SĐT */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quick-name" className="text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                HỌ TÊN <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quick-name"
                name="name"
                required
                className="rounded-xl border-slate-200 mt-1.5 focus-visible:ring-indigo-500 text-sm h-10"
              />
            </div>
            <div>
              <Label htmlFor="quick-phone" className="text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                SỐ ĐIỆN THOẠI <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="quick-phone" 
                name="phone" 
                required 
                onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Không được để trống')}
                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                className="rounded-xl border-slate-200 mt-1.5 focus-visible:ring-indigo-500 text-sm h-10" 
              />
            </div>
          </div>

          {/* Row 2: Email & Mã chủ nhà */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quick-email" className="text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                EMAIL <span className="text-red-500">*</span>
              </Label>
              <Input 
                id="quick-email" 
                name="email" 
                type="email" 
                required 
                onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Không được để trống')}
                onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                className="rounded-xl border-slate-200 mt-1.5 focus-visible:ring-indigo-500 text-sm h-10" 
              />
            </div>
            <div>
              <Label htmlFor="quick-code" className="text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                MÃ CHỦ NHÀ <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quick-code"
                name="code"
                placeholder="Ví dụ: DH01"
                required
                className="rounded-xl border-slate-200 mt-1.5 focus-visible:ring-indigo-500 text-sm h-10"
              />
            </div>
          </div>

          {/* Row 3: Tên hệ thống / Thương hiệu & Địa chỉ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quick-system_name" className="text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                TÊN HỆ THỐNG / THƯƠNG HIỆU
              </Label>
              <Input
                id="quick-system_name"
                name="system_name"
                placeholder="Ví dụ: HT Home"
                className="rounded-xl border-slate-200 mt-1.5 focus-visible:ring-indigo-500 text-sm h-10"
              />
            </div>
            <div>
              <Label htmlFor="quick-address" className="text-slate-700 font-bold text-[11px] uppercase tracking-wider">
                ĐỊA CHỈ
              </Label>
              <Input
                id="quick-address"
                name="address"
                className="rounded-xl border-slate-200 mt-1.5 focus-visible:ring-indigo-500 text-sm h-10"
              />
            </div>
          </div>

          {/* Row 4: Ghi chú */}
          <div>
            <Label htmlFor="quick-notes" className="text-slate-700 font-bold text-[11px] uppercase tracking-wider">
              GHI CHÚ
            </Label>
            <Input
              id="quick-notes"
              name="notes"
              className="rounded-xl border-slate-200 mt-1.5 focus-visible:ring-indigo-500 text-sm h-10"
            />
          </div>

          {/* Bank Account Section */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="h-4 w-4" /> TÀI KHOẢN NGÂN HÀNG (NHẬN DOANH THU)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="quick-bank_name" className="text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                  NGÂN HÀNG
                </Label>
                <Input
                  id="quick-bank_name"
                  name="bank_name"
                  placeholder="MB Bank, VCB..."
                  className="rounded-xl border-slate-200 mt-1 text-xs h-10"
                />
              </div>
              <div>
                <Label htmlFor="quick-bank_account_number" className="text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                  SỐ TÀI KHOẢN
                </Label>
                <Input
                  id="quick-bank_account_number"
                  name="bank_account_number"
                  placeholder="0123456789"
                  className="rounded-xl border-slate-200 mt-1 text-xs font-mono h-10"
                />
              </div>
              <div>
                <Label htmlFor="quick-bank_account_owner" className="text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                  CHỦ TÀI KHOẢN
                </Label>
                <Input
                  id="quick-bank_account_owner"
                  name="bank_account_owner"
                  placeholder="NGUYEN VAN A"
                  className="rounded-xl border-slate-200 mt-1 text-xs uppercase h-10"
                />
              </div>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="space-y-2 pt-1">
            <Label className="text-slate-700 font-bold text-[11px] uppercase tracking-wider">
              HÌNH ẢNH CHỦ NHÀ
            </Label>
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              bucket="landlords"
              extraAction={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 flex items-center gap-1.5 rounded-lg h-8 px-3"
                  onClick={() => toast.info('Chức năng thư viện DB mở rộng')}
                >
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  Mở Thư viện DB đầy đủ
                </Button>
              }
            />
          </div>

          {/* Submit button */}
          <div className="pt-3">
            <Button 
              type="submit" 
              className="w-full bg-[#1f568e] hover:bg-[#184675] text-white font-bold h-11 rounded-xl shadow-md transition-all text-sm" 
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Lưu
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

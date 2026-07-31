'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';


const schema = z.object({
  customerName: z.string().min(1, 'Bạn cần nhập Họ và tên'),
  customerPhone: z
    .string()
    .min(1, 'Bạn cần nhập Số điện thoại')
    .regex(/^[0-9+\s\-()]{8,15}$/, 'Số điện thoại không hợp lệ'),
  viewingDate: z.string().min(1, 'Bạn cần nhập Ngày đi xem'),
  viewingTime: z.string().min(1, 'Bạn cần nhập Giờ đi xem'),
});

type FormValues = z.infer<typeof schema>;

interface ViewingProperty {
  id: string;
  title: string;
  address: string;
  area?: string;
}

interface ViewingRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  property: ViewingProperty | null;
}

export function ViewingRequestDialog({
  open,
  onOpenChange,
  companyId,
  property,
}: ViewingRequestDialogProps) {
  const { profile } = useAuth();
  const [consentChecked, setConsentChecked] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open && profile) {
      if (profile.full_name) setValue('customerName', profile.full_name);
      if (profile.phone) setValue('customerPhone', profile.phone);
    }
  }, [open, profile, setValue]);

  const onSubmit = async (data: FormValues) => {
    if (!property) return;

    // Chuẩn hóa định dạng ngày về YYYY-MM-DD để tránh lỗi ngầm định của trình duyệt/PostgreSQL
    let normalizedDate = data.viewingDate;
    if (data.viewingDate) {
      const parts = data.viewingDate.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          normalizedDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else {
          normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }

    try {
      const response = await fetch('/api/appointments/public', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          property,
          viewingDate: normalizedDate,
          viewingTime: data.viewingTime,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gửi yêu cầu thất bại');
      }

      // Tự động lưu SĐT vào profile người dùng nếu tài khoản chưa có SĐT
      if (profile?.id && data.customerPhone && (!profile.phone || profile.phone === '')) {
        const { supabase } = await import('@/lib/supabase/client');
        supabase
          .from('profiles')
          .update({ phone: data.customerPhone, updated_at: new Date().toISOString() })
          .eq('id', profile.id)
          .then();
      }

      toast.success('Đặt lịch xem thành công', {
        description: 'Chúng tôi sẽ liên hệ với bạn sớm nhất.',
        duration: 4000,
      });

      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Không thể gửi yêu cầu', {
        description: error.message || 'Vui lòng thử lại sau ít phút.',
      });
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset();
      setConsentChecked(false);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[500px] w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Đặt Lịch Hẹn Xem
          </DialogTitle>
          <DialogDescription className="hidden">Mô tả lịch hẹn</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1" noValidate>
          {property && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 space-y-1">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                Bất động sản đang xem
              </p>
              <p className="font-semibold text-slate-900 text-sm leading-snug">
                {property.title}
              </p>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span>{property.address}</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="vr-name">
              Họ và tên <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vr-name"
              placeholder="Họ tên của bạn"
              {...register('customerName')}
              className={errors.customerName ? 'border-red-400 focus-visible:ring-red-300' : ''}
            />
            {errors.customerName && (
              <p className="text-xs text-red-500">{errors.customerName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="vr-phone">
              Số điện thoại <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vr-phone"
              placeholder="Số điện thoại của bạn"
              inputMode="tel"
              {...register('customerPhone')}
              className={errors.customerPhone ? 'border-red-400 focus-visible:ring-red-300' : ''}
            />
            {errors.customerPhone && (
              <p className="text-xs text-red-500">{errors.customerPhone.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="vr-date">
                Ngày đi xem <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vr-date"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                {...register('viewingDate')}
                className={errors.viewingDate ? 'border-red-400 focus-visible:ring-red-300' : ''}
              />
              {errors.viewingDate && (
                <p className="text-xs text-red-500">{errors.viewingDate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vr-time">
                Giờ đi xem <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vr-time"
                type="time"
                {...register('viewingTime')}
                className={errors.viewingTime ? 'border-red-400 focus-visible:ring-red-300' : ''}
              />
              {errors.viewingTime && (
                <p className="text-xs text-red-500">{errors.viewingTime.message}</p>
              )}
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <input
              id="vr-consent"
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-400 accent-amber-600 cursor-pointer flex-shrink-0"
            />
            <label htmlFor="vr-consent" className="text-xs text-slate-600 cursor-pointer leading-relaxed">
              Tôi đồng ý cho phép{' '}
              <strong className="text-slate-900">RealHome</strong>{' '}
              thu thập và sử dụng thông tin trên để liên hệ tư vấn và xếp lịch hẹn xem phòng.
              {' '}Xem{' '}
              <Link
                href="/customer/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 hover:text-amber-700 underline font-medium"
              >
                Chính sách bảo mật
              </Link>.
              {' '}<span className="text-red-500">*</span>
            </label>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !consentChecked}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang gửi...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Gửi yêu cầu
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

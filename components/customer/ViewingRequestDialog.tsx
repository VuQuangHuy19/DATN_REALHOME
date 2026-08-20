'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, MapPin, Loader2, ChevronDown, Check } from 'lucide-react';
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

/** Phòng có thể chọn khi đặt lịch từ tòa nhà */
export interface SelectableRoom {
  id: string;
  title: string;
  address: string;
  area?: string;
  price: number;
  floor: number;
  size: number;
  companyId: string;
  status: string;
}

interface ViewingRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  /** Dùng khi biết chính xác phòng (trang chi tiết phòng) */
  property?: ViewingProperty | null;
  /** Dùng khi đang ở trang tòa nhà — cho phép chọn phòng */
  availableRooms?: SelectableRoom[];
  /** Sale Referral ID — truyền xuống từ trang cha nếu có, hoặc tự đọc sessionStorage */
  referralSaleId?: string | null;
}

export function ViewingRequestDialog({
  open,
  onOpenChange,
  companyId,
  property,
  availableRooms,
  referralSaleId,
}: ViewingRequestDialogProps) {
  const { profile } = useAuth();
  const [consentChecked, setConsentChecked] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<SelectableRoom | null>(null);

  // Đọc sale_ref_id từ sessionStorage (ưu tiên prop được truyền vào, fallback sessionStorage)
  const effectiveSaleRefId = referralSaleId ?? (
    typeof window !== 'undefined' ? sessionStorage.getItem('sale_ref_id') : null
  );

  const isRoomMode = !!property; // Đã biết phòng cụ thể
  const isBuildingMode = !property && availableRooms && availableRooms.length > 0;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Khởi tạo phòng mặc định khi có availableRooms
  useEffect(() => {
    if (open && availableRooms && availableRooms.length > 0 && !selectedRoom) {
      // Ưu tiên phòng available, rồi soon_available
      const preferred = availableRooms.find(r => r.status === 'available') ?? availableRooms[0];
      setSelectedRoom(preferred);
    }
  }, [open, availableRooms]);

  useEffect(() => {
    if (open && profile) {
      if (profile.full_name) setValue('customerName', profile.full_name);
      if (profile.phone) setValue('customerPhone', profile.phone);
    }
  }, [open, profile, setValue]);

  // Thông tin property cuối cùng để submit
  const effectiveProperty = isRoomMode ? property : selectedRoom
    ? {
        id: selectedRoom.id,
        title: selectedRoom.title,
        address: selectedRoom.address,
        area: selectedRoom.area,
      }
    : null;

  const onSubmit = async (data: FormValues) => {
    if (!effectiveProperty) {
      toast.error('Vui lòng chọn phòng muốn xem');
      return;
    }

    // Chuẩn hóa định dạng ngày về YYYY-MM-DD
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
      const isStaffOrSale = profile?.role === 'sales_agent' || profile?.role === 'manager' || profile?.role === 'company_admin' || profile?.role === 'super_admin';
      // Xác định assignedToUserId:
      // - Nếu là Sale/Staff tự đặt: gắn cho chính họ
      // - Nếu khách tự đặt qua link Sale (có effectiveSaleRefId): gắn cho Sale đó
      // - Nếu không có: để null (lịch hẹn chung, các Sale có thể "Nhận Ngay")
      const assignedToUserId = isStaffOrSale
        ? (profile?.id || null)
        : (effectiveSaleRefId || null);
      const assignedToName = isStaffOrSale
        ? (profile?.full_name || profile?.email || null)
        : null; // Sẽ được update bởi server khi có referralSaleId
      const leadSource = isStaffOrSale
        ? 'self_sourced'
        : effectiveSaleRefId
        ? 'sale_referral_link'
        : 'company_mkt';

      const response = await fetch('/api/appointments/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          property: effectiveProperty,
          viewingDate: normalizedDate,
          viewingTime: data.viewingTime,
          createdByUserId: profile?.id || null,
          assignedToUserId,
          assignedToName,
          leadSource,
          referralSaleId: (!isStaffOrSale && effectiveSaleRefId) ? effectiveSaleRefId : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Gửi yêu cầu thất bại');
      }

      // Tự động lưu SĐT vào profile nếu chưa có
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
      setSelectedRoom(null);
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
      if (!isRoomMode) setSelectedRoom(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[500px] w-[calc(100vw-2rem)] max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5" />
            Đặt Lịch Hẹn Xem
          </DialogTitle>
          <DialogDescription className="hidden">Mô tả lịch hẹn</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1" noValidate>

          {/* --- ROOM MODE: hiển thị phòng cố định --- */}
          {isRoomMode && property && (
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

          {/* --- BUILDING MODE: dropdown chọn phòng --- */}
          {isBuildingMode && (
            <div className="space-y-2">
              <Label>
                Chọn phòng muốn xem <span className="text-red-500">*</span>
              </Label>
              <div className="grid gap-1.5 max-h-52 overflow-y-auto pr-0.5 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                {availableRooms!
                  .slice()
                  .sort((a, b) => {
                    // available trước, rồi soon_available
                    if (a.status !== b.status) return a.status === 'available' ? -1 : 1;
                    // cùng status → sắp xếp theo tầng rồi số phòng
                    if (a.floor !== b.floor) return a.floor - b.floor;
                    return a.title.localeCompare(b.title, undefined, { numeric: true });
                  })
                  .map((room) => {
                    const isSelected = selectedRoom?.id === room.id;
                    const isSoon = room.status === 'soon_available';
                    const roomCode = room.title.split('—')[1]?.trim() || room.title;
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setSelectedRoom(room)}
                        className={`
                          w-full flex items-center justify-between px-4 py-2.5 text-left
                          transition-colors duration-100 first:rounded-t-xl last:rounded-b-xl
                          ${isSelected
                            ? 'bg-amber-50 dark:bg-amber-950/40'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }
                        `}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isSoon ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                              {roomCode}
                              {isSoon && (
                                <span className="ml-1.5 text-[10px] font-semibold text-amber-600 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded">
                                  Sắp trống
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Tầng {room.floor} · {room.size}m²
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 font-mono whitespace-nowrap">
                            {room.price.toLocaleString('vi-VN')}đ
                          </span>
                          {isSelected && <Check className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                        </div>
                      </button>
                    );
                  })}
              </div>
              {!selectedRoom && (
                <p className="text-xs text-red-500">Vui lòng chọn phòng muốn xem</p>
              )}
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

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting || !consentChecked || (isBuildingMode && !selectedRoom)}
          >
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

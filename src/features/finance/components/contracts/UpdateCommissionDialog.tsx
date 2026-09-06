'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, DollarSign, Percent, Calculator, Building } from 'lucide-react';
import { updateContractCommission } from '@/lib/supabase/repositories/contracts';

interface UpdateCommissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'rental';
  contract: any | null;
  onSuccess: () => void;
}

const formatCurrencyInput = (num: number | string): string => {
  if (!num && num !== 0) return '';
  const clean = String(num).replace(/\D/g, '');
  if (!clean) return '';
  return Number(clean).toLocaleString('vi-VN');
};

const parseCurrencyInput = (str: string): number => {
  const clean = str.replace(/\./g, '').replace(/\D/g, '');
  return clean ? Number(clean) : 0;
};

export function UpdateCommissionDialog({
  isOpen,
  onClose,
  type,
  contract,
  onSuccess,
}: UpdateCommissionDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [commissionRateRaw, setCommissionRateRaw] = useState<string>('');
  const [commissionAmount, setCommissionAmount] = useState<number>(0);
  const [rentPrice, setRentPrice] = useState<number>(0);

  useEffect(() => {
    if (!contract) return;

    const basePrice = Number(contract.rent_price || contract.deposit_amount || contract.rooms?.price || 0);
    setRentPrice(basePrice);

    const existingRate = contract.commission_rate_raw || contract.rooms?.rose || '';
    setCommissionRateRaw(existingRate);

    let existingAmount = Number(contract.commission_amount || 0);
    if (existingAmount <= 0 && existingRate && basePrice > 0) {
      existingAmount = calculateCommissionFromRate(existingRate, basePrice, contract.lease_duration_months || 12);
    }
    setCommissionAmount(existingAmount);
  }, [contract]);

  const calculateCommissionFromRate = (rateStr: string, price: number, months: number = 12): number => {
    if (!rateStr || price <= 0) return 0;
    const cleanRate = rateStr.trim().toLowerCase();

    // Matching explicit fraction/percent like "50%", "100%", "0.5", "1", "1 tháng", "0.5 tháng"
    if (cleanRate.includes('100%') || cleanRate.includes('1 tháng') || cleanRate === '1') {
      return price;
    }
    if (cleanRate.includes('50%') || cleanRate.includes('0.5 tháng') || cleanRate.includes('nửa tháng') || cleanRate === '0.5') {
      return Math.round(price * 0.5);
    }

    const pctMatch = cleanRate.match(/(\d+(?:\.\d+)?)\s*%/);
    if (pctMatch) {
      const pct = parseFloat(pctMatch[1]);
      return Math.round((price * pct) / 100);
    }

    const numVal = parseFloat(cleanRate);
    if (!isNaN(numVal)) {
      if (numVal <= 1) return Math.round(price * numVal);
      if (numVal <= 100) return Math.round((price * numVal) / 100);
      return numVal;
    }

    return 0;
  };

  const handleApplyPreset = (rateLabel: string, ratio: number) => {
    setCommissionRateRaw(rateLabel);
    if (rentPrice > 0) {
      setCommissionAmount(Math.round(rentPrice * ratio));
    }
  };

  const handleRateChange = (val: string) => {
    setCommissionRateRaw(val);
    if (rentPrice > 0) {
      const computed = calculateCommissionFromRate(val, rentPrice, contract?.lease_duration_months || 12);
      if (computed > 0) {
        setCommissionAmount(computed);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contract?.id) return;

    setSubmitting(true);
    try {
      await updateContractCommission(
        type,
        contract.id,
        commissionRateRaw.trim() || null,
        commissionAmount
      );
      toast.success('Đã cập nhật hoa hồng hợp đồng thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(`Lỗi: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!contract) return null;

  const roomCode = contract.rooms?.code || contract.room_code || '—';
  const buildingName = contract.rooms?.buildings?.name || contract.building_name || 'Toà nhà';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border-border rounded-2xl shadow-xl p-5">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="text-base font-bold font-heading text-ink flex items-center gap-2">
            <Percent className="h-5 w-5 text-amber-500" />
            Cập nhật % Hoa hồng công ty
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-muted">
            Cập nhật % và tiền hoa hồng thu từ chủ nhà cho {type === 'deposit' ? 'Hợp đồng cọc' : 'Hợp đồng thuê'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* Header info */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 font-mono">
                {contract.contract_code}
              </span>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                {type === 'deposit' ? 'HĐ Đặt Cọc' : 'HĐ Thuê Chính Thức'}
              </span>
            </div>
            <div className="text-xs font-medium text-slate-700 flex items-center gap-1">
              <Building className="h-3.5 w-3.5 text-slate-500" />
              <span>Phòng {roomCode} ({buildingName})</span>
            </div>
            <div className="text-xs font-bold text-slate-900 pt-0.5">
              Giá thuê: <span className="font-mono text-emerald-600">{rentPrice.toLocaleString('vi-VN')} đ/tháng</span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-ink">Chọn nhanh mức hoa hồng chuẩn:</Label>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-semibold h-8 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-slate-700"
                onClick={() => handleApplyPreset('50% (0.5 tháng)', 0.5)}
              >
                50% (0.5 tháng)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-semibold h-8 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-slate-700"
                onClick={() => handleApplyPreset('100% (1 tháng)', 1.0)}
              >
                100% (1 tháng)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs font-semibold h-8 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-slate-700"
                onClick={() => handleApplyPreset('30%', 0.3)}
              >
                30% tiền thuê
              </Button>
            </div>
          </div>

          {/* Rate Raw Input */}
          <div className="space-y-1.5">
            <Label htmlFor="commission_rate_raw" className="text-xs font-bold text-ink">
              Mức % Hoa hồng hoặc ghi chú (% / số tháng)
            </Label>
            <Input
              id="commission_rate_raw"
              type="text"
              value={commissionRateRaw}
              onChange={(e) => handleRateChange(e.target.value)}
              placeholder="Ví dụ: 50%, 100%, 1 tháng, 0.5 tháng..."
              className="h-10 text-sm font-semibold rounded-xl border-border focus:ring-amber-500"
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <Label htmlFor="commission_amount" className="text-xs font-bold text-ink flex items-center justify-between">
              <span>Số tiền hoa hồng thu về (VNĐ)</span>
              <span className="text-[11px] text-emerald-600 font-normal">Tự động tính từ %</span>
            </Label>
            <div className="relative">
              <Input
                id="commission_amount"
                type="text"
                value={formatCurrencyInput(commissionAmount)}
                onChange={(e) => setCommissionAmount(parseCurrencyInput(e.target.value))}
                placeholder="Nhập số tiền hoa hồng..."
                className="h-10 text-sm font-mono font-bold text-emerald-600 rounded-xl border-border focus:ring-emerald-500 pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                đ
              </span>
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 text-xs font-semibold rounded-xl border-border"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-9 px-4 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-md"
            >
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Đang lưu...
                </span>
              ) : (
                'Lưu hoa hồng'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

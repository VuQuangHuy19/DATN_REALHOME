'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import { formatVNDNumber, generatePriceLabel } from '../../utils/categories.utils';

interface PriceRangeFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: any;
  formLabel: string;
  setFormLabel: (val: string) => void;
  formMin: string;
  setFormMin: (val: string) => void;
  formMax: string;
  setFormMax: (val: string) => void;
  pricePresets: Array<{ label: string; min: number; max: number | string }>;
  saving: boolean;
  onSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function PriceRangeFormModal({
  isOpen,
  onOpenChange,
  editItem,
  formLabel,
  setFormLabel,
  formMin,
  setFormMin,
  formMax,
  setFormMax,
  pricePresets,
  saving,
  onSave,
}: PriceRangeFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full bg-white p-6 rounded-2xl border border-border shadow-2xl">
        <DialogHeader className="pb-4 border-b border-border text-left">
          <DialogTitle className="font-heading text-lg font-extrabold text-ink flex items-center gap-2">
            <Plus className="h-5 w-5 text-accent" />
            {editItem ? 'Chỉnh sửa' : 'Thêm mới'} khoảng giá
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-muted">
            Nhập các thông số cấu hình và nhấn Lưu để hoàn tất.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSave} className="space-y-5 pt-4">
          {/* Presets */}
          {!editItem && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-ink-muted uppercase">Gợi ý mẫu nhanh</Label>
              <div className="flex flex-wrap gap-1.5">
                {pricePresets.map((p) => (
                  <Button
                    key={p.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 rounded-lg border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => {
                      const newMin = formatVNDNumber(p.min);
                      const newMax = formatVNDNumber(p.max);
                      setFormMin(newMin);
                      setFormMax(newMax);
                      setFormLabel(p.label || generatePriceLabel(newMin, newMax));
                    }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="min" className="text-xs font-bold uppercase text-ink">
                Giá tối thiểu (VND)
              </Label>
              <Input
                id="min"
                type="text"
                placeholder="0"
                value={formMin}
                onChange={(e) => {
                  const newMin = formatVNDNumber(e.target.value);
                  setFormMin(newMin);
                  const autoLabel = generatePriceLabel(newMin, formMax);
                  if (autoLabel) setFormLabel(autoLabel);
                }}
                className="rounded-xl font-mono text-sm font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="max" className="text-xs font-bold uppercase text-ink">
                Giá tối đa (VND)
              </Label>
              <Input
                id="max"
                type="text"
                placeholder="Không giới hạn"
                value={formMax}
                onChange={(e) => {
                  const newMax = formatVNDNumber(e.target.value);
                  setFormMax(newMax);
                  const autoLabel = generatePriceLabel(formMin, newMax);
                  if (autoLabel) setFormLabel(autoLabel);
                }}
                className="rounded-xl font-mono text-sm font-semibold"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="label" className="text-xs font-bold uppercase text-ink">
                Nhãn hiển thị bộ lọc <span className="text-red-500">*</span>
              </Label>
              <span className="text-[11px] font-semibold text-emerald-600">⚡ Tự động tạo theo khoảng giá</span>
            </div>
            <Input
              id="label"
              placeholder="VD: Dưới 3 triệu, 3 - 5 triệu..."
              value={formLabel}
              onChange={(e) => setFormLabel(e.target.value)}
              required
              className="rounded-xl font-semibold bg-emerald-50/20 border-emerald-200 focus:border-emerald-500"
            />
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-10 px-4"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-accent hover:bg-accent/90 text-white font-semibold rounded-xl h-10 px-6"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang lưu...
                </>
              ) : (
                'Lưu danh mục'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

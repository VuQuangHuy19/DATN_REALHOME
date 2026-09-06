'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';

interface AmenityFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: any;
  formName: string;
  setFormName: (val: string) => void;
  formIcon: string;
  setFormIcon: (val: string) => void;
  popularEmojis: string[];
  saving: boolean;
  onSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function AmenityFormModal({
  isOpen,
  onOpenChange,
  editItem,
  formName,
  setFormName,
  formIcon,
  setFormIcon,
  popularEmojis,
  saving,
  onSave,
}: AmenityFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full bg-white p-6 rounded-2xl border border-border shadow-2xl">
        <DialogHeader className="pb-4 border-b border-border text-left">
          <DialogTitle className="font-heading text-lg font-extrabold text-ink flex items-center gap-2">
            <Plus className="h-5 w-5 text-accent" />
            {editItem ? 'Chỉnh sửa' : 'Thêm mới'} tiện ích BĐS
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-muted">
            Nhập các thông số cấu hình và nhấn Lưu để hoàn tất.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSave} className="space-y-5 pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold uppercase text-ink">
              Tên tiện ích <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="VD: Wifi tốc độ cao, Thang máy..."
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon" className="text-xs font-bold uppercase text-ink">
              Biểu tượng / Emoji
            </Label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center text-xl shrink-0 font-bold">
                {formIcon || '✨'}
              </div>
              <Input
                id="icon"
                placeholder="Nhập emoji (📶, ❄️, 🛵...)"
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* Emoji Quick Picker */}
            <div className="pt-2 space-y-1">
              <p className="text-[11px] font-semibold text-ink-muted">Chọn nhanh biểu tượng phổ biến:</p>
              <div className="flex flex-wrap gap-1.5">
                {popularEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormIcon(emoji)}
                    className="w-8 h-8 rounded-lg bg-bg-subtle hover:bg-amber-100 hover:scale-110 transition-all flex items-center justify-center text-base border border-border"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
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

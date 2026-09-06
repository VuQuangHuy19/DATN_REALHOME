'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';

interface RoomTypeFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: any;
  formName: string;
  setFormName: (val: string) => void;
  formDesc: string;
  setFormDesc: (val: string) => void;
  formIcon: string;
  setFormIcon: (val: string) => void;
  roomTypePresets: Array<{ name: string; icon: string; desc: string }>;
  saving: boolean;
  onSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function RoomTypeFormModal({
  isOpen,
  onOpenChange,
  editItem,
  formName,
  setFormName,
  formDesc,
  setFormDesc,
  formIcon,
  setFormIcon,
  roomTypePresets,
  saving,
  onSave,
}: RoomTypeFormModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full bg-white p-6 rounded-2xl border border-border shadow-2xl">
        <DialogHeader className="pb-4 border-b border-border text-left">
          <DialogTitle className="font-heading text-lg font-extrabold text-ink flex items-center gap-2">
            <Plus className="h-5 w-5 text-accent" />
            {editItem ? 'Chỉnh sửa' : 'Thêm mới'} loại phòng
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-muted">
            Nhập các thông số cấu hình và nhấn Lưu để hoàn tất.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSave} className="space-y-5 pt-4">
          {/* Presets */}
          {!editItem && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-ink-muted uppercase">Gợi ý mẫu loại phòng</Label>
              <div className="flex flex-wrap gap-1.5">
                {roomTypePresets.map((r) => (
                  <Button
                    key={r.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 rounded-lg border-accent/30 text-accent hover:bg-accent/10"
                    onClick={() => {
                      setFormName(r.name);
                      setFormIcon(r.icon);
                      setFormDesc(r.desc);
                    }}
                  >
                    {r.icon} {r.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold uppercase text-ink">
              Tên loại phòng <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="VD: Studio, 1PN1K, Duplex..."
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc" className="text-xs font-bold uppercase text-ink">
              Mô tả ngắn
            </Label>
            <Input
              id="desc"
              placeholder="Mô tả ngắn gọn về đặc điểm loại phòng..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon" className="text-xs font-bold uppercase text-ink">
              Biểu tượng / Emoji loại phòng
            </Label>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center text-xl shrink-0 font-bold">
                {formIcon || '🏢'}
              </div>
              <Input
                id="icon"
                placeholder="Nhập emoji (🏢, 🛋️, 🏡, 🚪, 🛏️...)"
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                className="rounded-xl"
              />
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

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { DBContractTemplate } from '@/lib/supabase/types';

interface ContractTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: DBContractTemplate | null;
  saving: boolean;
  onSave: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function ContractTemplateDialog({
  open,
  onOpenChange,
  editItem,
  saving,
  onSave,
}: ContractTemplateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-lg border border-border bg-white shadow-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg font-bold text-ink">
            {editItem ? 'Chỉnh sửa' : 'Thêm'} mẫu hợp đồng
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSave} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-ink font-semibold text-xs uppercase tracking-wider">
                Tên mẫu
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={editItem?.name}
                required
                className="rounded-lg border-border focus-visible:ring-accent"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-ink font-semibold text-xs uppercase tracking-wider">
                Loại hợp đồng
              </Label>
              <Input
                id="type"
                name="type"
                defaultValue={editItem?.type}
                required
                className="rounded-lg border-border focus-visible:ring-accent"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="content" className="text-ink font-semibold text-xs uppercase tracking-wider">
              Nội dung mẫu
            </Label>
            <Textarea
              id="content"
              name="content"
              defaultValue={editItem?.content ?? ''}
              rows={10}
              className="rounded-lg border-border focus-visible:ring-accent"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-accent hover:bg-accent-500 text-white rounded-lg font-semibold"
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Lưu
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

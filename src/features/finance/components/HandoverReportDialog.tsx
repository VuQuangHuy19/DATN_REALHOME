'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ClipboardCheck, Loader2, Camera, UserCheck, ShieldCheck, Plus, X } from 'lucide-react';
import Image from 'next/image';

interface HandoverReportDialogProps {
  depositContract: any;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function HandoverReportDialog({
  depositContract,
  isOpen,
  onOpenChange,
  onSuccess
}: HandoverReportDialogProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any | null>(null);
  
  // Form states
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchHandoverReport = async () => {
    if (!depositContract?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('handover_reports')
        .select('*')
        .eq('deposit_contract_id', depositContract.id)
        .maybeSingle();

      if (error) throw error;
      setReport(data);
      if (data) {
        setNotes(data.notes || '');
        setImagesList(data.images || []);
      } else {
        setNotes('');
        setImagesList([]);
      }
    } catch (err: any) {
      toast.error('Lỗi tải biên bản bàn giao: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && depositContract) {
      fetchHandoverReport();
    }
  }, [isOpen, depositContract]);

  const handleAddImage = () => {
    if (!imageUrl) return;
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      toast.error('Vui lòng nhập URL ảnh hợp lệ (bắt đầu bằng http hoặc https)');
      return;
    }
    setImagesList([...imagesList, imageUrl]);
    setImageUrl('');
  };

  const handleRemoveImage = (index: number) => {
    setImagesList(imagesList.filter((_, i) => i !== index));
  };

  const handleSaveReport = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const payload = {
        company_id: depositContract.company_id,
        deposit_contract_id: depositContract.id,
        room_id: depositContract.room_id,
        notes,
        images: imagesList,
        updated_at: new Date().toISOString(),
      };

      if (report) {
        // Cập nhật
        const { error } = await supabase
          .from('handover_reports')
          .update(payload)
          .eq('id', report.id);
        if (error) throw error;
        toast.success('Cập nhật biên bản bàn giao thành công!');
      } else {
        // Tạo mới
        const { error } = await supabase
          .from('handover_reports')
          .insert({
            ...payload,
            created_by: session?.user?.id || null,
          });
        if (error) throw error;
        toast.success('Lập biên bản bàn giao phòng thành công!');
      }
      fetchHandoverReport();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error('Lỗi khi lưu biên bản: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (party: 'landlord' | 'tenant') => {
    if (!report) return;
    setSubmitting(true);
    try {
      const updateData: any = {};
      if (party === 'landlord') {
        updateData.landlord_confirmed = true;
        updateData.landlord_confirmed_at = new Date().toISOString();
      } else {
        updateData.tenant_confirmed = true;
        updateData.tenant_confirmed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('handover_reports')
        .update(updateData)
        .eq('id', report.id);

      if (error) throw error;
      toast.success(party === 'landlord' ? 'Chủ nhà đã xác nhận biên bản!' : 'Khách thuê đã xác nhận biên bản!');
      fetchHandoverReport();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error('Lỗi xác nhận: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isBothConfirmed = report?.landlord_confirmed && report?.tenant_confirmed;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-white shadow-xl p-6">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-lg font-bold font-heading text-ink flex items-center gap-2">
            <ClipboardCheck className="h-5.5 w-5.5 text-indigo-650" />
            Biên bản bàn giao phòng - HĐ #{depositContract?.contract_code}
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-muted">
            Lập hiện trạng và xác nhận bàn giao phòng cho thuê để thực hiện hoàn cọc.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-650" />
            <span className="text-xs text-ink-muted">Đang tải biên bản bàn giao...</span>
          </div>
        ) : (
          <div className="space-y-6 pt-4 text-sm text-ink">
            {/* Status indicators */}
            {report && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-bg-subtle p-4 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-muted text-xs flex items-center gap-1.5">
                    <ShieldCheck className={`h-4 w-4 ${report.landlord_confirmed ? 'text-emerald-500' : 'text-ink-muted'}`} />
                    Chủ nhà xác nhận:
                  </span>
                  {report.landlord_confirmed ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250 font-bold text-[10px]">Đã xác nhận</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold text-indigo-650 border-indigo-200 hover:bg-indigo-50 h-7"
                      onClick={() => handleConfirm('landlord')}
                      disabled={submitting}
                    >
                      Xác nhận ngay
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-muted text-xs flex items-center gap-1.5">
                    <UserCheck className={`h-4 w-4 ${report.tenant_confirmed ? 'text-emerald-500' : 'text-ink-muted'}`} />
                    Khách thuê xác nhận:
                  </span>
                  {report.tenant_confirmed ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250 font-bold text-[10px]">Đã xác nhận</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold text-amber-600 border-amber-200 hover:bg-amber-50 h-7"
                      onClick={() => handleConfirm('tenant')}
                      disabled={submitting}
                    >
                      Xác nhận (Giả lập)
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Note text area */}
            <div className="space-y-1.5">
              <Label className="text-ink font-bold text-xs uppercase tracking-wider">Ghi chú hiện trạng phòng khi bàn giao</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ví dụ: Tường bẩn nhẹ, máy lạnh hoạt động bình thường, giường tủ gỗ không trầy xước, bàn giao đủ 2 chìa khóa..."
                rows={4}
                disabled={isBothConfirmed}
                className="rounded-xl border-border focus-visible:ring-indigo-500"
              />
            </div>

            {/* Image URLs input and lists */}
            <div className="space-y-3">
              <Label className="text-ink font-bold text-xs uppercase tracking-wider">Hình ảnh hiện trạng bàn giao</Label>
              
              {!isBothConfirmed && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                    <Input
                      placeholder="Nhập link (URL) hình ảnh căn phòng..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="pl-9 rounded-xl border-border focus-visible:ring-indigo-500"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddImage}
                    className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold flex-shrink-0"
                  >
                    <Plus className="h-4 w-4 mr-1.5" /> Thêm ảnh
                  </Button>
                </div>
              )}

              {imagesList.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-xl text-ink-muted text-xs">
                  Chưa có hình ảnh hiện trạng nào được thêm.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                  {imagesList.map((img, idx) => (
                    <div key={idx} className="relative group aspect-video rounded-lg overflow-hidden border border-border bg-bg-subtle">
                      <Image
                        src={img}
                        alt={`Ảnh bàn giao ${idx + 1}`}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover"
                      />
                      {!isBothConfirmed && (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-black/85 text-white rounded-full transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Save Action Buttons */}
            {!isBothConfirmed && (
              <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="border-border text-ink rounded-xl font-semibold h-10 px-5"
                >
                  Đóng
                </Button>
                <Button
                  onClick={handleSaveReport}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl font-bold h-10 px-5 flex items-center justify-center gap-2"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Lưu Biên bản bàn giao
                </Button>
              </div>
            )}

            {isBothConfirmed && (
              <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl text-emerald-800 text-xs text-center font-semibold">
                Biên bản bàn giao đã được ký duyệt đầy đủ bởi cả hai bên. Hợp đồng đặt cọc đã đủ điều kiện để chuyển sang trạng thái Hoàn cọc (refunded).
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

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

import { useAuth } from '@/lib/auth/AuthContext';

interface HandoverReportDialogProps {
  /** Contract object (deposit_contract hoặc rental_contract) */
  contract: any;
  /** Loại hợp đồng nguồn: 'deposit' | 'rental' */
  sourceType: 'deposit' | 'rental';
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function HandoverReportDialog({
  contract,
  sourceType,
  isOpen,
  onOpenChange,
  onSuccess
}: HandoverReportDialogProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any | null>(null);

  // Form states
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  /**
   * Fetch biên bản bàn giao theo room_id (universal - không phụ thuộc FK nào).
   * Nếu có nhiều bản giao cho cùng 1 phòng, ưu tiên bản liên kết với contract hiện tại.
   */
  const fetchHandoverReport = async () => {
    if (!contract?.room_id) return;
    setLoading(true);
    try {
      // Tìm theo room_id trước (universal)
      let query = supabase
        .from('handover_reports')
        .select('*')
        .eq('room_id', contract.room_id)
        .order('created_at', { ascending: false });

      // Nếu là deposit contract → ưu tiên bản có deposit_contract_id khớp
      if (sourceType === 'deposit') {
        query = supabase
          .from('handover_reports')
          .select('*')
          .eq('deposit_contract_id', contract.id)
          .maybeSingle();
      }
      // Nếu là rental contract → ưu tiên bản có rental_contract_id khớp
      else {
        query = supabase
          .from('handover_reports')
          .select('*')
          .eq('rental_contract_id', contract.id)
          .maybeSingle();
      }

      const { data, error } = await query;
      if (error) throw error;

      // Nếu chưa tìm được bằng FK cụ thể → fallback tìm theo room_id
      let found = Array.isArray(data) ? data[0] : data;
      if (!found) {
        const { data: byRoom } = await supabase
          .from('handover_reports')
          .select('*')
          .eq('room_id', contract.room_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        found = byRoom;
      }

      setReport(found ?? null);
      if (found) {
        setNotes(found.notes || '');
        setImagesList(found.images || []);
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
    if (isOpen && contract) {
      fetchHandoverReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contract]);

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
      // Payload base - gán created_by / updated_by từ profile.id
      const basePayload: Record<string, any> = {
        company_id: contract.company_id,
        room_id: contract.room_id,
        notes,
        images: imagesList,
        created_by: report ? report.created_by : (profile?.id || null),
        updated_by: profile?.id || null,
        updated_at: new Date().toISOString(),
      };

      // Gán đúng FK tùy loại hợp đồng nguồn
      if (sourceType === 'deposit') {
        basePayload.deposit_contract_id = contract.id;
      } else {
        // rental contract: dùng rental_contract_id (cột mới sau migration)
        basePayload.rental_contract_id = contract.id;

        // Nếu rental contract có liên kết deposit → ghi thêm deposit_contract_id để tiện truy vết
        if (contract.deposit_contract_id) {
          basePayload.deposit_contract_id = contract.deposit_contract_id;
        }
      }

      if (report) {
        // Cập nhật bản đã có
        const { error } = await supabase
          .from('handover_reports')
          .update(basePayload)
          .eq('id', report.id);
        if (error) throw error;
        toast.success('Cập nhật biên bản bàn giao thành công!');
      } else {
        // Tạo mới
        const { error } = await supabase
          .from('handover_reports')
          .insert(basePayload);
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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-border bg-white shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-5 px-6 border-b border-border bg-white shrink-0">
          <DialogTitle className="text-lg font-bold font-heading text-ink flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-indigo-600" />
            Biên bản bàn giao phòng - HĐ #{contract?.contract_code}
          </DialogTitle>
          <DialogDescription className="text-xs text-ink-muted">
            {sourceType === 'deposit'
              ? 'Lập hiện trạng và xác nhận bàn giao phòng từ hợp đồng đặt cọc.'
              : 'Lập hiện trạng và xác nhận bàn giao phòng từ hợp đồng thuê chính thức.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-2 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="text-xs text-ink-muted">Đang tải biên bản bàn giao...</span>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-ink">
              {/* Status indicators */}
              {report && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-bg-subtle p-4 rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink-muted text-xs flex items-center gap-1.5">
                      <ShieldCheck className={`h-4 w-4 ${report.landlord_confirmed ? 'text-emerald-500' : 'text-ink-muted'}`} />
                      Chủ nhà xác nhận:
                    </span>
                    {report.landlord_confirmed ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">Đã xác nhận</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 h-7"
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
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">Đã xác nhận</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-bold text-amber-600 border-amber-200 hover:bg-amber-50 h-7"
                        onClick={() => handleConfirm('tenant')}
                        disabled={submitting}
                      >
                        Xác nhận thay khách
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
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted" />
                      <Input
                        placeholder="Nhập link (URL) hình ảnh căn phòng..."
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddImage();
                          }
                        }}
                        className="pl-9 h-10 rounded-xl border-border focus-visible:ring-indigo-500"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={handleAddImage}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold h-10 px-4 shrink-0 flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Thêm ảnh</span>
                    </Button>
                  </div>
                )}

                {imagesList.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-border rounded-xl text-ink-muted text-xs bg-slate-50/50">
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

              {isBothConfirmed && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800 text-xs text-center font-semibold">
                  Biên bản bàn giao đã được ký duyệt đầy đủ bởi cả hai bên.
                </div>
              )}
            </div>

            {/* Sticky Bottom Footer */}
            <div className="p-4 px-6 border-t border-border bg-slate-50 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border text-ink bg-white hover:bg-slate-100 rounded-xl font-semibold h-10 px-5"
              >
                Đóng
              </Button>
              {!isBothConfirmed && (
                <Button
                  onClick={handleSaveReport}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold h-10 px-6 flex items-center justify-center gap-2 shadow-md"
                  disabled={submitting}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Lưu Biên bản bàn giao
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

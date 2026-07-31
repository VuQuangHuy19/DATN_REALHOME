'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MentionInput, MentionHighlightText } from '@/components/customer/MentionComponents';
import { ImageUpload } from '@/components/ui/ImageUpload';
import {
  Wrench, ClipboardList, CheckCircle2, Clock, Loader2, Send,
  MessageSquare, Calendar, AlertTriangle, FileText, RefreshCw, Printer, QrCode, DollarSign,
  CreditCard, Copy, Check, Upload, ExternalLink, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { exportMaintenancePDF } from '@/src/features/services/services/maintenance';

interface RepairRequest {
  id: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  createdAt: string;
  repairDetails?: string;
  costAmount?: number;
  costBearer?: string;
  tenantAmount?: number;
  paymentStatus?: string;
  isPaid?: boolean;
  tenantPayAmount?: number;
  assignedTechnician?: { name: string; phone: string };
  invoiceInfo?: {
    equipmentCost: number;
    laborCost: number;
    totalCost: number;
    costBearer: string;
    paymentMethod: string;
    details: string;
  };
  landlordBankInfo?: {
    bankName: string;
    accountNumber: string;
    accountOwner: string;
    allAccounts?: any[];
  };
  landlordId?: string;
  receiptUrl?: string;
  comments: { author: string; content: string; time: string; role: string }[];
}

interface HandoverReport {
  id: string;
  type: string;
  date: string;
  status: string;
  note: string;
}

export default function MaintenancePage() {
  const { user, profile } = useAuth();

  // State form tạo yêu cầu mới
  const [repairTitle, setRepairTitle] = useState('');
  const [repairDescription, setRepairDescription] = useState('');
  const [repairPriority, setRepairPriority] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [repairs, setRepairs] = useState<RepairRequest[]>([]);
  const [handovers, setHandovers] = useState<HandoverReport[]>([]);
  const [loadingRepairs, setLoadingRepairs] = useState(true);
  const [loadingHandovers, setLoadingHandovers] = useState(true);

  // State comment
  const [commentValues, setCommentValues] = useState<Record<string, string>>({});
  const [sendingComment, setSendingComment] = useState<string | null>(null);

  // State VietQR Payment Modal & Ảnh biên lai
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payRepair, setPayRepair] = useState<RepairRequest | null>(null);
  const [selectedBankIndex, setSelectedBankIndex] = useState(0);
  const [receiptFileUrl, setReceiptFileUrl] = useState<string | null>(null);
  const [submittingPay, setSubmittingPay] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      toast.success(`Đã sao chép ${label}!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Không thể sao chép');
    }
  };

  // Fetch maintenance requests & comments from DB
  const fetchRepairs = useCallback(async (isSilent = false) => {
    if (!user) return;
    if (!isSilent) setLoadingRepairs(true);
    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*, rooms(code, building_id, buildings(id, name, landlord_id)), maintenance_comments(*)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Lấy danh sách landlords riêng để tránh lỗi PostgREST ambiguity
        const landlordIds = Array.from(
          new Set(data.map((item: any) => item.rooms?.buildings?.landlord_id).filter(Boolean))
        );

        let landlordMap: Record<string, any> = {};
        if (landlordIds.length > 0) {
          const { data: lndData } = await supabase
            .from('landlords')
            .select('id, name, bank_name, bank_account_number, bank_account_owner, bank_accounts')
            .in('id', landlordIds);

          if (lndData) {
            lndData.forEach((l: any) => {
              landlordMap[l.id] = l;
            });
          }
        }

        const mapped: RepairRequest[] = data.map((item: any) => {
          let assignedTech: { name: string; phone: string } | undefined = undefined;

          // Trích xuất thợ được phân công từ comment hệ thống
          const assignComment = (item.maintenance_comments || [])
            .filter((c: any) => c.content && c.content.includes('[Phân công thợ]:'))
            .slice(-1)[0];

          if (assignComment) {
            const match = assignComment.content.match(/\[Phân công thợ\]:\s*([^|]+)\|\s*SĐT:\s*([^\n]+)/);
            if (match) {
              assignedTech = { name: match[1].trim(), phone: match[2].trim() };
            }
          }

          let invoiceInfo: any = undefined;
          const invComment = (item.maintenance_comments || [])
            .filter((c: any) => c.content && c.content.includes('[HOA_DON_SUA_CHUA]:'))
            .slice(-1)[0];

          if (invComment) {
            const eqMatch = invComment.content.match(/Tiền đồ:\s*([\d,.]+)/);
            const lbMatch = invComment.content.match(/Công thợ:\s*([\d,.]+)/);
            const ttMatch = invComment.content.match(/Tổng:\s*([\d,.]+)/);
            const bearerMatch = invComment.content.match(/Bên trả:\s*([^|]+)/);
            const methodMatch = invComment.content.match(/Hình thức:\s*([^|]+)/);
            const detailMatch = invComment.content.match(/Chi tiết:\s*(.+)/);

            invoiceInfo = {
              equipmentCost: eqMatch ? parseInt(eqMatch[1].replace(/[.,]/g, ''), 10) : 0,
              laborCost: lbMatch ? parseInt(lbMatch[1].replace(/[.,]/g, ''), 10) : 0,
              totalCost: ttMatch ? parseInt(ttMatch[1].replace(/[.,]/g, ''), 10) : 0,
              costBearer: bearerMatch ? bearerMatch[1].trim() : 'Khách thuê chi trả',
              paymentMethod: methodMatch ? methodMatch[1].trim() : 'Cộng vào Hóa đơn Tháng',
              details: detailMatch ? detailMatch[1].trim() : '',
            };
          }

          // Lấy thông tin tài khoản ngân hàng Chủ nhà từ landlordMap (Ưu tiên tài khoản Mặc định)
          const lndId = item.rooms?.buildings?.landlord_id;
          const lnd = lndId ? landlordMap[lndId] : undefined;

          let bankList: any[] = [];
          if (Array.isArray(lnd?.bank_accounts) && lnd.bank_accounts.length > 0) {
            bankList = lnd.bank_accounts;
          } else if (lnd?.bank_account_number) {
            bankList = [{
              id: 'default-1',
              bank_name: lnd.bank_name || 'TPBank',
              bank_account_number: lnd.bank_account_number || '',
              bank_account_owner: lnd.bank_account_owner || '',
              is_default: true,
            }];
          }

          const primaryAcc = bankList.find((a: any) => a.is_default || a.isPrimary) || bankList[0];

          const landlordBankInfo = {
            bankName: primaryAcc?.bank_name || lnd?.bank_name || 'TPBank',
            accountNumber: primaryAcc?.bank_account_number || lnd?.bank_account_number || '0857844999',
            accountOwner: primaryAcc?.bank_account_owner || lnd?.bank_account_owner || 'VU QUANG HUY',
            allAccounts: bankList,
          };

          // Kiểm tra xem đơn đã được thanh toán QR chưa
          const payComment = (item.maintenance_comments || [])
            .filter((c: any) => c.content && c.content.includes('[THANH_TOAN_VIETQR]:'))
            .slice(-1)[0];

          const isPaid = item.payment_status === 'paid' || item.payment_status === 'Đã thanh toán' || !!payComment;
          let receiptUrl: string | undefined = undefined;
          if (payComment) {
            const urlMatch = payComment.content.match(/\[BIEN_LAI\]:\s*([^\s\n]+)/);
            if (urlMatch) receiptUrl = urlMatch[1];
          }

          // Tính số tiền khách thuê chi trả
          let tenantPayAmount = item.tenant_amount || item.cost_amount || invoiceInfo?.totalCost || 0;
          if (invoiceInfo) {
            if (invoiceInfo.costBearer.includes('Chia đôi 50/50')) {
              tenantPayAmount = Math.round(invoiceInfo.totalCost / 2);
            } else if (invoiceInfo.costBearer.includes('Chủ nhà') || invoiceInfo.costBearer.includes('BQL')) {
              tenantPayAmount = 0;
            } else {
              tenantPayAmount = invoiceInfo.totalCost;
            }
          }

          return {
            id: item.id,
            title: item.title,
            description: item.description,
            priority: item.priority || 'Bình thường',
            status: item.status || 'Đang tiếp nhận',
            createdAt: new Date(item.created_at).toLocaleDateString('vi-VN'),
            repairDetails: item.repair_details,
            costAmount: item.cost_amount,
            costBearer: item.cost_bearer,
            tenantAmount: item.tenant_amount,
            paymentStatus: item.payment_status,
            isPaid,
            tenantPayAmount,
            landlordBankInfo,
            landlordId: lndId,
            receiptUrl,
            assignedTechnician: assignedTech,
            invoiceInfo,
            comments: (item.maintenance_comments || []).map((c: any) => ({
              author: c.sender_name,
              content: c.content,
              time: new Date(c.created_at).toLocaleString('vi-VN', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
              }),
              role: c.sender_role,
            })).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
          };
        });
        setRepairs(mapped);
      } else {
        setRepairs([]);
      }
    } catch (err) {
      console.error('Error fetching maintenance requests:', err);
      setRepairs([]);
    } finally {
      if (!isSilent) setLoadingRepairs(false);
    }
  }, [user]);

  // Helper phát hiệu ứng âm thanh chuông "tinh tinh" và rung thiết bị khi thanh toán thành công
  const triggerNotificationFeedback = () => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const playNote = (freq: number, startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.3, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + duration);
        };
        const now = ctx.currentTime;
        playNote(523.25, now, 0.18);       // C5
        playNote(659.25, now + 0.12, 0.18);  // E5
        playNote(783.99, now + 0.24, 0.35);  // G5
      }
    } catch (e) {
      // Bỏ qua lỗi audio autoplay nếu trình duyệt chặn
    }
  };

  // Xử lý xác nhận đã chuyển khoản VietQR
  const handleConfirmPayment = useCallback(async () => {
    if (!payRepair || !user) return;
    setSubmittingPay(true);
    try {
      const senderName = profile?.full_name || user.user_metadata?.full_name || 'Khách thuê';
      const amountNum = payRepair.tenantPayAmount || payRepair.invoiceInfo?.totalCost || 0;
      const amountStr = amountNum.toLocaleString('vi-VN');

      let commentContent = `💳 [THANH_TOAN_VIETQR]: Khách thuê (${senderName}) đã chuyển khoản ${amountStr}đ thanh toán Hóa đơn Bảo trì!`;
      if (receiptFileUrl) {
        commentContent += `\n📄 [BIEN_LAI]: ${receiptFileUrl}`;
      }

      // 1. Ghi nhận comment thông báo thanh toán
      const { error: commentErr } = await supabase.from('maintenance_comments').insert({
        request_id: payRepair.id,
        sender_id: user.id,
        sender_name: senderName,
        sender_role: 'tenant',
        content: commentContent,
      });

      if (commentErr) throw commentErr;

      // 2. Cập nhật trạng thái payment_status trong maintenance_requests
      const { error: updateErr } = await supabase
        .from('maintenance_requests')
        .update({ payment_status: 'paid' })
        .eq('id', payRepair.id);

      if (updateErr) console.warn('Lỗi cập nhật payment_status:', updateErr);

      // 3. Gửi thông báo in-app vào bảng notifications cho Chủ nhà
      const landlordId = payRepair.landlordId;
      if (landlordId) {
        supabase.from('notifications').insert({
          company_id: landlordId,
          recipient_id: landlordId,
          title: '💳 Khách vừa chuyển khoản thanh toán Bảo Trì!',
          body: `Khách ${senderName} vừa xác nhận chuyển khoản ${amountStr}đ thanh toán đơn bảo trì #${payRepair.title}.`,
          type: 'payment_received',
          link: '/landlord/maintenance',
          is_read: false,
        }).then(() => {});
      }

      // 4. Kích hoạt RUNG thiết bị & Phát âm thanh "tinh tinh"
      triggerNotificationFeedback();

      toast.success('Đã gửi xác nhận chuyển khoản thành công! Ban Quản Lý sẽ đối soát.');
      setPayModalOpen(false);
      setReceiptFileUrl(null);
      setPayRepair(null);
      fetchRepairs(true);
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      toast.error('Không thể xác nhận thanh toán. Vui lòng thử lại!');
    } finally {
      setSubmittingPay(false);
    }
  }, [payRepair, user, profile, receiptFileUrl, fetchRepairs]);

  useEffect(() => {
    fetchRepairs();

    if (!user) return;

    const channel = supabase
      .channel('tenant_maintenance_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_requests' },
        () => fetchRepairs(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_comments' },
        () => fetchRepairs(true)
      )
      .subscribe();

    // Tự động quét cập nhật ngầm mỗi 4 giây (silent sync)
    const interval = setInterval(() => {
      fetchRepairs(true);
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, fetchRepairs]);

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // Fetch handover reports & tenant active room from DB
  useEffect(() => {
    if (!user) return;

    async function fetchHandoversAndRoom() {
      setLoadingHandovers(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
        const res = await fetch('/api/customer/tenant-portal/contracts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const apiData = await res.json();
        const contracts = apiData.contracts || [];
        const activeContract = contracts.find((c: any) => c.status === 'active') || contracts[0];
        if (activeContract?.room_id) {
          setActiveRoomId(activeContract.room_id);
        }

        const hoData = apiData.handovers || [];

        if (hoData && hoData.length > 0) {
          setHandovers(hoData.map((h: any) => ({
            id: h.id,
            type: h.type || 'Biên bản bàn giao',
            date: h.date ? new Date(h.date).toLocaleDateString('vi-VN') : '',
            status: h.status || 'Chưa thực hiện',
            note: h.note || '',
          })));
        } else {
          setHandovers([]);
        }
      } catch (err) {
        console.error('Error fetching handover reports:', err);
        setHandovers([]);
      } finally {
        setLoadingHandovers(false);
      }
    }

    fetchHandoversAndRoom();
  }, [user, profile]);

  // Double-Submit Guard & Optimistic UI
  const handleSubmitRepair = useCallback(async () => {
    if (!repairTitle.trim() || !repairPriority) {
      toast.error('Vui lòng nhập tiêu đề và chọn mức độ ưu tiên');
      return;
    }
    if (!user) {
      toast.error('Bạn cần đăng nhập để gửi yêu cầu');
      return;
    }
    setIsSubmitting(true);

    const optimisticId = `temp-${Date.now()}`;
    const optimisticRepair: RepairRequest = {
      id: optimisticId,
      title: repairTitle,
      priority: repairPriority,
      status: 'Đang tiếp nhận',
      createdAt: new Date().toLocaleDateString('vi-VN'),
      comments: [],
    };
    setRepairs((prev) => [optimisticRepair, ...prev]);

    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert({
          created_by: user.id,
          room_id: activeRoomId,
          title: repairTitle,
          description: repairDescription,
          priority: repairPriority,
          status: 'Đang tiếp nhận',
        })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic with real data
      setRepairs((prev) =>
        prev.map((r) =>
          r.id === optimisticId
            ? { ...r, id: data.id }
            : r
        )
      );
      setRepairTitle('');
      setRepairDescription('');
      setRepairPriority('');
      toast.success('Yêu cầu sửa chữa đã được gửi tới Ban Quản Lý!');
    } catch (err) {
      // Rollback optimistic update
      setRepairs((prev) => prev.filter((r) => r.id !== optimisticId));
      toast.error('Không thể gửi yêu cầu. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  }, [repairTitle, repairDescription, repairPriority, user]);

  // Gửi bình luận có Mention — lưu vào DB
  const handleSendComment = useCallback(async (repairId: string) => {
    const content = commentValues[repairId];
    if (!content?.trim()) return;
    if (!user) return;
    if (repairId.startsWith('temp-')) {
      toast.error('Vui lòng đợi yêu cầu được ghi nhận trước khi bình luận.');
      return;
    }

    setSendingComment(repairId);

    const senderName = profile?.full_name || user.user_metadata?.full_name || 'Khách thuê';

    // Optimistic UI
    const optimisticComment = {
      author: senderName,
      content,
      time: new Date().toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      role: 'tenant',
    };
    setRepairs((prev) =>
      prev.map((r) => {
        if (r.id === repairId) {
          return { ...r, comments: [...r.comments, optimisticComment] };
        }
        return r;
      })
    );
    setCommentValues((prev) => ({ ...prev, [repairId]: '' }));

    try {
      const { error } = await supabase.from('maintenance_comments').insert({
        request_id: repairId,
        sender_id: user.id,
        sender_name: senderName,
        sender_role: 'tenant',
        content,
      });
      if (error) throw error;
      toast.success('Đã gửi bình luận');
    } catch (err) {
      toast.error('Không thể gửi bình luận. Vui lòng thử lại!');
    } finally {
      setSendingComment(null);
    }
  }, [commentValues, user, profile]);

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-full min-w-0">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-ink font-heading flex items-center gap-2">
          <Wrench className="h-7 w-7 text-amber-600" />
          Bảo trì &amp; Bàn giao
        </h1>
        <p className="text-sm text-ink-muted mt-1">Quản lý yêu cầu sửa chữa, trao đổi với BQL và biên bản bàn giao</p>
      </div>

      {/* Sub-tabs */}
      <Tabs defaultValue="repairs" className="space-y-4">
        <TabsList className="bg-bg-subtle border border-border-subtle rounded-xl p-1">
          <TabsTrigger value="repairs" className="rounded-lg text-xs font-extrabold data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <Wrench className="h-3.5 w-3.5 mr-1.5" />
            Yêu cầu sửa chữa
            {repairs.length > 0 && (
              <Badge className="ml-1.5 bg-amber-100 text-amber-900 border-amber-400 text-[9px] font-bold px-1.5">
                {repairs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="handovers" className="rounded-lg text-xs font-extrabold data-[state=active]:bg-amber-600 data-[state=active]:text-white">
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
            Biên bản bàn giao
          </TabsTrigger>
        </TabsList>

        {/* Tab: Yêu cầu sửa chữa */}
        <TabsContent value="repairs" className="space-y-4">
          {/* Form tạo mới */}
          <Card className="border border-border-subtle">
            <CardHeader className="pb-2">
              <h2 className="text-base font-bold text-ink font-heading">Tạo yêu cầu sửa chữa mới</h2>
            </CardHeader>
            <CardContent className="pt-2 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-ink-muted mb-1 block">Tiêu đề *</label>
                  <Input
                    placeholder="VD: Bóng đèn hành lang bị cháy"
                    value={repairTitle}
                    onChange={(e) => setRepairTitle(e.target.value)}
                    disabled={isSubmitting}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-ink-muted mb-1 block">Mức độ ưu tiên *</label>
                  <Select value={repairPriority} onValueChange={setRepairPriority} disabled={isSubmitting}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Chọn mức độ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Thấp">🟢 Thấp</SelectItem>
                      <SelectItem value="Bình thường">🟡 Bình thường</SelectItem>
                      <SelectItem value="Cao">🟠 Cao</SelectItem>
                      <SelectItem value="Khẩn cấp">🔴 Khẩn cấp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-ink-muted mb-1 block">Mô tả chi tiết</label>
                <textarea
                  placeholder="Mô tả thêm về vấn đề..."
                  value={repairDescription}
                  onChange={(e) => setRepairDescription(e.target.value)}
                  disabled={isSubmitting}
                  rows={2}
                  className="w-full rounded-xl border border-border-subtle bg-bg-subtle px-4 py-3 text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 resize-none"
                />
              </div>
              <Button onClick={handleSubmitRepair} disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-sm">
                {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang gửi...</> : <><Send className="h-4 w-4 mr-2" />Gửi yêu cầu</>}
              </Button>
            </CardContent>
          </Card>

          {/* Loading state */}
          {loadingRepairs && (
            <div className="flex items-center justify-center py-10 gap-2 text-ink-muted">
              <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
              <span className="text-sm font-medium">Đang tải yêu cầu từ cơ sở dữ liệu...</span>
            </div>
          )}

          {/* Empty state */}
          {!loadingRepairs && repairs.length === 0 && (
            <Card className="border border-dashed border-border-subtle">
              <CardContent className="py-12 flex flex-col items-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <Wrench className="h-7 w-7 text-amber-400" />
                </div>
                <p className="text-sm font-bold text-ink">Chưa có yêu cầu sửa chữa nào</p>
                <p className="text-xs text-ink-muted max-w-[260px]">Tạo yêu cầu bên trên để thông báo cho Ban Quản Lý về sự cố trong căn hộ của bạn.</p>
              </CardContent>
            </Card>
          )}

          {/* Danh sách yêu cầu + Khối trao đổi Mention */}
          {repairs.map((repair) => (
            <Card
              key={repair.id}
              className={`border transition-all duration-300 ${
                repair.id.startsWith('temp-') ? 'animate-pulse border-amber-400 bg-amber-50/40 dark:bg-amber-950/20' : 'border-border-subtle'
              }`}
            >
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    repair.status.includes('Đang tiếp nhận') ? 'bg-amber-500/20 border border-amber-400/50' :
                    repair.status.includes('Đang xử lý') ? 'bg-blue-500/10' : 'bg-emerald-500/10'
                  }`}>
                    {repair.status.includes('Đang tiếp nhận') ? <Clock className="h-5 w-5 text-amber-800 dark:text-amber-200" /> :
                     repair.status.includes('Đang xử lý') ? <Loader2 className="h-5 w-5 text-blue-600" /> :
                     <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">{repair.title}</h3>
                    <p className="text-[10px] text-ink-muted">{repair.createdAt}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] font-bold ${
                    repair.priority === 'Khẩn cấp' ? 'text-red-700 border-red-400 bg-red-50' :
                    repair.priority === 'Cao' ? 'text-orange-700 border-orange-400 bg-orange-50' :
                    repair.priority === 'Bình thường' ? 'text-yellow-800 border-yellow-400 bg-yellow-50' :
                    'text-emerald-700 border-emerald-400 bg-emerald-50'
                  }`}>{repair.priority}</Badge>
                  <Badge className={`text-[10px] font-extrabold border ${
                    repair.status.includes('Đang tiếp nhận') ? 'bg-amber-100 text-amber-950 border-amber-400' :
                    repair.status.includes('Đang xử lý') ? 'bg-blue-100 text-blue-900 border-blue-400' :
                    'bg-emerald-100 text-emerald-900 border-emerald-400'
                  }`}>{repair.status}</Badge>
                </div>
              </CardHeader>

              {/* Thẻ Thông tin Thợ đảm nhận */}
              {repair.assignedTechnician && (
                <div className="mx-6 my-2 p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex items-center justify-between flex-wrap gap-3 text-xs shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold shrink-0 shadow-sm">
                      👷
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-extrabold text-blue-700 tracking-wider block">Thợ / Kỹ thuật viên đảm nhận:</span>
                      <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{repair.assignedTechnician.name}</span>
                    </div>
                  </div>
                  <a
                    href={`tel:${repair.assignedTechnician.phone}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs shadow-sm transition-all"
                  >
                    📞 Gọi thợ ({repair.assignedTechnician.phone})
                  </a>
                </div>
              )}

              {/* Thẻ Chi phí Bảo trì & Nút In PDF */}
              {repair.status === 'Hoàn tất' && (
                <div className="mx-6 my-2 p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                    <span className="font-extrabold text-emerald-900 text-xs uppercase flex items-center gap-1.5 font-heading">
                      🧾 Hóa đơn &amp; Biên bản nghiệm thu
                    </span>
                    <Badge className="bg-emerald-600 text-white font-extrabold text-[10px]">
                      {repair.invoiceInfo?.costBearer || 'Bảo trì hoàn tất'}
                    </Badge>
                  </div>

                  {repair.invoiceInfo ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-white/80 p-3 rounded-lg border border-emerald-100 font-mono text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">📦 Tiền đồ / Thiết bị:</span>
                        <span className="font-bold text-slate-800">{repair.invoiceInfo.equipmentCost.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">🔧 Công thợ sửa chữa:</span>
                        <span className="font-bold text-slate-800">{repair.invoiceInfo.laborCost.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">💰 TỔNG CỘNG HÓA ĐƠN:</span>
                        <span className="font-extrabold text-emerald-700 text-sm">{repair.invoiceInfo.totalCost.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 italic font-medium">Đã nghiệm thu và hoàn tất bảo trì.</p>
                  )}

                  <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-600">
                      Hình thức: <span className="text-blue-700 font-mono">{repair.invoiceInfo?.paymentMethod || 'Cộng vào Hóa đơn Tiền nhà Tháng tới'}</span>
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {repair.isPaid ? (
                        <Badge className="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                          <CheckCircle2 className="h-4 w-4" /> Đã thanh toán QR
                        </Badge>
                      ) : (
                        (repair.tenantPayAmount || 0) > 0 && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setPayRepair(repair);
                              setReceiptFileUrl(null);
                              setPayModalOpen(true);
                            }}
                            className="h-8 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-extrabold text-xs shadow-md active:scale-95 transition-all"
                          >
                            <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Thanh toán QR ngay
                          </Button>
                        )
                      )}

                      <Button
                        size="sm"
                        onClick={() =>
                          exportMaintenancePDF({
                            id: repair.id,
                            title: repair.title,
                            createdAt: repair.createdAt,
                            repairDetails: repair.invoiceInfo
                              ? `📦 Tiền đồ: ${repair.invoiceInfo.equipmentCost.toLocaleString('vi-VN')}đ\n🔧 Công thợ: ${repair.invoiceInfo.laborCost.toLocaleString('vi-VN')}đ\n📝 Chi tiết: ${repair.invoiceInfo.details}`
                              : 'Đã nghiệm thu bảo trì.',
                            costAmount: repair.invoiceInfo?.totalCost || 0,
                            costBearer: repair.invoiceInfo?.costBearer || 'Chủ nhà chi trả',
                            tenantAmount: repair.invoiceInfo?.totalCost || 0,
                            tenantName: profile?.full_name || 'Khách thuê',
                          })
                        }
                        className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm"
                      >
                        <Printer className="h-3.5 w-3.5 mr-1.5" /> In / Tải PDF Hóa đơn &amp; Nghiệm thu
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Khối Trao đổi / Bình luận có Mention */}
              <CardContent className="pt-1">
                <div className="border-t border-border-subtle pt-3 mt-1">
                  <p className="text-xs font-bold text-ink-muted mb-2 flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Trao đổi ({repair.comments.length})
                  </p>

                  {/* Danh sách bình luận */}
                  <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                    {repair.comments.map((comment, idx) => (
                      <div key={idx} className={`p-2.5 rounded-lg text-xs ${
                        comment.role === 'tenant' ? 'bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/50 ml-4' : 'bg-bg-subtle border border-border-subtle mr-4'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-ink">{comment.author}</span>
                          <span className="text-[10px] text-ink-muted">{comment.time}</span>
                        </div>
                        <MentionHighlightText text={comment.content} className="text-ink-muted leading-relaxed" />
                      </div>
                    ))}
                  </div>

                  {/* Input bình luận với Mention autocomplete */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <MentionInput
                        value={commentValues[repair.id] || ''}
                        onChange={(val) => setCommentValues((prev) => ({ ...prev, [repair.id]: val }))}
                        placeholder="Nhập bình luận... Gõ @ để gắn thẻ @BQL, @KyThuat..."
                        rows={2}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl self-end"
                      onClick={() => handleSendComment(repair.id)}
                      disabled={!commentValues[repair.id]?.trim() || sendingComment === repair.id}
                    >
                      {sendingComment === repair.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab: Biên bản bàn giao */}
        <TabsContent value="handovers" className="space-y-4">
          {loadingHandovers && (
            <div className="flex items-center justify-center py-10 gap-2 text-ink-muted">
              <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
              <span className="text-sm font-medium">Đang tải biên bản bàn giao...</span>
            </div>
          )}

          {!loadingHandovers && handovers.length === 0 && (
            <Card className="border border-dashed border-border-subtle">
              <CardContent className="py-12 flex flex-col items-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-slate-500/10 flex items-center justify-center">
                  <ClipboardList className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-ink">Chưa có biên bản bàn giao</p>
                <p className="text-xs text-ink-muted max-w-[260px]">Biên bản bàn giao sẽ được tạo bởi Ban Quản Lý khi bạn nhận phòng hoặc trả phòng.</p>
              </CardContent>
            </Card>
          )}

          {handovers.map((ho) => (
            <Card key={ho.id} className="border border-border-subtle">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    ho.status === 'Hoàn tất' ? 'bg-emerald-500/10' : 'bg-slate-500/10'
                  }`}>
                    {ho.status === 'Hoàn tất' ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <Calendar className="h-6 w-6 text-slate-400" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">{ho.type}</h3>
                    <p className="text-xs text-ink-muted mt-0.5">{ho.note}</p>
                    <p className="text-xs text-ink-muted mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {ho.date}
                    </p>
                  </div>
                </div>
                <Badge className={`text-xs font-bold border ${
                  ho.status === 'Hoàn tất' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}>
                  {ho.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Dialog VietQR Thanh Toán Hóa Đơn Bảo Trì & Tải Ảnh Biên Lai */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl bg-white border border-slate-200 p-6 text-slate-900 shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading text-slate-950 flex items-center gap-2">
              <QrCode className="h-6 w-6 text-amber-500" /> Thanh Toán Hóa Đơn Bảo Trì (VietQR)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Quét mã QR bằng ứng dụng ngân hàng bất kỳ để thanh toán trực tiếp cho Chủ nhà.
            </DialogDescription>
          </DialogHeader>

          {payRepair && (
            <div className="space-y-4 pt-1">
              {/* Header tổng quan đơn */}
              <div className="p-3.5 rounded-xl bg-slate-950 text-white flex items-center justify-between shadow-md">
                <div>
                  <h4 className="font-bold text-sm text-amber-400">{payRepair.title}</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Hóa đơn bảo trì phòng • {payRepair.invoiceInfo?.costBearer || 'Khách thuê chi trả'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Cần thanh toán:</span>
                  <span className="text-base font-extrabold font-mono text-amber-400">
                    {(payRepair.tenantPayAmount || payRepair.invoiceInfo?.totalCost || 0).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              {/* Dropdown chọn Ngân hàng nếu Chủ nhà có nhiều hơn 1 tài khoản */}
              {payRepair.landlordBankInfo?.allAccounts && payRepair.landlordBankInfo.allAccounts.length > 1 && (
                <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 space-y-1.5">
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-amber-600" /> Chủ nhà có {payRepair.landlordBankInfo.allAccounts.length} tài khoản ngân hàng. Chọn ngân hàng nhận tiền:
                  </label>
                  <Select
                    value={String(selectedBankIndex)}
                    onValueChange={(val) => setSelectedBankIndex(Number(val))}
                  >
                    <SelectTrigger className="rounded-xl border-amber-300 bg-white text-xs font-extrabold shadow-sm">
                      <SelectValue placeholder="Chọn ngân hàng nhận" />
                    </SelectTrigger>
                    <SelectContent>
                      {payRepair.landlordBankInfo.allAccounts.map((acc: any, idx: number) => (
                        <SelectItem key={idx} value={String(idx)} className="text-xs">
                          🏦 {acc.bank_name} - {acc.bank_account_number} ({acc.bank_account_owner}) {acc.is_default ? '★ Mặc định' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Lấy tài khoản ngân hàng được chọn */}
              {(() => {
                const activeAcc = payRepair.landlordBankInfo?.allAccounts?.[selectedBankIndex] || payRepair.landlordBankInfo;
                const bName = activeAcc?.bank_name || activeAcc?.bankName || 'TPBank';
                const accNo = activeAcc?.bank_account_number || activeAcc?.accountNumber || '0857844999';
                const accOwner = activeAcc?.bank_account_owner || activeAcc?.accountOwner || 'VU QUANG HUY';
                const amountNum = payRepair.tenantPayAmount || payRepair.invoiceInfo?.totalCost || 0;

                return (
                  <>
                    {/* Mã QR VietQR Động */}
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="relative h-56 w-56 bg-white p-2.5 rounded-xl border border-slate-300 shadow-md flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://img.vietqr.io/image/${bName.replace(/\s+/g, '')}-${accNo}-compact2.png?amount=${amountNum}&addInfo=BAOTRI%20BT${payRepair.id.slice(-4)}&accountName=${encodeURIComponent(accOwner)}`}
                          alt="VietQR Payment Code"
                          className="h-full w-full object-contain rounded-lg"
                        />
                      </div>
                      <p className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Tự động nạp đúng STK & Số tiền khi quét
                      </p>
                    </div>

                    {/* Chi tiết chuyển khoản & nút Copy */}
                    <div className="space-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Ngân hàng thụ hưởng:</span>
                        <span className="font-bold text-slate-900">{bName}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Số tài khoản nhận:</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                          <span>{accNo}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(accNo, 'Số tài khoản')}
                            className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Sao chép STK"
                          >
                            {copiedField === 'Số tài khoản' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Chủ tài khoản:</span>
                        <span className="font-bold text-slate-900 uppercase">{accOwner}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Số tiền chuyển:</span>
                        <div className="flex items-center gap-1.5 font-mono font-extrabold text-amber-600 text-sm">
                          <span>{amountNum.toLocaleString('vi-VN')} đ</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(String(amountNum), 'Số tiền')}
                            className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                            title="Sao chép số tiền"
                          >
                            {copiedField === 'Số tiền' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                        <span className="text-slate-500">Nội dung chuyển tiền:</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-300">
                          <span>BAOTRI BT{payRepair.id.slice(-4)}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(`BAOTRI BT${payRepair.id.slice(-4)}`, 'Nội dung chuyển tiền')}
                            className="p-1 rounded hover:bg-amber-200 text-amber-900 transition-colors"
                            title="Sao chép nội dung"
                          >
                            {copiedField === 'Nội dung chuyển tiền' ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Tải ảnh biên lai chuyển khoản (Ủy nhiệm chi) */}
              <div className="space-y-1.5 bg-amber-50/50 p-4 rounded-xl border border-amber-200/80">
                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5 text-amber-600" /> Tải ảnh biên lai / ủy nhiệm chi (Tùy chọn)
                </label>
                <p className="text-[11px] text-amber-800/80 mb-2">
                  Đính kèm ảnh màn hình chuyển khoản thành công để Chủ nhà xác nhận nhanh chóng hơn.
                </p>
                <ImageUpload
                  value={receiptFileUrl}
                  onChange={(url) => setReceiptFileUrl(url)}
                  bucket="room_images"
                  className="w-full"
                />
              </div>

              {/* Nút Xác nhận chuyển khoản */}
              <Button
                onClick={handleConfirmPayment}
                disabled={submittingPay}
                className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-extrabold py-3 shadow-lg cursor-pointer text-sm"
              >
                {submittingPay ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Đang gửi xác nhận...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-white" /> Tôi đã chuyển khoản thành công
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

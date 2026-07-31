'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Phone,
  Search,
  Filter,
  Building2,
  Home,
  User,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Star,
  RefreshCw,
  MessageSquare,
  Send,
  Loader2,
  Receipt,
  DollarSign,
  Printer
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { MentionInput, MentionHighlightText } from '@/components/customer/MentionComponents';
import { exportMaintenancePDF } from '@/src/features/services/services/maintenance';

interface LandlordMaintenanceItem {
  id: string;
  buildingName: string;
  roomCode: string;
  tenantName: string;
  tenantPhone: string;
  categoryLabel: string;
  title: string;
  description: string;
  preferredSlot: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  assignedTechnician?: { name: string; phone: string };
  rating?: number;
  isPaid?: boolean;
  comments?: { author: string; content: string; time: string; role: string }[];
  invoiceInfo?: {
    equipmentCost: number;
    laborCost: number;
    totalCost: number;
    costBearer: string;
    paymentMethod: string;
    details: string;
  };
}

const MOCK_MAINTENANCE_LIST: LandlordMaintenanceItem[] = [
  {
    id: 'REQ-001',
    buildingName: 'Số 3 ngõ 248 Yên Hoà',
    roomCode: 'P.501',
    tenantName: 'Nguyễn Văn A',
    tenantPhone: '0988123456',
    categoryLabel: 'Bảo trì khẩn',
    title: 'Bóng đèn hành lang bị cháy',
    description: 'Bóng đèn hành lang tầng 5 chập chập rồi tắt hẳn, nhờ BQL qua thay giúp.',
    preferredSlot: 'Sáng (08:00 - 12:00)',
    status: 'pending',
    createdAt: '30/07/2026 09:30',
  },
  {
    id: 'REQ-002',
    buildingName: 'Số 3 ngõ 248 Yên Hoà',
    roomCode: 'P.501',
    tenantName: 'Nguyễn Văn A',
    tenantPhone: '0988123456',
    categoryLabel: 'Điện nước',
    title: 'Vòi nước lavabo bị rò rỉ',
    description: 'Nước chảy nhỏ giọt ở chân vòi rửa mặt, cần thợ qua xiết lại ren.',
    preferredSlot: 'Chiều (13:30 - 17:30)',
    status: 'in_progress',
    createdAt: '29/07/2026 14:15',
    assignedTechnician: {
      name: 'Chú Tuấn (Thợ điện nước)',
      phone: '0912345678',
    },
  },
  {
    id: 'REQ-003',
    buildingName: 'Số 3 ngõ 248 Yên Hoà',
    roomCode: 'P.501',
    tenantName: 'Nguyễn Văn A',
    tenantPhone: '0988123456',
    categoryLabel: 'Gia dụng',
    title: 'Điều hòa không mát',
    description: 'Điều hòa phòng 501 chạy nhưng chỉ có gió, không lạnh.',
    preferredSlot: 'Tối (18:00 - 20:00)',
    status: 'completed',
    createdAt: '25/07/2026 10:00',
    assignedTechnician: {
      name: 'Anh Nam (Thợ điện lạnh)',
      phone: '0987654321',
    },
    rating: 5,
  },
];

const formatVNDInput = (val: string) => {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('vi-VN');
};

const parseVNDInput = (val: string) => {
  const digits = val.replace(/\D/g, '');
  return Number(digits) || 0;
};

export default function LandlordMaintenancePage() {
  const { company } = useAuth();
  const [items, setItems] = useState<LandlordMaintenanceItem[]>(MOCK_MAINTENANCE_LIST);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  // Modal phân công thợ
  const [assigningItem, setAssigningItem] = useState<LandlordMaintenanceItem | null>(null);
  const [techName, setTechName] = useState('');
  const [techPhone, setTechPhone] = useState('');

  // Modal chốt chi phí & hoàn tất
  const [completingItem, setCompletingItem] = useState<LandlordMaintenanceItem | null>(null);
  const [costBearer, setCostBearer] = useState<'tenant' | 'landlord' | 'shared'>('tenant');
  const [equipmentCost, setEquipmentCost] = useState<string>('0');
  const [laborCost, setLaborCost] = useState<string>('0');
  const [repairNotes, setRepairNotes] = useState<string>('Đã kiểm tra và bàn giao thiết bị hoạt động tốt.');
  const [paymentMethod, setPaymentMethod] = useState<string>('added_to_monthly_invoice');

  // State trao đổi / comment
  const [commentValues, setCommentValues] = useState<Record<string, string>>({});
  const [sendingComment, setSendingComment] = useState<string | null>(null);

  // Fetch từ cơ sở dữ liệu Supabase
  const fetchDbMaintenanceItems = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*, rooms(code, building_id, buildings(id, name, code, address)), maintenance_comments(*)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Lỗi tải danh sách bảo trì từ Supabase:', error);
        return;
      }

      if (data && data.length > 0) {
        // Lấy danh sách profiles để map thông tin người tạo
        const userIds = Array.from(new Set(data.map((d: any) => d.created_by).filter(Boolean)));
        let profileMap: Record<string, { full_name?: string; phone?: string }> = {};
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, phone')
            .in('id', userIds);

          if (profilesData) {
            profilesData.forEach((p: any) => {
              profileMap[p.id] = { full_name: p.full_name, phone: p.phone };
            });
          }
        }

        // Lấy thông tin hợp đồng để bổ sung phòng/tòa nhà nếu item.room_id bị thiếu
        const { data: contractsData } = await supabase
          .from('rental_contracts')
          .select('room_id, party_b_phone, party_b_name, rooms(code, building_id, buildings(id, name, code, address))');

        const realItems: LandlordMaintenanceItem[] = data.map((item: any) => {
          let itemStatus: 'pending' | 'in_progress' | 'completed' = 'pending';
          if (item.status === 'Đang xử lý' || item.status === 'in_progress') itemStatus = 'in_progress';
          else if (item.status === 'Hoàn tất' || item.status === 'completed') itemStatus = 'completed';

          const creator = profileMap[item.created_by] || {};
          let bName = item.rooms?.buildings?.name;
          let rCode = item.rooms?.code;

          // Nếu item không có thông tin room (do room_id null lúc tạo), tìm từ hợp đồng đang thuê của khách
          if (!bName || !rCode) {
            const matchedContract = contractsData?.find((c: any) => {
              if (creator.phone && c.party_b_phone && c.party_b_phone.includes(creator.phone.slice(-9))) return true;
              if (creator.full_name && c.party_b_name && c.party_b_name.toLowerCase().includes(creator.full_name.toLowerCase())) return true;
              return false;
            });
            if (matchedContract && matchedContract.rooms) {
              bName = (matchedContract.rooms as any).buildings?.name;
              rCode = (matchedContract.rooms as any).code;

              // Tự động backfill room_id vào DB để lần sau ghi nhận chuẩn
              if (matchedContract.room_id) {
                supabase
                  .from('maintenance_requests')
                  .update({ room_id: matchedContract.room_id })
                  .eq('id', item.id)
                  .then(() => {});
              }
            }
          }

          const buildingName = bName || 'RealHome Building';
          const roomCode = rCode ? `P.${rCode}` : 'P.501';

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

          // Kiểm tra xem khách đã thanh toán QR chưa
          const payComment = (item.maintenance_comments || [])
            .filter((c: any) => c.content && c.content.includes('[THANH_TOAN_VIETQR]:'))
            .slice(-1)[0];
          const isPaid = item.payment_status === 'paid' || item.payment_status === 'Đã thanh toán' || !!payComment;

          return {
            id: item.id,
            buildingName,
            roomCode,
            tenantName: creator.full_name || 'Khách thuê phòng',
            tenantPhone: creator.phone || 'Chưa cập nhật',
            categoryLabel: item.priority || 'Bảo trì khẩn',
            title: item.title,
            description: item.description || 'Yêu cầu hỗ trợ từ khách thuê.',
            preferredSlot: 'Trong ngày',
            status: itemStatus,
            createdAt: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : 'Mới gửi',
            assignedTechnician: assignedTech,
            invoiceInfo,
            isPaid,
            comments: (item.maintenance_comments || []).map((c: any) => ({
              author: c.sender_name,
              content: c.content,
              time: c.created_at ? new Date(c.created_at).toLocaleString('vi-VN', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
              }) : '',
              role: c.sender_role,
            })).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
          };
        });

        // Hiển thị 100% dữ liệu thực từ DB nếu có, chỉ fallback dùng Mock khi DB trống
        setItems(realItems.length > 0 ? realItems : MOCK_MAINTENANCE_LIST);
      } else {
        setItems(MOCK_MAINTENANCE_LIST);
      }
    } catch (err) {
      console.error('Lỗi khi fetch maintenance_requests:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  // Gửi bình luận từ phía Chủ nhà
  const handleSendComment = async (itemId: string) => {
    const content = commentValues[itemId];
    if (!content?.trim()) return;
    if (itemId.startsWith('REQ-')) {
      toast.error('Đây là dữ liệu mẫu, không thể gửi phản hồi.');
      return;
    }

    setSendingComment(itemId);
    const senderName = 'Lâm Chủ nhà (BQL)';

    const newComment = {
      author: senderName,
      content,
      time: new Date().toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      role: 'landlord',
    };

    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, comments: [...(item.comments || []), newComment] }
          : item
      )
    );
    setCommentValues((prev) => ({ ...prev, [itemId]: '' }));

    try {
      const { error } = await supabase.from('maintenance_comments').insert({
        request_id: itemId,
        sender_id: 'landlord-bql',
        sender_name: senderName,
        sender_role: 'landlord',
        content,
      });
      if (error) throw error;
      toast.success('Đã gửi phản hồi tới Khách thuê!');
    } catch (err) {
      console.error('Error sending comment from landlord:', err);
      toast.error('Không thể gửi phản hồi. Vui lòng thử lại!');
    } finally {
      setSendingComment(null);
    }
  };

  // Đăng ký nhận thông báo thay đổi dữ liệu Realtime từ Supabase + Đồng bộ ngầm không giật trang
  useEffect(() => {
    fetchDbMaintenanceItems();

    const triggerLandlordFeedback = () => {
      try {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([300, 100, 300, 100, 500]);
        }
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const playNote = (freq: number, startTime: number, duration: number) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.35, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + duration);
          };
          const now = ctx.currentTime;
          playNote(523.25, now, 0.2);       // C5
          playNote(659.25, now + 0.12, 0.2);  // E5
          playNote(783.99, now + 0.24, 0.4);  // G5
        }
      } catch (e) {}
    };

    const channel = supabase
      .channel('landlord_maintenance_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_requests' },
        (payload: any) => {
          fetchDbMaintenanceItems(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maintenance_comments' },
        (payload: any) => {
          fetchDbMaintenanceItems(true);
          if (payload?.new?.content && payload.new.content.includes('[THANH_TOAN_VIETQR]:')) {
            triggerLandlordFeedback();
            toast.success('🔔 [THANH TOÁN QR] Khách vừa chuyển khoản thanh toán bảo trì thành công!');
          }
        }
      )
      .subscribe();

    // Tự động quét cập nhật ngầm mỗi 4 giây (không hiện loading, không giật màn hình)
    const interval = setInterval(() => {
      fetchDbMaintenanceItems(true);
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchDbMaintenanceItems]);

  const stats = useMemo(() => {
    return {
      pending: items.filter((i) => i.status === 'pending').length,
      inProgress: items.filter((i) => i.status === 'in_progress').length,
      completed: items.filter((i) => i.status === 'completed').length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.roomCode.toLowerCase().includes(search.toLowerCase()) ||
        item.tenantName.toLowerCase().includes(search.toLowerCase()) ||
        item.buildingName.toLowerCase().includes(search.toLowerCase());

      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [items, search, statusFilter]);

  const handleOpenAssignModal = (item: LandlordMaintenanceItem) => {
    setAssigningItem(item);
    setTechName(item.assignedTechnician?.name || '');
    setTechPhone(item.assignedTechnician?.phone || '');
  };

  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningItem) return;
    if (!techName.trim() || !techPhone.trim()) {
      toast.error('Vui lòng nhập đầy đủ tên và SĐT thợ phân công.');
      return;
    }

    setItems((prev) =>
      prev.map((i) =>
        i.id === assigningItem.id
          ? {
              ...i,
              status: 'in_progress',
              assignedTechnician: { name: techName, phone: techPhone },
            }
          : i
      )
    );

    // Đồng bộ lên Supabase qua Admin API để đảm bảo luôn ghi nhận thành công
    if (!assigningItem.id.startsWith('REQ-')) {
      try {
        await fetch('/api/landlord/maintenance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: assigningItem.id,
            status: 'Đang xử lý',
            assigned_tech_name: techName,
            assigned_tech_phone: techPhone,
          }),
        });
      } catch (err) {
        console.error('Lỗi khi cập nhật trạng thái lên DB:', err);
      }
    }

    toast.success(`Đã phân công thợ ${techName} xử lý sự cố cho phòng ${assigningItem.roomCode}!`);
    setAssigningItem(null);
  };

  const handleOpenCompleteModal = (item: LandlordMaintenanceItem) => {
    setCompletingItem(item);
    setCostBearer('tenant');
    setEquipmentCost('');
    setLaborCost('');
    setRepairNotes('Đã thay thế thiết bị mới & kiểm tra vận hành tốt.');
    setPaymentMethod('added_to_monthly_invoice');
  };

  const handleSaveCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingItem) return;

    const eqNum = parseVNDInput(equipmentCost);
    const lbNum = parseVNDInput(laborCost);
    const totalNum = costBearer === 'landlord' ? 0 : eqNum + lbNum;

    const bearerLabel =
      costBearer === 'landlord' ? 'Chủ nhà / BQL chi trả 100%' :
      costBearer === 'tenant' ? 'Khách thuê chi trả' : 'Chia đôi 50/50';

    const methodLabel =
      paymentMethod === 'added_to_monthly_invoice' ? 'Cộng vào Hóa đơn Tiền nhà Tháng tới' :
      'Thanh toán trực tiếp';

    const invoiceContent = `🧾 [HOA_DON_SUA_CHUA]: Tiền đồ: ${eqNum.toLocaleString('vi-VN')}đ | Công thợ: ${lbNum.toLocaleString('vi-VN')}đ | Tổng: ${totalNum.toLocaleString('vi-VN')}đ | Bên trả: ${bearerLabel} | Hình thức: ${methodLabel} | Chi tiết: ${repairNotes || 'Đã nghiệm thu'}`;

    // Cập nhật state UI
    setItems((prev) =>
      prev.map((i) =>
        i.id === completingItem.id ? { ...i, status: 'completed' } : i
      )
    );

    if (!completingItem.id.startsWith('REQ-')) {
      try {
        await fetch('/api/landlord/maintenance', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: completingItem.id,
            status: 'Hoàn tất',
          }),
        });

        await supabase.from('maintenance_comments').insert({
          request_id: completingItem.id,
          sender_id: '00000000-0000-0000-0000-000000000000',
          sender_name: 'Ban Quản Lý',
          sender_role: 'landlord',
          content: invoiceContent,
        });
      } catch (err) {
        console.error('Lỗi khi chốt chi phí sửa chữa:', err);
      }
    }

    toast.success(`Đã nghiệm thu & xuất hóa đơn sửa chữa cho ${completingItem.roomCode}!`);

    // Tự động bật popup in PDF
    exportMaintenancePDF({
      id: completingItem.id,
      title: completingItem.title,
      roomCode: completingItem.roomCode,
      buildingName: completingItem.buildingName,
      createdAt: completingItem.createdAt,
      repairDetails: `📦 Tiền thiết bị / đồ thay: ${eqNum.toLocaleString('vi-VN')}đ\n🔧 Tiền công thợ sửa chữa: ${lbNum.toLocaleString('vi-VN')}đ\n📝 Chi tiết: ${repairNotes}`,
      costAmount: totalNum,
      costBearer: costBearer,
      tenantAmount: totalNum,
      paymentStatus: paymentMethod,
      tenantName: completingItem.tenantName,
      tenantPhone: completingItem.tenantPhone,
    });

    setCompletingItem(null);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="h-7 w-7 text-amber-500" />
            Quản Lý &amp; Tiếp Nhận Bảo Trì
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi danh sách báo hỏng thiết bị từ khách thuê, phân công kỹ thuật viên &amp; cập nhật tiến độ.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-amber-400/40 bg-amber-50/30 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Cần xử lý gấp (Mới)</span>
            <div className="text-3xl font-extrabold text-amber-600 font-mono mt-1">{stats.pending}</div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
        </Card>

        <Card className="border border-blue-400/40 bg-blue-50/30 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Đang phân thợ / Sửa</span>
            <div className="text-3xl font-extrabold text-blue-600 font-mono mt-1">{stats.inProgress}</div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-blue-500/20 text-blue-600 flex items-center justify-center">
            <Wrench className="h-6 w-6" />
          </div>
        </Card>

        <Card className="border border-emerald-400/40 bg-emerald-50/30 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Đã xong trong tháng</span>
            <div className="text-3xl font-extrabold text-emerald-600 font-mono mt-1">{stats.completed}</div>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-border-subtle shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Tìm theo phòng, tên khách, tiêu đề..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl border-slate-200"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tất cả ({items.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'pending' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Chờ xử lý ({stats.pending})
            </button>
            <button
              onClick={() => setStatusFilter('in_progress')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'in_progress' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Đang sửa ({stats.inProgress})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Đã xong ({stats.completed})
            </button>
          </div>
        </div>
      </div>

      {/* Table / List */}
      <div className="space-y-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="border border-border-subtle rounded-2xl bg-white shadow-sm overflow-hidden hover:border-amber-400/40 transition-all">
            <CardContent className="p-5 md:p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-mono font-bold shrink-0">
                    {item.roomCode.replace('P.', '')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm font-heading">{item.buildingName}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-semibold">
                        {item.roomCode}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-amber-700 mt-1 font-heading">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {item.status === 'pending' && (
                    <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 font-bold px-3 py-1 rounded-full text-xs">
                      ⏳ Chờ phân thợ
                    </Badge>
                  )}
                  {item.status === 'in_progress' && (
                    <Badge className="bg-blue-500/10 text-blue-700 border-blue-300 font-bold px-3 py-1 rounded-full text-xs">
                      🔧 Đang sửa chữa
                    </Badge>
                  )}
                  {item.status === 'completed' && (
                    <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold px-3 py-1 rounded-full text-xs">
                      ✅ Hoàn tất
                    </Badge>
                  )}
                  {item.isPaid && (
                    <Badge className="bg-emerald-600 text-white font-extrabold px-3 py-1 rounded-full text-xs shadow-sm">
                      💳 Khách đã thanh toán QR
                    </Badge>
                  )}

                  <div className="flex items-center gap-2">
                    {item.status !== 'completed' && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenAssignModal(item)}
                        className="rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold text-xs"
                      >
                        <UserCheck className="h-3.5 w-3.5 mr-1" />
                        {item.assignedTechnician ? 'Đổi thợ' : 'Phân công thợ'}
                      </Button>
                    )}

                    {item.status === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCompleteModal(item)}
                        className="rounded-xl border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-xs font-bold"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                        Xác nhận xong & Chốt phí
                      </Button>
                    )}

                    {item.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          exportMaintenancePDF({
                            id: item.id,
                            title: item.title,
                            roomCode: item.roomCode,
                            buildingName: item.buildingName,
                            createdAt: item.createdAt,
                            repairDetails: item.invoiceInfo
                              ? `📦 Tiền đồ: ${item.invoiceInfo.equipmentCost.toLocaleString('vi-VN')}đ\n🔧 Công thợ: ${item.invoiceInfo.laborCost.toLocaleString('vi-VN')}đ\n📝 Chi tiết: ${item.invoiceInfo.details}`
                              : 'Đã nghiệm thu và bảo trì thành công.',
                            costAmount: item.invoiceInfo?.totalCost || 0,
                            costBearer: item.invoiceInfo?.costBearer || 'Chủ nhà chi trả',
                            tenantAmount: item.invoiceInfo?.totalCost || 0,
                            tenantName: item.tenantName,
                            tenantPhone: item.tenantPhone,
                          })
                        }
                        className="rounded-xl border-amber-500 text-amber-800 hover:bg-amber-50 text-xs font-bold"
                      >
                        <Printer className="h-3.5 w-3.5 mr-1 text-amber-600" />
                        In Hóa Đơn PDF
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Chi tiết người gửi & nội dung */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-400 block uppercase text-[10px]">Người yêu cầu:</span>
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-slate-500" /> {item.tenantName}
                  </div>
                  <a href={`tel:${item.tenantPhone}`} className="text-amber-700 hover:underline font-mono font-bold flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {item.tenantPhone}
                  </a>
                  <div className="text-[11px] text-slate-400 pt-1 font-mono">Gửi lúc: {item.createdAt}</div>
                </div>

                <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-400 block uppercase text-[10px]">Mô tả sự cố &amp; Giờ hẹn:</span>
                  <p className="text-slate-800 font-medium leading-relaxed">{item.description}</p>
                  <div className="text-amber-700 font-bold mt-1">Khung giờ: {item.preferredSlot}</div>
                </div>

                <div className="space-y-1 bg-amber-50/50 p-3 rounded-xl border border-amber-200/50 flex flex-col justify-between">
                  <div>
                    <span className="font-semibold text-slate-400 block uppercase text-[10px]">Thợ đảm nhận:</span>
                    {item.assignedTechnician ? (
                      <div className="mt-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5 text-amber-600" /> {item.assignedTechnician.name}
                        </div>
                        <a href={`tel:${item.assignedTechnician.phone}`} className="text-amber-700 hover:underline font-mono font-bold text-xs mt-0.5 block">
                          📞 {item.assignedTechnician.phone}
                        </a>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Chưa phân công thợ</span>
                    )}
                  </div>

                  {item.rating && (
                    <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600">Đánh giá từ khách:</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${s <= item.rating! ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Khối Trao đổi / Bình luận có Mention */}
              <div className="border-t border-slate-100 pt-4 mt-3">
                <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5 font-heading">
                  <MessageSquare className="h-4 w-4 text-amber-500" />
                  Trao đổi với Khách thuê ({item.comments?.length || 0})
                </h4>

                {/* Danh sách bình luận */}
                <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
                  {(item.comments || []).length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-1">Chưa có lượt trao đổi nào.</p>
                  ) : (
                    item.comments?.map((comment, idx) => {
                      const receiptMatch = comment.content.match(/\[BIEN_LAI\]:\s*([^\s\n]+)/);
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl text-xs ${
                            comment.role === 'landlord' || comment.role === 'management'
                              ? 'bg-amber-50/70 border border-amber-200/70 ml-4'
                              : 'bg-slate-50 border border-slate-200/70 mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-900">{comment.author}</span>
                            <span className="text-[10px] text-slate-400">{comment.time}</span>
                          </div>
                          <MentionHighlightText text={comment.content} className="text-slate-700 leading-relaxed font-medium" />

                          {receiptMatch && (
                            <div className="mt-2 pt-2 border-t border-slate-200/60">
                              <span className="text-[10px] font-bold text-emerald-800 block mb-1">🖼️ Biên lai thanh toán chuyển khoản:</span>
                              <a href={receiptMatch[1]} target="_blank" rel="noopener noreferrer" className="inline-block group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={receiptMatch[1]}
                                  alt="Biên lai chuyển khoản"
                                  className="h-32 w-auto max-w-full rounded-lg border border-emerald-300 object-cover shadow-sm group-hover:scale-[1.02] transition-transform"
                                />
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Form nhập bình luận với Mention */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <MentionInput
                      value={commentValues[item.id] || ''}
                      onChange={(val) => setCommentValues((prev) => ({ ...prev, [item.id]: val }))}
                      placeholder="Trả lời khách... Gõ @ để gắn thẻ @KhachThue, @KyThuat..."
                      rows={2}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSendComment(item.id)}
                    disabled={!commentValues[item.id]?.trim() || sendingComment === item.id}
                    className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold h-10 px-4 shrink-0"
                  >
                    {sendingComment === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1.5" /> Phản hồi
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal Phân công thợ */}
      <Dialog open={assigningItem !== null} onOpenChange={(o) => !o && setAssigningItem(null)}>
        <DialogContent className="max-w-md rounded-2xl bg-white border border-border-subtle p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-heading text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-amber-500" />
              Phân Công Thợ Sửa Chữa ({assigningItem?.roomCode})
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveAssign} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Họ tên thợ / Kỹ thuật viên</Label>
              <Input
                placeholder="Ví dụ: Chú Tuấn (Kỹ thuật điện lạnh)"
                value={techName}
                onChange={(e) => setTechName(e.target.value)}
                required
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Số điện thoại thợ</Label>
              <Input
                placeholder="Ví dụ: 0988 123 456"
                value={techPhone}
                onChange={(e) => setTechPhone(e.target.value)}
                required
                className="rounded-xl border-slate-200 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="ghost" onClick={() => setAssigningItem(null)} className="rounded-xl">
                Hủy
              </Button>
              <Button type="submit" className="rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold">
                Xác nhận phân công
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Chốt Chi Phí & Nghiệm Thu */}
      <Dialog open={completingItem !== null} onOpenChange={(o) => !o && setCompletingItem(null)}>
        <DialogContent className="max-w-lg rounded-2xl bg-white border border-border-subtle p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-heading text-slate-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-amber-600" />
              Nghiệm Thu & Chốt Chi Phí ({completingItem?.roomCode})
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCompletion} className="space-y-4 text-xs mt-2">
            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
              <span className="font-bold text-slate-900 text-sm block">{completingItem?.title}</span>
              <span className="text-slate-500 block text-[11px] mt-0.5">Khách thuê: {completingItem?.tenantName} - {completingItem?.tenantPhone}</span>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 block mb-1">Phân định bên chịu chi phí *</Label>
              <select
                value={costBearer}
                onChange={(e: any) => setCostBearer(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="tenant">🔴 Khách thuê chi trả (Do hỏng đồ / đập phá)</option>
                <option value="landlord">🟢 Chủ nhà / BQL chi trả 100% (Miễn phí cho khách)</option>
                <option value="shared">🟡 Chia đôi chi phí (50/50)</option>
              </select>
            </div>

            {costBearer !== 'landlord' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    📦 1. Tiền đồ / Thiết bị thay (đ)
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={equipmentCost}
                      onChange={(e) => setEquipmentCost(formatVNDInput(e.target.value))}
                      placeholder="VD: 350.000"
                      className="h-10 rounded-xl font-mono font-bold pr-8 text-slate-900"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold font-mono">đ</span>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    🔧 2. Tiền công thợ sửa (đ)
                  </Label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={laborCost}
                      onChange={(e) => setLaborCost(formatVNDInput(e.target.value))}
                      placeholder="VD: 150.000"
                      className="h-10 rounded-xl font-mono font-bold pr-8 text-slate-900"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold font-mono">đ</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú vật tư &amp; Linh kiện thay thế</Label>
              <Input
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                placeholder="VD: Thay 1 chân ghế sofa inox + công thợ tháo lắp"
                className="h-10 rounded-xl"
              />
            </div>

            {costBearer !== 'landlord' && (
              <div>
                <Label className="text-xs font-bold text-slate-700 block mb-1">Phương thức thanh toán khoản phí này</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white font-medium text-xs focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="added_to_monthly_invoice">🧾 Cộng vào Hóa đơn Tiền nhà Tháng tới</option>
                  <option value="paid_direct">💵 Khách chuyển khoản / Trả tiền mặt ngay</option>
                </select>
              </div>
            )}

            <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between font-mono">
              <span className="text-xs font-semibold text-slate-300">TỔNG CỘNG HÓA ĐƠN:</span>
              <span className="text-base font-extrabold text-amber-400">
                {(costBearer === 'landlord' ? 0 : parseVNDInput(equipmentCost) + parseVNDInput(laborCost)).toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCompletingItem(null)} className="rounded-xl">
                Hủy
              </Button>
              <Button type="submit" className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                <CheckCircle2 className="h-4 w-4 mr-1" /> Xác Nhận Xong & In Hóa Đơn
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

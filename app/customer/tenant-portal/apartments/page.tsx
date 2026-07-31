'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Home, Car, PawPrint, Tv, Refrigerator, AirVent, WashingMachine,
  ChevronDown, ChevronUp, Send, Loader2, CheckCircle2, Clock,
  Edit, Wifi, Lightbulb, Microwave, Monitor, Heater, Wrench, Building2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface MaintenanceRequest {
  id: string;
  title: string;
  priority: string;
  status: string;
  createdAt: string;
}

interface ApartmentInfo {
  code: string;
  floor: number;
  area: string;
  bedrooms: number;
  bathrooms: number;
  address: string;
  buildingName: string;
  status: string;
  startDate: string;
  // Device flags from building
  hasAirCon: boolean;
  hasFridge: boolean;
  hasWasher: boolean;
  hasBed: boolean;
  hasWifi: boolean;
  hasWaterHeater: boolean;
}

const INITIAL_SHOW_COUNT = 4;

export default function ApartmentsPage() {
  const { user, profile } = useAuth();

  const [apartmentInfo, setApartmentInfo] = useState<ApartmentInfo | null>(null);
  const [loadingApartment, setLoadingApartment] = useState(true);

  const [showAllDevices, setShowAllDevices] = useState(false);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Form báo sự cố
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [issuePriority, setIssuePriority] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  // Fetch apartment info from DB
  useEffect(() => {
    if (!user) return;

    async function fetchApartmentInfo() {
      setLoadingApartment(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('bds_auth_token') : null;
        const res = await fetch('/api/customer/tenant-portal/contracts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const apiData = await res.json();
        const contracts = apiData.contracts || [];
        const contract = contracts?.[0];

        if (!contract || !contract.rooms) {
          setApartmentInfo(null);
          return;
        }

        const roomData = contract.rooms;
        const b = roomData.buildings as any;
        if (roomData.id) {
          setActiveRoomId(roomData.id);
        }
        setApartmentInfo({
          code: roomData.code,
          floor: roomData.floor,
          area: roomData.size ? `${roomData.size}m²` : 'N/A',
          bedrooms: roomData.bedrooms,
          bathrooms: roomData.bathrooms,
          address: `Tầng ${roomData.floor}, Phòng ${roomData.code}`,
          buildingName: b?.name || 'Tòa nhà',
          status: 'Đang thuê',
          startDate: contract.start_date ? new Date(contract.start_date).toLocaleDateString('vi-VN') : '',
          hasAirCon: b?.has_air_conditioner || false,
          hasFridge: b?.has_refrigerator || false,
          hasWasher: false, // from washing_machine_type field
          hasBed: b?.has_bed || false,
          hasWifi: true, // Internet included by default
          hasWaterHeater: b?.has_water_heater || false,
        });
      } catch (err) {
        console.error('Error fetching apartment info:', err);
        setApartmentInfo(null);
      } finally {
        setLoadingApartment(false);
      }
    }

    fetchApartmentInfo();
  }, [user, profile]);

  // Fetch open maintenance requests for this user
  useEffect(() => {
    if (!user) return;

    async function fetchRequests() {
      setLoadingRequests(true);
      try {
        const { data, error } = await supabase
          .from('maintenance_requests')
          .select('id, title, priority, status, created_at')
          .eq('created_by', user!.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        setRequests((data || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          priority: r.priority,
          status: r.status,
          createdAt: new Date(r.created_at).toLocaleDateString('vi-VN'),
        })));
      } catch (err) {
        console.error('Error fetching requests:', err);
        setRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    }

    fetchRequests();
  }, [user]);

  // Build device list from apartment info
  const allDevices = apartmentInfo ? [
    apartmentInfo.hasAirCon && { id: 'ac', name: 'Điều hòa không khí', icon: AirVent },
    apartmentInfo.hasFridge && { id: 'fridge', name: 'Tủ lạnh', icon: Refrigerator },
    apartmentInfo.hasWasher && { id: 'washer', name: 'Máy giặt', icon: WashingMachine },
    apartmentInfo.hasBed && { id: 'bed', name: 'Giường ngủ', icon: Monitor },
    apartmentInfo.hasWifi && { id: 'wifi', name: 'Wifi Router', icon: Wifi },
    apartmentInfo.hasWaterHeater && { id: 'heater', name: 'Bình nóng lạnh', icon: Heater },
    { id: 'tv', name: 'Bảng điện', icon: Tv },
    { id: 'light', name: 'Đèn LED', icon: Lightbulb },
  ].filter(Boolean) as { id: string; name: string; icon: any }[] : [];

  const visibleDevices = showAllDevices ? allDevices : allDevices.slice(0, INITIAL_SHOW_COUNT);
  const hiddenCount = allDevices.length - INITIAL_SHOW_COUNT;

  // Double-Submit Guard & Optimistic UI
  const handleSubmitIssue = useCallback(async () => {
    if (!issueTitle.trim() || !issuePriority) {
      toast.error('Vui lòng nhập tiêu đề và chọn mức độ ưu tiên');
      return;
    }
    if (!user) return;

    setIsSubmitting(true);

    const optimisticRequest: MaintenanceRequest = {
      id: `temp-${Date.now()}`,
      title: issueTitle,
      priority: issuePriority,
      status: 'Đang tiếp nhận',
      createdAt: new Date().toLocaleDateString('vi-VN'),
    };
    setRequests((prev) => [optimisticRequest, ...prev]);

    try {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .insert({
          created_by: user.id,
          room_id: activeRoomId,
          title: issueTitle,
          description: issueDescription,
          priority: issuePriority,
          status: 'Đang tiếp nhận',
        })
        .select()
        .single();

      if (error) throw error;

      setRequests((prev) =>
        prev.map((r) => r.id === optimisticRequest.id ? { ...r, id: data.id } : r)
      );
      setIssueTitle('');
      setIssueDescription('');
      setIssuePriority('');
      toast.success('Yêu cầu sự cố đã được gửi thành công tới Ban Quản Lý!');
    } catch (err) {
      setRequests((prev) => prev.filter((r) => r.id !== optimisticRequest.id));
      toast.error('Không thể gửi yêu cầu. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  }, [issueTitle, issueDescription, issuePriority, user]);

  return (
    <div className="space-y-5 sm:space-y-6 w-full max-w-full min-w-0">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-ink font-heading flex items-center gap-2">
          <Home className="h-7 w-7 text-amber-500" />
          Căn hộ của tôi
        </h1>
        <p className="text-sm text-ink-muted mt-1">Quản lý thông tin căn hộ, thiết bị và báo cáo sự cố</p>
      </div>

      {/* Thông tin Căn hộ */}
      <Card className="border border-border-subtle">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink font-heading flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-600" />
              {loadingApartment ? 'Đang tải thông tin căn hộ...' : apartmentInfo ? `Phòng ${apartmentInfo.code}` : 'Căn hộ của tôi'}
            </h2>
            {apartmentInfo && (
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs">
                {apartmentInfo.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {loadingApartment ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
              <span className="text-sm text-ink-muted">Đang kết nối dữ liệu căn hộ...</span>
            </div>
          ) : !apartmentInfo ? (
            <div className="py-8 text-center">
              <Home className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-ink">Không tìm thấy thông tin căn hộ</p>
              <p className="text-xs text-ink-muted mt-1">Vui lòng liên hệ Ban Quản Lý để được hỗ trợ.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 rounded-xl bg-bg-subtle border border-border-subtle">
                  <p className="text-[10px] text-ink-muted uppercase font-bold">Tòa nhà</p>
                  <p className="font-semibold text-ink mt-0.5">{apartmentInfo.buildingName}</p>
                </div>
                <div className="p-3 rounded-xl bg-bg-subtle border border-border-subtle">
                  <p className="text-[10px] text-ink-muted uppercase font-bold">Vị trí</p>
                  <p className="font-semibold text-ink mt-0.5">{apartmentInfo.address}</p>
                </div>
                <div className="p-3 rounded-xl bg-bg-subtle border border-border-subtle">
                  <p className="text-[10px] text-ink-muted uppercase font-bold">Diện tích</p>
                  <p className="font-semibold text-ink mt-0.5">{apartmentInfo.area}</p>
                </div>
                <div className="p-3 rounded-xl bg-bg-subtle border border-border-subtle">
                  <p className="text-[10px] text-ink-muted uppercase font-bold">Phòng ngủ</p>
                  <p className="font-semibold text-ink mt-0.5">{apartmentInfo.bedrooms} phòng</p>
                </div>
                <div className="p-3 rounded-xl bg-bg-subtle border border-border-subtle">
                  <p className="text-[10px] text-ink-muted uppercase font-bold">Ngày bắt đầu thuê</p>
                  <p className="font-semibold text-ink mt-0.5">{apartmentInfo.startDate}</p>
                </div>
                <div className="p-3 rounded-xl bg-bg-subtle border border-border-subtle">
                  <p className="text-[10px] text-ink-muted uppercase font-bold">Phòng tắm</p>
                  <p className="font-semibold text-ink mt-0.5">{apartmentInfo.bathrooms}</p>
                </div>
              </div>

              {/* Nút Yêu cầu Cập nhật Thông tin */}
              <div className="mt-4 pt-4 border-t border-border-subtle">
                <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto rounded-xl border-amber-500/80 text-amber-950 dark:text-amber-100 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 font-extrabold shadow-sm">
                      <Edit className="h-4 w-4 mr-2 text-amber-700 dark:text-amber-400" />
                      Yêu cầu Cập nhật Thông tin Căn hộ
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-ink font-heading">Xác nhận Yêu cầu Cập nhật</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>Bạn muốn yêu cầu Ban Quản Lý cập nhật thông tin căn hộ <strong>{apartmentInfo.code}</strong>?</p>
                        <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-950/50 border border-amber-300 text-sm text-amber-950 dark:text-amber-100 font-medium">
                          <p className="font-bold mb-1">Các thông tin có thể cập nhật:</p>
                          <ul className="list-disc list-inside text-xs space-y-0.5">
                            <li>Diện tích thực tế căn hộ</li>
                            <li>Số phòng ngủ / phòng tắm</li>
                            <li>Danh sách thiết bị nội thất</li>
                          </ul>
                        </div>
                        <p className="text-xs text-ink-muted">Yêu cầu sẽ được gửi tới BQL và xử lý trong vòng 24h.</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                        onClick={() => toast.success('Đã gửi yêu cầu cập nhật thông tin căn hộ!')}
                      >
                        Xác nhận gửi yêu cầu
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Danh sách Thiết bị */}
      {!loadingApartment && allDevices.length > 0 && (
        <Card className="border border-border-subtle">
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <Tv className="h-5 w-5 text-amber-600" />
            <h2 className="text-base font-bold text-ink font-heading">Thiết bị nội thất căn hộ</h2>
            <Badge variant="outline" className="ml-auto text-xs">{allDevices.length} thiết bị</Badge>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleDevices.map((device) => {
                const Icon = device.icon;
                return (
                  <div key={device.id} className="flex items-center gap-3 p-3 rounded-xl bg-bg-subtle border border-border-subtle">
                    <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{device.name}</p>
                      <p className="text-[10px] text-emerald-600 font-medium">✓ Hoạt động tốt</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {hiddenCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full border-amber-400/80 text-amber-950 dark:text-amber-100 bg-amber-50/70 dark:bg-amber-950/40 hover:bg-amber-100 font-bold text-xs shadow-sm"
                onClick={() => setShowAllDevices(!showAllDevices)}
              >
                {showAllDevices ? (
                  <><ChevronUp className="h-4 w-4 mr-1 text-amber-700" /> Thu gọn</>
                ) : (
                  <><ChevronDown className="h-4 w-4 mr-1 text-amber-700" /> Xem thêm {hiddenCount} thiết bị</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form Báo sự cố */}
      <Card className="border border-border-subtle">
        <CardHeader className="pb-2">
          <h2 className="text-lg font-bold text-ink font-heading flex items-center gap-2">
            <Wrench className="h-5 w-5 text-red-500" />
            Báo sự cố mới
          </h2>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-ink-muted mb-1.5 block">Tiêu đề sự cố *</label>
              <Input
                placeholder="VD: Vòi nước bồn rửa bị rỉ"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                disabled={isSubmitting}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-muted mb-1.5 block">Mức độ ưu tiên *</label>
              <Select value={issuePriority} onValueChange={setIssuePriority} disabled={isSubmitting}>
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
            <label className="text-xs font-bold text-ink-muted mb-1.5 block">Mô tả chi tiết</label>
            <textarea
              placeholder="Mô tả chi tiết sự cố..."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="w-full rounded-xl border border-border-subtle bg-bg-subtle px-4 py-3 text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 resize-none"
            />
          </div>
          <Button
            onClick={handleSubmitIssue}
            disabled={isSubmitting}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang gửi...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />Gửi yêu cầu sự cố</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Lịch sử yêu cầu sự cố */}
      <Card className="border border-border-subtle">
        <CardHeader className="pb-2">
          <h2 className="text-base font-bold text-ink font-heading">Lịch sử yêu cầu sự cố</h2>
        </CardHeader>
        <CardContent className="pt-2 space-y-2">
          {loadingRequests && (
            <div className="flex items-center justify-center py-6 gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              <span className="text-xs text-ink-muted">Đang tải...</span>
            </div>
          )}
          {!loadingRequests && requests.length === 0 && (
            <p className="text-xs text-ink-muted text-center py-4">Chưa có yêu cầu sự cố nào.</p>
          )}
          {requests.map((req) => (
            <div
              key={req.id}
              className={`flex items-center justify-between p-3 rounded-xl bg-bg-subtle border border-border-subtle transition-all duration-300 ${
                req.id.startsWith('temp-') ? 'animate-pulse border-amber-300 bg-amber-50/30 dark:bg-amber-950/20' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  req.status.includes('Đang tiếp nhận') ? 'bg-amber-500/10' :
                  req.status.includes('Đang xử lý') ? 'bg-blue-500/10' : 'bg-emerald-500/10'
                }`}>
                  {req.status.includes('Đang tiếp nhận') ? <Clock className="h-4 w-4 text-amber-600" /> :
                   req.status.includes('Đang xử lý') ? <Loader2 className="h-4 w-4 text-blue-600" /> :
                   <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{req.title}</p>
                  <p className="text-[10px] text-ink-muted">{req.createdAt}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] font-bold ${
                  req.priority === 'Khẩn cấp' ? 'text-red-600 border-red-300 bg-red-50' :
                  req.priority === 'Cao' ? 'text-orange-600 border-orange-300 bg-orange-50' :
                  req.priority === 'Bình thường' ? 'text-yellow-700 border-yellow-300 bg-yellow-50' :
                  'text-emerald-600 border-emerald-300 bg-emerald-50'
                }`}>
                  {req.priority}
                </Badge>
                <Badge className={`text-[10px] font-bold ${
                  req.status.includes('Đang tiếp nhận') ? 'bg-amber-100 text-amber-900 border-amber-300' :
                  req.status.includes('Đang xử lý') ? 'bg-blue-100 text-blue-900 border-blue-300' :
                  'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {req.status}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
